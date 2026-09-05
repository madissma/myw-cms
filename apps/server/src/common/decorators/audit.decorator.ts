import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'auditMeta';

export interface AuditMeta {
  /** create | update | delete | publish | login */
  action: string;
  /** 权限前缀，用于日志定位，如 content:product */
  target: string;
  /** 是否记录请求体（含敏感信息的接口不要开） */
  withPayload?: boolean;
}

/** 标记需要写入后台操作审计的接口 */
export const Audit = (action: string, target: string, withPayload = true) =>
  SetMetadata(AUDIT_KEY, { action, target, withPayload } satisfies AuditMeta);
