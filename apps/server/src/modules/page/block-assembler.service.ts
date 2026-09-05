import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { readJsonObject } from '../../common/utils/index.util';
import { entityDelegate } from './block.schema';

/** entity_list 允许的 where / orderBy 字段白名单，防止把任意条件注入查询 */
const WHERE_FIELDS: Record<string, string[]> = {
  product: ['categorySlug', 'isFeatured', 'isHot', 'status'],
  news: ['categorySlug', 'isTop', 'status'],
  review: ['status', 'isAuthorized'],
  honor: ['status'],
  timeline: ['status'],
  video: ['status', 'categorySlug'],
  term: ['status'],
};

const ORDER_FIELDS: Record<string, string[]> = {
  product: ['sortOrder', 'createdAt', 'publishedAt', 'name'],
  news: ['sortOrder', 'publishedAt', 'createdAt', 'views'],
  review: ['sortOrder', 'createdAt', 'rating'],
  honor: ['sortOrder', 'createdAt', 'year'],
  timeline: ['sortOrder', 'year', 'createdAt'],
  video: ['sortOrder', 'createdAt'],
  term: ['sortOrder', 'createdAt', 'name'],
};

const SAFE_LABELS: Record<string, string> = {
  product: 'name',
  news: 'title',
  review: 'customerName',
  honor: 'name',
  timeline: 'content',
  video: 'title',
  term: 'name',
};

@Injectable()
export class BlockAssembler {
  private readonly logger = new Logger(BlockAssembler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 把 entity_list 区块的 { source, query } 解析为真实记录（规划第 4 节末约定）。
   * 解析失败不抛错，返回空数组并记日志，保证前台单个区块不影响整页。
   */
  async resolveEntities(source: string | null, query: unknown): Promise<any[]> {
    const delegateName = source ? entityDelegate(source) : undefined;
    if (!delegateName) return [];
    const delegate = (this.prisma as any)[delegateName];
    if (!delegate) return [];

    const input = readJsonObject<Record<string, any>>(query, {});
    const where = this.filterWhere(source!, input.where);
    const orderBy = this.filterOrder(source!, input.orderBy);
    const take = Math.min(60, Math.max(1, Number(input.limit) || 6));

    // term 数据源按分类组过滤（如商城渠道 shop_channel），query.taxonomy 传 Taxonomy.key
    if (source === 'term') {
      const key = String(input.taxonomy ?? input.where?.taxonomy ?? '').trim();
      if (!key) return [];
      const group = await this.prisma.taxonomy.findUnique({ where: { key } });
      if (!group) return [];
      where.taxonomyId = group.id;
    }

    try {
      const rows = await delegate.findMany({ where, orderBy, take });
      return rows.map((row: any) => this.toItem(source!, row));
    } catch (err) {
      this.logger.warn(`entity_list 解析失败 source=${source}：${(err as Error).message}`);
      return [];
    }
  }

  /** 单个区块：entity_list 用解析结果覆盖 props.items，其余原样返回 */
  async resolveBlock(block: any): Promise<any> {
    const props = readJsonObject<Record<string, any>>(block.props, {});
    if (block.type === 'entity_list') {
      const items = await this.resolveEntities(block.source, block.query);
      return { ...block, props: { ...props, items } };
    }
    return { ...block, props, source: undefined, query: undefined };
  }

  async resolveBlocks(blocks: any[]): Promise<any[]> {
    const out = [];
    for (const block of blocks) out.push(await this.resolveBlock(block));
    return out;
  }

  private filterWhere(source: string, raw: unknown): Record<string, any> {
    const allowed = WHERE_FIELDS[source] ?? [];
    const input = readJsonObject<Record<string, any>>(raw, {});
    const where: Record<string, any> = { status: 1 };
    for (const key of allowed) {
      if (key === 'status') continue;
      if (input[key] !== undefined) where[key] = input[key];
    }
    return where;
  }

  private filterOrder(source: string, raw: unknown): any {
    const allowed = ORDER_FIELDS[source] ?? ['createdAt'];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const out = list
      .map((entry: any) => {
        const [field, dir] = typeof entry === 'string' ? entry.split(':') : Object.entries(entry)[0] ?? [];
        if (!allowed.includes(field as string)) return null;
        return { [field]: dir === 'asc' || dir === 'desc' ? dir : 'asc' };
      })
      .filter(Boolean);
    return out.length ? out : [{ sortOrder: 'asc' }];
  }

  /**
   * 统一输出形态：前台区块组件按 slug / title / summary / image 取值，
   * 六类实体字段名不同，这里做一次归一，避免区块组件写满分支判断。
   */
  private toItem(source: string, row: any) {
    const label = SAFE_LABELS[source] ?? 'name';
    return {
      ...row,
      slug: row.slug ?? row.id,
      title: row[label] ?? row.title ?? row.name,
      image: row.image ?? row.cover ?? row.poster ?? row.avatar ?? null,
      date: row.publishedAt instanceof Date ? row.publishedAt.toISOString().slice(0, 10) : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}
