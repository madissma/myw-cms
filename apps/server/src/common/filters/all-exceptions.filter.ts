import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/** 全部异常按同一信封返回，前端只需判 code */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { traceId?: string }>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = -1;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as any)?.message)
            ? (body as any).message.join('；')
            : ((body as any)?.message ?? exception.message);
      code = status;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = `唯一字段重复：${(exception.meta?.target as string[])?.join(', ') || '字段'}`;
        code = status;
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = '记录不存在';
        code = status;
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = '存在关联数据，无法删除或字段取值无效';
        code = status;
      } else {
        message = `数据库错误 ${exception.code}`;
        code = status;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const traceId = req?.traceId || '';
    if (status >= 500) this.logger.error(`${req?.method} ${req?.url} -> ${message}`, (exception as Error)?.stack);
    else this.logger.warn(`${req?.method} ${req?.url} -> ${status} ${message}`);

    if (traceId && !res.headersSent) res.setHeader('x-trace-id', traceId);
    res.status(status).json({
      code,
      message,
      data: null,
      traceId,
    });
  }
}
