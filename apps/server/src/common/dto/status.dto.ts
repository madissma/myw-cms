import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsString } from 'class-validator';

/** 通用状态变更请求体（发布 / 下架 / 启用 / 禁用） */
export class StatusDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2])
  status: number;
}

/** 批量上下架 / 批量删除 */
export class BulkIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
