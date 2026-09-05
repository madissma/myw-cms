import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest<Request & { traceId?: string }>();
    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - started;
        if (ms > 500) this.logger.warn(`${req.method} ${req.originalUrl} ${ms}ms (慢请求) trace=${req.traceId}`);
      }),
    );
  }
}
