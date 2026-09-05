import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export class CreatePageDto {
  @IsString()
  @IsNotEmpty({ message: '页面标识不能为空' })
  @Matches(/^[a-z0-9-]+$/, { message: '页面标识仅支持小写字母、数字与短横线' })
  @MaxLength(64)
  key: string;

  @IsString()
  @IsNotEmpty({ message: '页面名称不能为空' })
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty({ message: '访问路径不能为空' })
  @MaxLength(120)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImage?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImage?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;
}

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty({ message: '锚点不能为空' })
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: '锚点仅支持字母、数字、下划线与短横线' })
  @MaxLength(64)
  anchor: string;

  @IsString()
  @IsNotEmpty({ message: '子导航文案不能为空' })
  @MaxLength(64)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  eyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  variant?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showInSubNav?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: '锚点仅支持字母、数字、下划线与短横线' })
  @MaxLength(64)
  anchor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  eyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  variant?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showInSubNav?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

/** Json 字段整体覆盖：由 BlockEditorDrawer 产出，具体裁剪交给 block.util.normalizeBlockProps */
export class CreateBlockDto {
  @IsString()
  @IsNotEmpty({ message: '区块编码不能为空' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: '区块编码仅支持字母、数字、点、下划线与短横线' })
  @MaxLength(64)
  code: string;

  @IsString()
  @IsNotEmpty({ message: '区块类型不能为空' })
  @MaxLength(64)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  source?: string;

  @IsOptional()
  @IsObject()
  query?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  columns?: number;

  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class UpdateBlockDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, { message: '区块编码仅支持字母、数字、点、下划线与短横线' })
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  source?: string;

  @IsOptional()
  @IsObject()
  query?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  columns?: number;

  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

/** 整页保存：一次提交 Page + 其下全部 Section / Block，供页面设计器「保存全部」使用 */
export class SavePageTreeDto {
  @IsOptional()
  @IsObject()
  page?: Record<string, any>;

  @IsOptional()
  @IsArray()
  sections?: Record<string, any>[];
}

export class BlockQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
