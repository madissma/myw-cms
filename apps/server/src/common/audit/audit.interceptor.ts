import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { clientIp } from '../middleware/tracer.middleware';
import type { AuthUser } from '../auth/auth-user.interface';
import { AuditService } from './audit.service';

/** 命中 @Audit() 的接口在成功返回后写一条操作日志，响应体外加一层无副作用记录 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    return next.handle().pipe(
      tap((result) => {
        const targetId = result?.id || req.params?.id || '';
        this.audit.log({
          userId: req.user?.id,
          username: req.user?.username,
          action: meta.action,
          target: targetId ? `${meta.target}:${targetId}` : meta.target,
          ip: clientIp(req),
          payload: meta.withPayload ? { body: req.body, params: req.params, query: req.query } : null,
        });
      }),
    );
  }
}
