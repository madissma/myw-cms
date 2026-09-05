import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export const NAV_POSITIONS = ['header', 'footer', 'side'];

export class NavQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  position?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateNavMenuDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @IsIn(NAV_POSITIONS)
  position?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._-]+$/, { message: '编码仅支持小写字母、数字、点、短横线与下划线' })
  @MaxLength(120)
  navKey?: string;

  @IsString()
  @IsNotEmpty({ message: '菜单名称不能为空' })
  @MaxLength(64)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  labelEn?: string;

  @IsString()
  @IsNotEmpty({ message: '链接地址不能为空' })
  @MaxLength(500)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @IsOptional()
  @IsString()
  @IsIn(['_self', '_blank'])
  target?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}

export class UpdateNavMenuDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @IsIn(NAV_POSITIONS)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  labelEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @IsOptional()
  @IsString()
  @IsIn(['_self', '_blank'])
  target?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}
