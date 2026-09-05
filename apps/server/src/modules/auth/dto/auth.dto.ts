import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '请输入用户名' })
  @MaxLength(64)
  username: string;

  @IsString()
  @IsNotEmpty({ message: '请输入密码' })
  @MinLength(4, { message: '密码长度不正确' })
  @MaxLength(64)
  password: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '请输入原密码' })
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '新密码长度至少 8 位' })
  @MaxLength(64)
  newPassword: string;
}

export class UpdateProfileDto {
  @IsString()
  @MaxLength(64)
  name: string;

  @IsString()
  @MaxLength(160)
  email?: string;

  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @MaxLength(500)
  avatar?: string;
}
