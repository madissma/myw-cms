import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** 为每个请求生成 traceId，写入响应头供信封与异常过滤读取 */
export function tracer(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-trace-id'];
  const traceId = typeof incoming === 'string' && incoming.trim() ? incoming.trim().slice(0, 64) : randomUUID();
  (req as Request & { traceId?: string }).traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}

export function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}
