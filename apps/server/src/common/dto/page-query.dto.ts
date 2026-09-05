import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { containsFilter } from '../utils/db.util';
import { pageParams, paginate, toOrderBy } from '../utils/pagination.util';

/** 允许的排序字段总白名单（各资源可再收窄） */
const DEFAULT_SORTABLE = ['sortOrder', 'createdAt', 'updatedAt', 'id', 'title', 'name', 'publishedAt', 'views'];

/** 解析排序表达式，未命中白名单时回落 */
export function pageOrder(query: { sort?: string }, fallback: any, allowed: string[] = DEFAULT_SORTABLE): any {
  return toOrderBy(query.sort, allowed, fallback);
}

/**
 * 所有列表接口共用的分页 / 检索参数。
 * 子类通过 keywordFields 声明可模糊检索的字段，toWhere() 生成 Prisma where。
 */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  /** 内容侧 0-2（草稿/发布/下架），留言侧用到 0-3 */
  @Max(3)
  status?: number;

  /** 分类筛选：值为 Term.slug，仅带 categoryOf 的内容资源用到 */
  @IsOptional()
  @IsString()
  category?: string;

  /** 排序表达式，形如 sortOrder:asc,publishedAt:desc */
  @IsOptional()
  @IsString()
  sort?: string;

  /** 子类覆盖：允许模糊匹配的字段 */
  keywordFields: string[] = [];

  /** 子类覆盖：允许的排序字段 */
  sortableFields: string[] = DEFAULT_SORTABLE;

  get skip(): number {
    const { page, pageSize } = pageParams(this);
    return (page - 1) * pageSize;
  }

  get take(): number {
    return pageParams(this).pageSize;
  }

  toWhere(extra: Record<string, any> = {}): any {
    const where: Record<string, any> = { ...extra };
    const kw = (this.keyword || '').trim();
    if (kw && this.keywordFields.length) {
      where.AND = [{ OR: this.keywordFields.map((f) => containsFilter(f, kw)) }];
    }
    if (this.status !== undefined && this.status !== null) where.status = this.status;
    return where;
  }

  get orderBy(): any {
    return pageOrder(this, { createdAt: 'desc' }, this.sortableFields);
  }

  paginate<T>(list: T[], total: number) {
    const { page, pageSize } = pageParams(this);
    return paginate(list, total, page, pageSize);
  }
}
