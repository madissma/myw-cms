import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** 窗口内允许的请求数 */
  limit: number;
  /** 窗口秒数 */
  windowSec: number;
}

/** 声明接口限流，如 @RateLimit({ limit: 1, windowSec: 60 }) */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * 单进程内存滑动窗口限流。
 * 只用于前台写接口（留言 / 浏览量）防刷；多实例部署时换成 Redis 即可，接口不变。
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  canActivate(ctx: ExecutionContext): boolean {
    const handler = ctx.getHandler();
    const options: RateLimitOptions | undefined = Reflect.getMetadata(RATE_LIMIT_KEY, handler);
    if (!options) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const windowMs = options.windowSec * 1000;
    const key = `${handler.name}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;

    const recent = (this.hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    this.hits.set(key, recent);

    if (recent.length > options.limit) {
      this.sweep(now, windowMs);
      throw new HttpException(`操作过于频繁，请 ${options.windowSec} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }
    this.sweep(now, windowMs);
    return true;
  }

  /** 防止 Map 无限增长：整体过长时清掉过期键 */
  private sweep(now: number, windowMs: number) {
    if (this.hits.size < 5000) return;
    for (const [key, list] of this.hits) {
      const alive = list.filter((t) => now - t < windowMs);
      if (alive.length) this.hits.set(key, alive);
      else this.hits.delete(key);
    }
  }
}
