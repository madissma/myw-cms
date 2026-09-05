import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Setting.type 决定后台自动渲染的控件类型 */
export const SETTING_TYPES = [
  'text', 'textarea', 'number', 'boolean', 'color', 'image', 'url', 'email',
  'select', 'tags', 'pairs', 'json', 'richtext', 'date',
] as const;

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  group: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key: string;

  /** value 落 Json 列，任意标量/数组/对象均可 */
  @IsNotEmpty({ message: '配置值不能为空' })
  value: any;

  @IsString()
  @IsIn(SETTING_TYPES as unknown as string[])
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @IsOptional()
  @IsArray()
  options?: { label: string; value: string }[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateSettingDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  group?: string;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @IsOptional()
  @IsArray()
  options?: { label: string; value: string }[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

/** 站点配置表单批量保存：一次提交一个分组的全部字段 */
export class BulkSettingItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key: string;

  /** 表单保存允许把一项配置清空为 ''（如暂时不展示备案号），但必须显式带上 value */
  @IsDefined({ message: '缺少配置值' })
  value: any;
}

export class BulkSettingDto {
  @IsArray()
  @MaxLength(200, { each: true })
  items: BulkSettingItemDto[];
}

export class SettingQueryDto {
  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateThemeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: '主题编码仅支持小写字母、数字与短横线' })
  @MaxLength(64)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsObject()
  tokens: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  preview?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsObject()
  tokens?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  preview?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class CreateLocaleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-]+$/, { message: '语言代码形如 zh-CN / en-US' })
  @MaxLength(16)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nativeName: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class UpdateLocaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nativeName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class UpsertTranslationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  locale: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  entity: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  entityId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  field: string;

  @IsString()
  value: string;
}

export class BulkTranslationDto {
  @IsArray()
  @MaxLength(500, { each: true })
  items: UpsertTranslationDto[];
}

export class TranslationQueryDto {
  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
