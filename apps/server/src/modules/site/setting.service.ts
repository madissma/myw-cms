import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeStrings, textOrNull } from '../../common/utils/index.util';
import { CreateSettingDto, SettingQueryDto, UpdateSettingDto } from './dto/site.dto';

/** 按声明的类型把表单入参规整为可落 Json 列的值 */
export function coerceByType(type: string, raw: unknown): any {
  switch (type) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case 'boolean':
      return raw === true || raw === 1 || raw === '1' || raw === 'true';
    case 'tags':
      return normalizeStrings(raw);
    case 'pairs':
      return Array.isArray(raw)
        ? raw
            .map((row) => ({ label: String(row?.label ?? '').trim(), value: String(row?.value ?? '').trim() }))
            .filter((row) => row.label || row.value)
        : [];
    case 'json':
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          throw new BadRequestException('JSON 格式不正确');
        }
      }
      return raw ?? null;
    default: {
      if (raw === null || raw === undefined) return '';
      if (typeof raw === 'object') return raw;
      return String(raw);
    }
  }
}

@Injectable()
export class SettingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SettingQueryDto = {}) {
    const where: any = {};
    if (query.group) where.group = query.group;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = [{ key: { contains: kw } }, { label: { contains: kw } }];

    const rows = await this.prisma.setting.findMany({ where, orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] });
    return rows.map((r) => ({ ...r, options: r.options ?? [] }));
  }

  /** 分组返回，后台一个 tab 一次拉取 */
  async grouped() {
    const rows = await this.list();
    const out: Record<string, any[]> = {};
    for (const row of rows) {
      (out[row.group] ??= []).push(row);
    }
    return out;
  }

  /** key -> value 扁平映射，供 public/bootstrap 与站内取用 */
  async values(): Promise<Record<string, any>> {
    const rows = await this.prisma.setting.findMany({ select: { key: true, value: true } });
    const out: Record<string, any> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  async detail(id: string) {
    const row = await this.prisma.setting.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('配置项不存在');
    return { ...row, options: row.options ?? [] };
  }

  async create(dto: CreateSettingDto) {
    const key = dto.key.trim();
    const hit = await this.prisma.setting.findUnique({ where: { key } });
    if (hit) throw new ConflictException(`配置项 ${key} 已存在`);
    const created = await this.prisma.setting.create({
      data: {
        group: dto.group.trim(),
        key,
        value: coerceByType(dto.type, dto.value),
        type: dto.type,
        label: dto.label.trim(),
        remark: textOrNull(dto.remark),
        options: dto.options?.length ? dto.options : undefined,
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder(dto.group)),
      },
    });
    return this.detail(created.id);
  }

  /** type 不在 update 分支内，避免覆盖运营在后台调整过的控件类型（规划 10.7） */
  async update(id: string, dto: UpdateSettingDto) {
    const current = await this.prisma.setting.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('配置项不存在');

    await this.prisma.setting.update({
      where: { id },
      data: {
        group: dto.group?.trim(),
        value: dto.value === undefined ? undefined : coerceByType(current.type, dto.value),
        label: dto.label?.trim(),
        remark: dto.remark === undefined ? undefined : textOrNull(dto.remark),
        options: dto.options === undefined ? undefined : normalizeOptions(dto.options),
        sortOrder: dto.sortOrder,
      },
    });
    return this.detail(id);
  }

  /** 按 key 批量写入，后台配置表单的主入口 */
  async upsertBulk(items: { key: string; value: any }[]) {
    if (!items?.length) return { updated: 0 };
    const keys = items.map((i) => i.key).filter(Boolean);
    const existing = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const typeMap = new Map<string, string>(existing.map((e) => [e.key, e.type] as [string, string]));

    let updated = 0;
    for (const item of items) {
      const type = typeMap.get(item.key);
      if (!type) continue; // 未登记的配置项忽略，避免脏 key 入库
      await this.prisma.setting.update({ where: { key: item.key }, data: { value: coerceByType(type, item.value) } });
      updated += 1;
    }
    return { updated, skipped: items.length - updated };
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.setting.delete({ where: { id } });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const found = await this.prisma.setting.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('配置项不存在');
  }

  private async nextSortOrder(group: string) {
    const max = await this.prisma.setting.findFirst({
      where: { group },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (max?.sortOrder ?? 0) + 10;
  }
}

function normalizeOptions(input?: { label: string; value: string }[]) {
  if (!Array.isArray(input)) return null;
  const rows = input
    .map((o) => ({ label: String(o?.label ?? '').trim(), value: String(o?.value ?? '').trim() }))
    .filter((o) => o.value);
  return rows.length ? rows : null;
}
