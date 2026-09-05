import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PageQueryDto } from '../dto/page-query.dto';
import { pageParams, paginate, toOrderBy } from '../utils/pagination.util';
import { searchFilter } from '../utils/db.util';

export interface AuditInput {
  userId?: string | null;
  username?: string | null;
  action: string;
  target: string;
  ip?: string | null;
  payload?: any;
}

const SECRET_KEYS = ['password', 'passwordHash', 'oldPassword', 'newPassword', 'token', 'refreshToken'];

function redact(input: any): any {
  if (!input || typeof input !== 'object') return input ?? null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SECRET_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
      out[k] = '***';
    } else if (Array.isArray(v)) {
      out[k] = v.length > 40 ? [...v.slice(0, 40), `...共 ${v.length} 项`] : v;
    } else if (typeof v === 'string' && v.length > 2000) {
      out[k] = `${v.slice(0, 2000)}...`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** 审计写入失败绝不能影响主流程 */
  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.operationLog.create({
        data: {
          userId: input.userId ?? null,
          username: input.username ?? null,
          action: input.action,
          target: input.target,
          ip: input.ip ?? null,
          payload: redact(input.payload) ?? undefined,
        },
      });
    } catch {
      // ignore
    }
  }

  async list(query: PageQueryDto & { action?: string; userId?: string }) {
    const { page, pageSize } = pageParams(query);
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if ((query as any).action) where.action = (query as any).action;
    const kw = query.keyword?.trim();
    if (kw) where.OR = searchFilter(['target', 'username', 'action'], kw);

    const [list, total] = await this.prisma.$transaction([
      this.prisma.operationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: toOrderBy(query.sort, ['createdAt', 'action'], { createdAt: 'desc' }),
      }),
      this.prisma.operationLog.count({ where }),
    ]);
    return paginate(list, total, page, pageSize);
  }

  async purge(beforeDays: number) {
    const until = new Date(Date.now() - Math.max(1, beforeDays) * 86400000);
    const res = await this.prisma.operationLog.deleteMany({ where: { createdAt: { lt: until } } });
    return res.count;
  }
}
