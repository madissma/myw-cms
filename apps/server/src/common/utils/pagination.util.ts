export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paginate<T>(list: T[], total: number, page = 1, pageSize = 20): Paginated<T> {
  return { list, total, page, pageSize };
}

export function skipTake(page = 1, pageSize = 20): { skip: number; take: number } {
  return { skip: (Math.max(1, page) - 1) * pageSize, take: pageSize };
}

/** 把 sort 表达式转为 Prisma orderBy，字段必须在白名单内 */
export function toOrderBy(sort: string | undefined, allowed: string[], fallback: any): any {
  if (!sort) return fallback;
  const out = sort
    .split(',')
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const [field, dir] = seg.split(':');
      if (!allowed.includes(field)) return null;
      return { [field]: dir === 'asc' ? 'asc' : 'desc' };
    })
    .filter(Boolean);
  return out.length ? out : fallback;
}

/** 分页参数 → Prisma findMany 的 skip/take */
export function pageParams(query: { page?: number; pageSize?: number }): { page: number; pageSize: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize };
}

/** 数值规整：非法或 <=0 时回落默认值 */
export function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function toOptInt(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function toBool(value: unknown, fallback = false): boolean {
  if (value === '' || value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return value === 1 || value === '1' || value === 'true';
}

/** 日期入参：接受 ISO 串 / 毫秒 / Date，空值写 null */
export function toDateOrNull(value: unknown): Date | null {
  if (value === '' || value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(d.getTime()) ? null : d;
}
