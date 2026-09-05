import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageParams, paginate, searchFilter, textOrNull, toDateOrNull } from '../../common/utils/index.util';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { MessageQueryDto, ReplyMessageDto, SubmitMessageDto } from './dto/message.dto';

export const MESSAGE_STATUS: Record<number, string> = {
  0: '未处理',
  1: '处理中',
  2: '已回复',
  3: '已关闭',
};

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  /** 前台提交：蜜罐命中时静默成功，不给机器人反馈 */
  async submit(dto: SubmitMessageDto, req: Request) {
    if ((dto.website || '').trim()) {
      return { ok: true };
    }
    const created = await this.prisma.message.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        email: textOrNull(dto.email),
        type: textOrNull(dto.type),
        content: dto.content.trim(),
        status: 0,
        ip: clientIp(req) || null,
        userAgent: textOrNull(req.headers['user-agent'] as string),
      },
    });
    return { ok: true, id: created.id };
  }

  async list(query: MessageQueryDto) {
    const { page, pageSize } = pageParams(query);
    const where = this.buildWhere(query);

    const [list, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.message.count({ where }),
    ]);
    return paginate(list.map(serialize), total, page, pageSize);
  }

  async detail(id: string) {
    const row = await this.prisma.message.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('留言不存在');
    return { ...serialize(row), statusLabel: MESSAGE_STATUS[row.status] ?? '未知' };
  }

  async setStatus(id: string, status: number) {
    if (MESSAGE_STATUS[status] === undefined) throw new BadRequestException('留言状态不合法');
    await this.detail(id);
    const updated = await this.prisma.message.update({ where: { id }, data: { status } });
    return serialize(updated);
  }

  async assign(id: string, handlerId?: string) {
    await this.detail(id);
    const updated = await this.prisma.message.update({
      where: { id },
      data: { handlerId: textOrNull(handlerId), status: handlerId ? 1 : undefined },
    });
    return serialize(updated);
  }

  async reply(id: string, dto: ReplyMessageDto, handlerId: string) {
    await this.detail(id);
    const updated = await this.prisma.message.update({
      where: { id },
      data: {
        reply: dto.reply.trim(),
        status: dto.status ?? 2,
        handlerId: handlerId || undefined,
      },
    });
    return serialize(updated);
  }

  /** 导出 CSV：沿用当前筛选条件，最多 5000 条 */
  async exportCsv(query: MessageQueryDto, req: Request) {
    const where = this.buildWhere(query);
    const rows = await this.prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000 });
    const header = ['提交时间', '姓名', '电话', '邮箱', '类型', '状态', '处理人', '留言内容', '回复内容', 'IP'];
    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.createdAt.toISOString(),
          row.name,
          row.phone,
          row.email ?? '',
          row.type ?? '',
          MESSAGE_STATUS[row.status] ?? String(row.status),
          row.handlerId ?? '',
          row.content,
          row.reply ?? '',
          row.ip ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
    }
    // BOM 让 Excel 正确识别 UTF-8
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  }

  async removeMany(ids: string[]) {
    if (!ids?.length) throw new BadRequestException('请选择要删除的留言');
    const res = await this.prisma.message.deleteMany({ where: { id: { in: ids } } });
    return { deleted: res.count };
  }

  async counters() {
    const grouped = await this.prisma.message.groupBy({ by: ['status'], _count: { _all: true } });
    const out: Record<string, number> = { total: 0 };
    for (const key of Object.keys(MESSAGE_STATUS)) out[key] = 0;
    for (const g of grouped) {
      out[String(g.status)] = g._count._all;
      out.total += g._count._all;
    }
    return out;
  }

  private buildWhere(query: MessageQueryDto): any {
    const where: any = {};
    if (query.status !== undefined && query.status !== null && `${query.status}` !== '') {
      where.status = Number(query.status);
    }
    if (query.type) where.type = query.type;
    if (query.handlerId) where.handlerId = query.handlerId;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['name', 'phone', 'email', 'content'], kw);
    return where;
  }
}

function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/"/g, '""');
  return /[",\r\n]/.test(text) ? `"${text}"` : text;
}

function serialize(row: any) {
  return { ...row, createdAt: row.createdAt?.toISOString?.(), updatedAt: toDateOrNull(row.updatedAt)?.toISOString?.() };
}
