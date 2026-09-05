import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageParams, paginate, searchFilter, textOrNull, normalizeCode } from '../../common/utils/index.util';
import { readJsonObject } from '../../common/utils/json.util';
import { sanitizeRichHtml } from '../../common/utils/html.util';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { LocaleService } from '../site/locale.service';
import { BlockAssembler } from './block-assembler.service';
import { assertBlockType } from './block.schema';
import { normalizeBlockProps, normalizeEntityQuery } from './block.util';
import {
  BlockQueryDto,
  CreateBlockDto,
  CreatePageDto,
  CreateSectionDto,
  SavePageTreeDto,
  UpdateBlockDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/page.dto';

const PAGE_FIELDS = [
  'name', 'path', 'heroTitle', 'heroSubtitle', 'heroEn', 'heroImage',
  'seoTitle', 'seoKeywords', 'seoDescription',
] as const;

@Injectable()
export class PageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assembler: BlockAssembler,
    private readonly locales: LocaleService,
  ) {}

  // ==================== Page ====================

  async list(query: PageQueryDto) {
    const { page, pageSize } = pageParams(query);
    const where: any = {};
    if (query.status !== undefined) where.status = query.status;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['key', 'name', 'path'], kw);

    const [rows, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ key: 'asc' }],
        include: { _count: { select: { sections: true } } },
      }),
      this.prisma.page.count({ where }),
    ]);

    return paginate(
      rows.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        path: r.path,
        heroTitle: r.heroTitle,
        status: r.status,
        sectionCount: r._count.sections,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  /** 后台编辑用：完整 Page -> Section -> Block，props 原样返回 */
  async detail(id: string) {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { blocks: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!page) throw new NotFoundException('页面不存在');
    return {
      ...page,
      body: page.body,
      sections: page.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map(serializeBlock),
        createdAt: section.createdAt.toISOString(),
        updatedAt: section.updatedAt.toISOString(),
      })),
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  async findById(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('页面不存在');
    return page;
  }

  async create(dto: CreatePageDto) {
    const key = normalizeCode(dto.key);
    if (!key) throw new BadRequestException('页面标识不合法');
    const hit = await this.prisma.page.findUnique({ where: { key } });
    if (hit) throw new ConflictException(`页面 ${key} 已存在`);

    const created = await this.prisma.page.create({
      data: {
        key,
        name: dto.name.trim(),
        path: ensurePath(dto.path),
        heroTitle: textOrNull(dto.heroTitle),
        heroSubtitle: textOrNull(dto.heroSubtitle),
        heroEn: textOrNull(dto.heroEn),
        heroImage: textOrNull(dto.heroImage),
        body: sanitizeRichHtml(dto.body),
        status: dto.status ?? 0,
        seoTitle: textOrNull(dto.seoTitle),
        seoKeywords: textOrNull(dto.seoKeywords),
        seoDescription: textOrNull(dto.seoDescription),
      },
    });
    return this.detail(created.id);
  }

  async update(id: string, dto: UpdatePageDto) {
    await this.findById(id);
    await this.prisma.page.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        path: dto.path === undefined ? undefined : ensurePath(dto.path),
        heroTitle: dto.heroTitle === undefined ? undefined : textOrNull(dto.heroTitle),
        heroSubtitle: dto.heroSubtitle === undefined ? undefined : textOrNull(dto.heroSubtitle),
        heroEn: dto.heroEn === undefined ? undefined : textOrNull(dto.heroEn),
        heroImage: dto.heroImage === undefined ? undefined : textOrNull(dto.heroImage),
        body: dto.body === undefined ? undefined : sanitizeRichHtml(dto.body),
        status: dto.status,
        seoTitle: dto.seoTitle === undefined ? undefined : textOrNull(dto.seoTitle),
        seoKeywords: dto.seoKeywords === undefined ? undefined : textOrNull(dto.seoKeywords),
        seoDescription: dto.seoDescription === undefined ? undefined : textOrNull(dto.seoDescription),
      },
    });
    return this.detail(id);
  }

  async setStatus(id: string, status: number) {
    await this.findById(id);
    await this.prisma.page.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  async remove(id: string) {
    await this.findById(id);
    // Section / Block 由 onDelete: Cascade 一并清除
    await this.prisma.page.delete({ where: { id } });
    return { ok: true };
  }

  // ==================== Section ====================

  async createSection(pageId: string, dto: CreateSectionDto) {
    await this.findById(pageId);
    const anchor = normalizeCode(dto.anchor);
    if (!anchor) throw new BadRequestException('锚点不合法');
    const hit = await this.prisma.section.findUnique({
      where: { pageId_anchor: { pageId, anchor } },
    });
    if (hit) throw new ConflictException(`锚点 ${anchor} 在本页已存在`);

    const created = await this.prisma.section.create({
      data: {
        pageId,
        anchor,
        label: dto.label.trim(),
        eyebrow: textOrNull(dto.eyebrow),
        title: textOrNull(dto.title),
        subtitle: textOrNull(dto.subtitle),
        variant: textOrNull(dto.variant),
        showInSubNav: dto.showInSubNav ?? true,
        sortOrder: dto.sortOrder ?? (await this.nextSectionOrder(pageId)),
        status: dto.status ?? 1,
      },
    });
    return created;
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    await this.assertSection(id);
    return this.prisma.section.update({
      where: { id },
      data: {
        anchor: dto.anchor === undefined ? undefined : normalizeCode(dto.anchor),
        label: dto.label?.trim(),
        eyebrow: dto.eyebrow === undefined ? undefined : textOrNull(dto.eyebrow),
        title: dto.title === undefined ? undefined : textOrNull(dto.title),
        subtitle: dto.subtitle === undefined ? undefined : textOrNull(dto.subtitle),
        variant: dto.variant === undefined ? undefined : textOrNull(dto.variant),
        showInSubNav: dto.showInSubNav,
        sortOrder: dto.sortOrder,
        status: dto.status,
      },
    });
  }

  async removeSection(id: string) {
    await this.assertSection(id);
    await this.prisma.section.delete({ where: { id } });
    return { ok: true };
  }

  async resortSections(pageId: string, ids: string[]) {
    await this.findById(pageId);
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.section.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } }).catch(() => null),
      ),
    );
    return { ok: true };
  }

  // ==================== Block ====================

  async listBlocks(query: BlockQueryDto) {
    const { page, pageSize } = pageParams(query);
    const where: any = {};
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.type) where.type = query.type;
    if (query.status !== undefined) where.status = query.status;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['code', 'title', 'source'], kw);

    const [rows, total] = await Promise.all([
      this.prisma.block.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { sortOrder: 'asc' } }),
      this.prisma.block.count({ where }),
    ]);
    return paginate(rows.map(serializeBlock), total, page, pageSize);
  }

  async createBlock(sectionId: string, dto: CreateBlockDto) {
    const section = await this.assertSection(sectionId);
    const code = normalizeCode(dto.code);
    if (!code) throw new BadRequestException('区块编码不合法');
    const hit = await this.prisma.block.findUnique({ where: { sectionId_code: { sectionId, code } } });
    if (hit) throw new ConflictException(`本区块内编码 ${code} 已存在`);

    const def = assertBlockType(dto.type);
    const data: any = {
      sectionId,
      code,
      type: def.type,
      title: textOrNull(dto.title),
      props: def.entityDriven ? (dto.props ? normalizeBlockProps(def.type, dto.props) : {}) : normalizeBlockProps(def.type, dto.props ?? {}),
      columns: dto.columns ?? null,
      theme: dto.theme ? readJsonObject(dto.theme, {}) : null,
      sortOrder: dto.sortOrder ?? (await this.nextBlockOrder(sectionId)),
      status: dto.status ?? 1,
    };
    if (def.entityDriven) {
      data.source = textOrNull(dto.source);
      data.query = normalizeEntityQuery(data.source, dto.query);
    }

    const created = await this.prisma.block.create({ data });
    return { ...serializeBlock(created), sectionAnchor: section.anchor };
  }

  async updateBlock(id: string, dto: UpdateBlockDto) {
    const current = await this.assertBlock(id);
    const type = dto.type ?? current.type;
    const def = assertBlockType(type);

    const data: any = {
      code: dto.code === undefined ? undefined : normalizeCode(dto.code),
      type: def.type,
      title: dto.title === undefined ? undefined : textOrNull(dto.title),
      columns: dto.columns === undefined ? undefined : dto.columns ?? null,
      theme: dto.theme === undefined ? undefined : dto.theme ? readJsonObject(dto.theme, {}) : null,
      sortOrder: dto.sortOrder,
      status: dto.status,
    };

    if (dto.props !== undefined) {
      data.props = def.entityDriven && Object.keys(dto.props ?? {}).length === 0 ? {} : normalizeBlockProps(def.type, dto.props);
    }
    if (def.entityDriven && (dto.source !== undefined || dto.query !== undefined)) {
      const source = dto.source === undefined ? current.source : textOrNull(dto.source);
      data.source = source;
      data.query = normalizeEntityQuery(source, dto.query === undefined ? current.query : dto.query);
    } else if (!def.entityDriven) {
      data.source = null;
      data.query = null;
    }

    const saved = await this.prisma.block.update({ where: { id }, data });
    return serializeBlock(saved);
  }

  async removeBlock(id: string) {
    await this.assertBlock(id);
    await this.prisma.block.delete({ where: { id } });
    return { ok: true };
  }

  async resortBlocks(sectionId: string, ids: string[]) {
    await this.assertSection(sectionId);
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.block.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } }).catch(() => null),
      ),
    );
    return { ok: true };
  }

  /** 区块跨区块移动（拖拽到另一个 Section） */
  async moveBlock(id: string, sectionId: string) {
    await this.assertBlock(id);
    await this.assertSection(sectionId);
    const moved = await this.prisma.block.update({ where: { id }, data: { sectionId, sortOrder: await this.nextBlockOrder(sectionId) } });
    return serializeBlock(moved);
  }

  // ==================== 整页保存 ====================

  /**
   * 设计器「保存全部」：按 anchor / code 做 upsert，未出现在提交里的记录删除。
   * 这样既能整体保存复杂嵌套结构，又不会像「先清空再插入」那样丢掉 createdAt。
   */
  async saveTree(id: string, dto: SavePageTreeDto) {
    const page = await this.findById(id);

    if (dto.page) {
      await this.prisma.page.update({
        where: { id },
        data: pickPageFields(dto.page),
      });
    }

    if (!dto.sections) return this.detail(id);

    const existingSections = await this.prisma.section.findMany({
      where: { pageId: id },
      include: { blocks: { select: { id: true, code: true } } },
    });
    // 键统一用 normalizeCode 的结果：设计器提交的锚点会被归一化，直接按原值匹配会误判成新组
    const sectionByKey = new Map<string, { id: string; anchor: string; blocks: { id: string; code: string }[] }>(
      existingSections.map((s) => [
        normalizeCode(s.anchor),
        { id: s.id, anchor: s.anchor, blocks: s.blocks },
      ] as [string, { id: string; anchor: string; blocks: { id: string; code: string }[] }]),
    );
    const keepSectionIds = new Set<string>();

    let index = 0;
    for (const raw of dto.sections) {
      index += 1;
      const anchor = normalizeCode(String(raw?.anchor ?? ''));
      if (!anchor) throw new BadRequestException(`第 ${index} 个区块组缺少锚点`);
      const known = sectionByKey.get(anchor);

      const sectionData = {
        anchor,
        label: textOrNull(raw?.label) ?? anchor,
        eyebrow: textOrNull(raw?.eyebrow),
        title: textOrNull(raw?.title),
        subtitle: textOrNull(raw?.subtitle),
        variant: textOrNull(raw?.variant),
        showInSubNav: raw?.showInSubNav !== false,
        sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : index * 10,
        status: Number.isFinite(Number(raw?.status)) ? Number(raw.status) : 1,
      };

      const section = known
        ? await this.prisma.section.update({ where: { id: known.id }, data: withoutKey(sectionData, 'anchor') })
        : await this.prisma.section.create({ data: { pageId: id, ...sectionData } });
      keepSectionIds.add(section.id);

      const blocks = Array.isArray(raw?.blocks) ? raw.blocks : [];
      const blockByCode = new Map<string, { id: string; code: string }>(
        (known?.blocks ?? []).map((b) => [normalizeCode(b.code), b] as [string, { id: string; code: string }]),
      );
      const keepBlockIds = new Set<string>();
      let bIndex = 0;

      for (const rawBlock of blocks) {
        bIndex += 1;
        const code = normalizeCode(String(rawBlock?.code ?? ''));
        if (!code) throw new BadRequestException(`区块组 ${anchor} 的第 ${bIndex} 个区块缺少编码`);
        const type = assertBlockType(String(rawBlock?.type ?? '')).type;
        const def = assertBlockType(type);
        const isEntity = def.entityDriven;
        const source = textOrNull(rawBlock?.source);

        const blockData = {
          sectionId: section.id,
          code,
          type,
          title: textOrNull(rawBlock?.title),
          props: normalizeBlockProps(type, rawBlock?.props ?? {}),
          source: isEntity ? source : null,
          query: isEntity ? normalizeEntityQuery(source, rawBlock?.query) : null,
          columns: Number.isFinite(Number(rawBlock?.columns)) && Number(rawBlock.columns) > 0 ? Number(rawBlock.columns) : null,
          theme: rawBlock?.theme ? readJsonObject(rawBlock.theme, {}) : null,
          sortOrder: Number.isFinite(Number(rawBlock?.sortOrder)) ? Number(rawBlock.sortOrder) : bIndex * 10,
          status: Number.isFinite(Number(rawBlock?.status)) ? Number(rawBlock.status) : 1,
        };

        const knownBlock = blockByCode.get(code);
        if (knownBlock) {
          keepBlockIds.add(knownBlock.id);
          await this.prisma.block.update({ where: { id: knownBlock.id }, data: withoutKey(blockData, 'code') });
        } else {
          const created = await this.prisma.block.create({ data: blockData });
          keepBlockIds.add(created.id);
        }
      }

      const staleBlocks = (known?.blocks ?? []).filter((b) => !keepBlockIds.has(b.id)).map((b) => b.id);
      if (staleBlocks.length) await this.prisma.block.deleteMany({ where: { id: { in: staleBlocks } } });
    }

    const staleSections = existingSections.filter((s) => !keepSectionIds.has(s.id)).map((s) => s.id);
    if (staleSections.length) await this.prisma.section.deleteMany({ where: { id: { in: staleSections } } });

    return this.detail(page.id);
  }

  // ==================== 前台 ====================

  /**
   * 前台取页：只保留 status=1 的 Section / Block，并解析 entity_list、合并译文。
   * subNav 由 showInSubNav 的 Section 汇总，替代原先硬编码在页面里的 subNav 数组。
   */
  async assemble(key: string, lang?: string) {
    const page = await this.prisma.page.findUnique({
      where: { key },
      include: {
        sections: {
          where: { status: 1 },
          orderBy: { sortOrder: 'asc' },
          include: { blocks: { where: { status: 1 }, orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!page) throw new NotFoundException(`页面 ${key} 不存在`);

    const resolved = [];
    for (const section of page.sections) {
      const blocks = await this.assembler.resolveBlocks(section.blocks);
      const merged = await this.locales.merge('section', section as any, lang);
      resolved.push({ ...merged, blocks });
    }

    const mergedPage = await this.locales.merge('page', serializePage(page), lang);
    return {
      page: { ...mergedPage, sections: undefined, body: page.body },
      sections: resolved,
      subNav: resolved
        .filter((s) => s.showInSubNav)
        .map((s) => ({ anchor: s.anchor, label: s.label, title: s.title })),
    };
  }

  /** 已发布页面清单，供前台路由表与站点地图使用 */
  async publishedSummaries() {
    return this.prisma.page.findMany({
      where: { status: 1 },
      select: { key: true, name: true, path: true, seoTitle: true },
      orderBy: { key: 'asc' },
    });
  }

  private async nextSectionOrder(pageId: string) {
    const max = await this.prisma.section.findFirst({ where: { pageId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return (max?.sortOrder ?? 0) + 10;
  }

  private async nextBlockOrder(sectionId: string) {
    const max = await this.prisma.block.findFirst({ where: { sectionId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return (max?.sortOrder ?? 0) + 10;
  }

  private async assertSection(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException('区块组不存在');
    return section;
  }

  private async assertBlock(id: string) {
    const block = await this.prisma.block.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('区块不存在');
    return block;
  }
}

function ensurePath(path: string): string {
  const raw = (path || '/').trim();
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function pickPageFields(input: Record<string, any>) {
  const data: Record<string, any> = {};
  for (const field of PAGE_FIELDS) {
    if (input[field] !== undefined) data[field] = textOrNull(input[field]);
  }
  if (input.body !== undefined) data.body = sanitizeRichHtml(input.body);
  if (input.status !== undefined) data.status = Number(input.status);
  return data;
}

/**
 * 命中同一条记录时不回写身份字段（anchor / code）。
 * saveTree 会把提交值走一遍 normalizeCode，而历史数据里存在 founderCard 这类驼峰编码，
 * 回写等于整页保存时悄悄改掉被前台引用的标识。
 */
function withoutKey(data: Record<string, any>, key: string): Record<string, any> {
  const out = { ...data };
  delete out[key];
  return out;
}

function serializeBlock(block: any) {
  return {
    ...block,
    props: readJsonObject(block.props, {}),
    query: block.query === null || block.query === undefined ? null : readJsonObject(block.query, {}),
    theme: block.theme === null || block.theme === undefined ? null : readJsonObject(block.theme, {}),
    createdAt: block.createdAt instanceof Date ? block.createdAt.toISOString() : block.createdAt,
    updatedAt: block.updatedAt instanceof Date ? block.updatedAt.toISOString() : block.updatedAt,
  };
}

function serializePage(page: any) {
  return {
    ...page,
    createdAt: page.createdAt instanceof Date ? page.createdAt.toISOString() : page.createdAt,
    updatedAt: page.updatedAt instanceof Date ? page.updatedAt.toISOString() : page.updatedAt,
  };
}
