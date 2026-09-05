import { Body, Controller, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto, UpdateProfileDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '登录' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, clientIp(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '用 refreshToken 换发新凭证' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('profile')
  @ApiOperation({ summary: '当前用户资料与权限点' })
  profile(@CurrentUser('id') userId: string) {
    return this.auth.profile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: '修改个人资料' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(userId, dto);
  }

  @Patch('password')
  @HttpCode(200)
  @ApiOperation({ summary: '修改密码' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.auth.changePassword(userId, dto, clientIp(req));
  }
}
