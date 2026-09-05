import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** 前台列表查询：仅暴露必要的筛选维度，排序交给各资源的 publicOrder */
export class PublicListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  /** 只看精选（产品首页） */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  /** 只看热销（商城臻品） */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hot?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /** 语言覆盖，缺省走站点默认语言 */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  lang?: string;
}
