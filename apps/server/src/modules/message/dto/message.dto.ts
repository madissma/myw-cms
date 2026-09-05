import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

/** 前台留言提交：honeypot 字段 website 必须留空 */
export class SubmitMessageDto {
  @IsString()
  @IsNotEmpty({ message: '请填写姓名' })
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty({ message: '请填写联系电话' })
  @MaxLength(32)
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @IsString()
  @IsNotEmpty({ message: '请填写留言内容' })
  @MinLength(2, { message: '留言内容过短' })
  @MaxLength(2000)
  content: string;

  /** 蜜罐字段：真人不会填，机器人通常会填上 */
  @IsOptional()
  @IsString()
  @MaxLength(0, { message: '非法提交' })
  website?: string;
}

export class MessageQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @IsOptional()
  @IsString()
  handlerId?: string;
}

export class ReplyMessageDto {
  @IsString()
  @IsNotEmpty({ message: '回复内容不能为空' })
  @MaxLength(2000)
  reply: string;

  /** 回复后顺带流转状态，缺省置为已回复 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  status?: number;
}

export class AssignMessageDto {
  @IsOptional()
  @IsString()
  handlerId?: string;
}

export class MessageStatusDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  status: number;
}
