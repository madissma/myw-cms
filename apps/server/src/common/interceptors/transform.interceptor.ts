import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
  traceId: string;
}

/** 成功响应统一信封 { code, message, data, traceId } */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const req = ctx.switchToHttp().getRequest();
        return {
          code: 0,
          message: 'ok',
          data: data === undefined ? null : data,
          traceId: req?.traceId || '',
        };
      }),
    );
  }
}
