import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto';

export class MediaQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  folder?: string;

  /** 仅看图片 / 仅看视频 */
  @IsOptional()
  @IsIn(['image', 'video'])
  type?: string;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  folder?: string;
}

export class MediaRefQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;
}

export class RegisterMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;
}
