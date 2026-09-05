import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERM_KEY } from '../decorators/perm.decorator';
import type { AuthUser } from './auth-user.interface';

/**
 * 权限守卫：校验 @Perm('content:product:edit') 声明的权限点。
 * 支持通配：持有 content:product:* 或 content:* 或 * 即视为通过。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PERM_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user) throw new ForbiddenException('无权访问');

    if (hasPermission(user.permissions, required)) return true;
    throw new ForbiddenException(`缺少权限：${required}`);
  }
}

export function hasPermission(owned: string[], required: string): boolean {
  if (!owned?.length) return false;
  if (owned.includes('*') || owned.includes(required)) return true;
  const parts = required.split(':');
  for (let i = parts.length - 1; i > 0; i--) {
    if (owned.includes(`${parts.slice(0, i).join(':')}:*`)) return true;
  }
  return false;
}
