import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageParams, paginate, searchFilter, textOrNull } from '../../common/utils/index.util';
import { toPublicUrl, uploadRoot } from './media.storage';
import { MediaQueryDto, UpdateMediaDto } from './dto/media.dto';

/** 需要参与「图片是否被引用」扫描的标量字段 */
const SCALAR_REFS: { delegate: string; fields: string[] }[] = [
  { delegate: 'product', fields: ['image'] },
  { delegate: 'news', fields: ['cover'] },
  { delegate: 'video', fields: ['poster'] },
  { delegate: 'review', fields: ['avatar'] },
  { delegate: 'honor', fields: ['image'] },
  { delegate: 'term', fields: ['image'] },
  { delegate: 'page', fields: ['heroImage'] },
  { delegate: 'theme', fields: ['preview'] },
];

/** Json 列内的引用靠内存扫描（SQLite/MySQL 不支持稳定的 JSON 路径查询） */
const JSON_REFS: { delegate: string; field: string }[] = [
  { delegate: 'product', field: 'images' },
  { delegate: 'block', field: 'props' },
  { delegate: 'setting', field: 'value' },
];

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MediaQueryDto) {
    const { page, pageSize } = pageParams(query);
    const where: any = {};
    if (query.folder) where.folder = query.folder;
    if (query.type === 'image') where.mime = { startsWith: 'image/' };
    if (query.type === 'video') where.mime = { startsWith: 'video/' };
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['name', 'url', 'alt'], kw);

    const [list, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return paginate(list.map(serialize), total, page, pageSize);
  }

  async folders() {
    const rows = await this.prisma.mediaAsset.findMany({ select: { folder: true }, orderBy: { folder: 'asc' } });
    return Array.from(new Set(rows.map((r) => r.folder).filter(Boolean))) as string[];
  }

  async detail(id: string) {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('素材不存在');
    return { ...serialize(row), references: await this.countReferences(row.url) };
  }

  /** 上传落库：url 唯一，重复登记时只刷新尺寸等元信息 */
  async register(file: { path: string; originalname: string; mimetype: string; size: number }, alt?: string) {
    const url = toPublicUrl(file.path);
    const folder = url.split('/').slice(0, -1).join('/');
    const name = decodeURIComponent(file.originalname);
    const data = {
      url,
      name,
      mime: file.mimetype,
      size: file.size,
      alt: textOrNull(alt),
      folder,
    };
    const row = await this.prisma.mediaAsset.upsert({
      where: { url },
      update: { ...data, url: undefined },
      create: data,
    });
    return serialize(row);
  }

  async update(id: string, dto: UpdateMediaDto) {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('素材不存在');
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        alt: dto.alt === undefined ? undefined : textOrNull(dto.alt),
        folder: dto.folder === undefined ? undefined : textOrNull(dto.folder),
      },
    });
    return serialize(updated);
  }

  /**
   * 删除前引用检查：被内容引用时拒绝；仅 /uploads 前缀的物理文件才尝试删除，
   * apps/app/public/images 下的历史图片由前台静态目录提供，只解除登记。
   */
  async remove(id: string, force = false) {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('素材不存在');
    const references = await this.countReferences(row.url);
    if (references && !force) throw new BadRequestException(`该素材被 ${references} 处内容引用，无法删除`);

    if (row.url.startsWith('/uploads/')) {
      const abs = join(resolve(uploadRoot()), row.url.replace(/^\/uploads\//, ''));
      try {
        await unlink(abs);
      } catch {
        // 物理文件缺失不影响登记解除
      }
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    return { ok: true, references };
  }

  /** 统计某个 url 在内容里的引用次数，同时回写 usedBy */
  async countReferences(url: string): Promise<number> {
    if (!url) return 0;
    let count = 0;

    for (const ref of SCALAR_REFS) {
      const delegate = (this.prisma as any)[ref.delegate];
      if (!delegate) continue;
      const where = { OR: ref.fields.map((f) => ({ [f]: url })) };
      count += await delegate.count({ where });
      // 产品图也可能是多图数组，统一交给下面的内存扫描
    }

    count += await this.scanJsonRefs(url);

    if (count) await this.prisma.mediaAsset.updateMany({ where: { url }, data: { usedBy: count } });
    return count;
  }

  private async scanJsonRefs(url: string): Promise<number> {
    let count = 0;
    for (const ref of JSON_REFS) {
      const delegate = (this.prisma as any)[ref.delegate];
      if (!delegate) continue;
      const rows = await delegate.findMany({ select: { id: true, [ref.field]: true } });
      for (const row of rows) {
        const haystack = JSON.stringify(row[ref.field] ?? null);
        if (haystack.includes(url)) count += 1;
      }
    }
    return count;
  }

  /** 供 seed 与前台校验：url 是否已登记 */
  async registeredUrls(): Promise<string[]> {
    const rows = await this.prisma.mediaAsset.findMany({ select: { url: true } });
    return rows.map((r) => r.url);
  }
}

function serialize(row: any) {
  return { ...row, createdAt: row.createdAt?.toISOString?.() ?? row.createdAt };
}
