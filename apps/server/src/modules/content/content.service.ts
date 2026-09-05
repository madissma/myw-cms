import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate } from '../../common/utils/pagination.util';
import { slugify, uniqueSlug } from '../../common/utils/slug.util';
import { searchFilter } from '../../common/utils/db.util';
import { AuditService } from '../../common/audit/audit.service';
import { CONTENT_RESOURCES, ResourceDef, serializeRow, toData, findResource } from './content.registry';

/**
 * 六类结构化内容（产品/新闻/视频/口碑/荣誉/大事记）共用的 CRUD + 排序 + 上下架。
 * 差异全部收敛在 content.registry 的资源描述里，这里不出现任何资源名。
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private d(def: ResourceDef): any {
    const delegate = (this.prisma as any)[def.delegate];
    if (!delegate) throw new BadRequestException(`未注册的模型：${def.delegate}`);
    return delegate;
  }

  resources(): ResourceDef[] {
    return CONTENT_RESOURCES;
  }

  def(key: string): ResourceDef {
    return findResource(key);
  }

  async list(def: ResourceDef, query: PageQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20));

    const where: any = {};
    if (query.status !== undefined && query.status !== null) where.status = query.status;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(def.searchable, kw);
    // 分类下拉只在有 categoryOf 的资源上有意义；其它资源的 categorySlug 是自由文本，同样按等值过滤
    if (query.category) where.categorySlug = query.category;

    const orderBy = this.orderBy(def, query.sort);
    const delegate = this.d(def);
    const [list, total] = await Promise.all([
      delegate.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy }),
      delegate.count({ where }),
    ]);
    return paginate(list.map((r: any) => serializeRow(def, r)), total, page, pageSize);
  }

  async detail(def: ResourceDef, id: string) {
    const row = await this.d(def).findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`${def.label}不存在`);
    return serializeRow(def, row);
  }

  async create(def: ResourceDef, input: Record<string, any>) {
    await this.ensureCategory(def, input);
    const data = toData(def, input);
    if (def.hasSlug) data.slug = await this.resolveSlug(def, data.slug || slugify(data[def.slugFrom ?? 'name'] || '', def.key));
    if (data.sortOrder === undefined || data.sortOrder === null) data.sortOrder = await this.nextSortOrder(def);
    if (def.dates?.includes('publishedAt') && !data.publishedAt) data.publishedAt = new Date();
    const created = await this.d(def).create({ data });
    return serializeRow(def, created);
  }

  async update(def: ResourceDef, id: string, input: Record<string, any>) {
    const current = await this.d(def).findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`${def.label}不存在`);

    await this.ensureCategory(def, input, true);
    const data = toData(def, input, { partial: true });
    if (def.hasSlug) {
      const desired = data.slug ?? current.slug;
      if (desired !== current.slug) data.slug = await this.resolveSlug(def, desired, id);
      else delete data.slug;
    }
    const saved = await this.d(def).update({ where: { id }, data });
    return serializeRow(def, saved);
  }

  async remove(def: ResourceDef, id: string) {
    const current = await this.d(def).findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`${def.label}不存在`);
    await this.d(def).delete({ where: { id } });
    return { ok: true };
  }

  async bulkRemove(def: ResourceDef, ids: string[]) {
    const res = await this.d(def).deleteMany({ where: { id: { in: ids } } });
    return { count: res.count };
  }

  async setStatus(def: ResourceDef, id: string, status: number) {
    const data: any = { status };
    if (status === 1 && def.dates?.includes('publishedAt')) {
      const current = await this.d(def).findUnique({ where: { id } });
      if (current && !current.publishedAt) data.publishedAt = new Date();
    }
    const saved = await this.d(def).update({ where: { id }, data }).catch(() => null);
    if (!saved) throw new NotFoundException(`${def.label}不存在`);
    return serializeRow(def, saved);
  }

  /** 按给定顺序重写 sortOrder，只更新本资源内的记录 */
  async resort(def: ResourceDef, ids: string[]) {
    const rows = await this.d(def).findMany({ where: { id: { in: ids } }, select: { id: true, sortOrder: true } });
    const index = new Map(rows.map((r: any) => [r.id, r.sortOrder]));
    const updates = ids
      .map((id, i) => ({ id, sortOrder: i + 1 }))
      .filter((u) => index.get(u.id) !== undefined && index.get(u.id) !== u.sortOrder);
    await this.prisma.$transaction(
      updates.map((u) => this.d(def).update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } })),
    );
    return { updated: updates.length };
  }

  /** 前台可见内容：仅 status=1 */
  async publicList(def: ResourceDef, opts: { category?: string; keyword?: string; page: number; pageSize: number; where?: any }) {
    const where: any = { status: 1, ...(def.publicWhere ?? {}), ...(opts.where ?? {}) };
    if (opts.category) where.categorySlug = opts.category;
    const kw = (opts.keyword || '').trim();
    if (kw) where.OR = searchFilter(def.searchable, kw);

    const delegate = this.d(def);
    const [list, total] = await Promise.all([
      delegate.findMany({ where, skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize, orderBy: def.publicOrder ?? def.defaultOrder }),
      delegate.count({ where }),
    ]);
    return paginate(list.map((r: any) => serializeRow(def, r)), total, opts.page, opts.pageSize);
  }

  async publicDetail(def: ResourceDef, slug: string) {
    const delegate = this.d(def);
    const row =
      (await delegate.findFirst({ where: { slug, status: 1 } })) ||
      (def.hasLegacyId ? await delegate.findFirst({ where: { legacyId: slug, status: 1 } }) : null) ||
      (await delegate.findFirst({ where: { id: slug, status: 1 } }));
    if (!row) throw new NotFoundException(`${def.label}不存在或已下架`);
    return serializeRow(def, row);
  }

  /** 同类推荐：优先同分类，不足则用其它已发布记录补齐 */
  async related(def: ResourceDef, slug: string, take = 3) {
    const self = await this.publicDetail(def, slug).catch(() => null);
    if (!self) return [];
    const delegate = this.d(def);
    const whereField = def.categoryOf?.field;
    const primary: any[] = whereField ? [{ status: 1, NOT: { id: self.id }, [whereField]: self[whereField] }] : [];
    const pool = primary.length
      ? await delegate.findMany({ where: { OR: primary }, take, orderBy: def.publicOrder ?? def.defaultOrder })
      : [];
    if (pool.length < take) {
      const fill = await delegate.findMany({
        where: { status: 1, id: { notIn: [...pool.map((p: any) => p.id), self.id] } },
        take: take - pool.length,
        orderBy: def.publicOrder ?? def.defaultOrder,
      });
      pool.push(...fill);
    }
    return pool.map((r: any) => serializeRow(def, r));
  }

  async bumpViews(def: ResourceDef, idOrSlug: string) {
    if (!def.ints?.includes('views')) throw new BadRequestException(`${def.label}不支持浏览量统计`);
    const delegate = this.d(def);
    const row = await delegate.findFirst({ where: { OR: [{ slug: idOrSlug }, { id: idOrSlug }, ...(def.hasLegacyId ? [{ legacyId: idOrSlug }] : [])] } });
    if (!row) throw new NotFoundException(`${def.label}不存在`);
    await delegate.update({ where: { id: row.id }, data: { views: { increment: 1 } } });
    return { views: (row.views ?? 0) + 1 };
  }

  async countBy(def: ResourceDef, where: any = {}) {
    return this.d(def).count({ where });
  }

  private orderBy(def: ResourceDef, sort?: string) {
    if (!sort) return def.defaultOrder;
    const out = sort
      .split(',')
      .map((seg) => seg.trim())
      .filter(Boolean)
      .map((seg) => {
        const [field, dir] = seg.split(':');
        return def.sortable.includes(field) ? { [field]: dir === 'asc' ? 'asc' : 'desc' } : null;
      })
      .filter(Boolean);
    return out.length ? out : def.defaultOrder;
  }

  private async nextSortOrder(def: ResourceDef) {
    const last = await this.d(def).findMany({ select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 });
    return (last[0]?.sortOrder ?? 0) + 1;
  }

  private async resolveSlug(def: ResourceDef, desired: string, excludeId?: string) {
    const base = slugify(desired || def.key, def.delegate);
    return uniqueSlug(base, async (candidate) => {
      const hit = await this.d(def).findFirst({ where: { slug: candidate }, select: { id: true } });
      return !!hit && hit.id !== excludeId;
    });
  }

  private async ensureCategory(def: ResourceDef, input: Record<string, any>, partial = false) {
    if (!def.categoryOf) return;
    const value = input[def.categoryOf.field];
    if (partial && value === undefined) return;
    if (!value) {
      if (!partial) throw new BadRequestException(`${def.label}：请选择所属分类`);
      return;
    }
    const hit = await this.prisma.term.findFirst({
      where: { slug: String(value), taxonomy: { key: def.categoryOf.taxonomy } },
      select: { id: true },
    });
    if (!hit) throw new BadRequestException(`分类 ${value} 不存在（${def.categoryOf.taxonomy}）`);
  }
}
