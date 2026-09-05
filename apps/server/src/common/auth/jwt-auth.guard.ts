import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser, JwtPayload } from './auth-user.interface';

/**
 * JWT 守卫：@Public() 直接放行，其余要求 Authorization: Bearer <token>
 * 手写而非依赖 passport，减少一层运行时耦合。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const raw: string | undefined = req.headers.authorization;
    const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
    if (!token) throw new UnauthorizedException('未登录或凭证缺失');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    if (payload.type && payload.type !== 'access') throw new UnauthorizedException('凭证类型不正确');

    const user: AuthUser = {
      id: payload.sub,
      username: payload.username,
      name: payload.name,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
    (req as Request & { user?: AuthUser }).user = user;
    return true;
  }
}
