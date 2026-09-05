import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageParams, paginate, searchFilter } from '../../common/utils/index.util';
import {
  CreateLocaleDto,
  TranslationQueryDto,
  UpdateLocaleDto,
  UpsertTranslationDto,
} from './dto/site.dto';

/** 允许挂译文的可翻译实体，与规划第 4 节 Translation.entity 注释一致 */
export const TRANSLATABLE_ENTITIES = ['product', 'news', 'page', 'section', 'block', 'term', 'setting', 'nav'];

@Injectable()
export class LocaleService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.locale.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
  }

  /** 前台语言切换器只需启用的语言 */
  async enabled() {
    const rows = await this.prisma.locale.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }] });
    return rows.map((r) => ({ code: r.code, name: r.name, nativeName: r.nativeName, isDefault: r.isDefault }));
  }

  async defaultCode(): Promise<string> {
    const found =
      (await this.prisma.locale.findFirst({ where: { isDefault: true } })) ??
      (await this.prisma.locale.findFirst({ where: { active: true }, orderBy: { sortOrder: 'asc' } }));
    return found?.code ?? 'zh-CN';
  }

  async create(dto: CreateLocaleDto) {
    const code = dto.code.trim();
    const hit = await this.prisma.locale.findUnique({ where: { code } });
    if (hit) throw new ConflictException(`语言 ${code} 已存在`);
    const total = await this.prisma.locale.count();
    const created = await this.prisma.locale.create({
      data: {
        code,
        name: dto.name.trim(),
        nativeName: dto.nativeName.trim(),
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
        // 首个语言强制为默认
        isDefault: total === 0,
      },
    });
    return created;
  }

  async update(id: string, dto: UpdateLocaleDto) {
    await this.assertExists(id);
    return this.prisma.locale.update({
      where: { id },
      data: { name: dto.name?.trim(), nativeName: dto.nativeName?.trim(), sortOrder: dto.sortOrder, active: dto.active },
    });
  }

  async setDefault(id: string) {
    const locale = await this.prisma.locale.findUnique({ where: { id } });
    if (!locale) throw new NotFoundException('语言不存在');
    await this.prisma.$transaction([
      this.prisma.locale.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      this.prisma.locale.update({ where: { id }, data: { isDefault: true, active: true } }),
    ]);
    return locale;
  }

  async remove(id: string) {
    const locale = await this.prisma.locale.findUnique({ where: { id } });
    if (!locale) throw new NotFoundException('语言不存在');
    if (locale.isDefault) throw new BadRequestException('默认语言不可删除');
    await this.prisma.$transaction([
      this.prisma.translation.deleteMany({ where: { locale: locale.code } }),
      this.prisma.locale.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  // ==================== 译文 ====================

  async translations(query: TranslationQueryDto) {
    const { page, pageSize } = pageParams(query as any);
    const where: any = {};
    if (query.locale) where.locale = query.locale;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['field', 'value', 'entityId'], kw);

    const [list, total] = await this.prisma.$transaction([
      this.prisma.translation.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { id: 'asc' } }),
      this.prisma.translation.count({ where }),
    ]);
    return paginate(list, total, page, pageSize);
  }

  /** 某条记录的全部译文，前端编辑页按字段覆盖展示 */
  async ofEntity(entity: string, entityId: string) {
    const rows = await this.prisma.translation.findMany({ where: { entity, entityId } });
    const out: Record<string, Record<string, string>> = {};
    for (const r of rows) (out[r.locale] ??= {})[r.field] = r.value;
    return out;
  }

  async upsertTranslation(dto: UpsertTranslationDto) {
    if (!TRANSLATABLE_ENTITIES.includes(dto.entity)) {
      throw new BadRequestException(`不支持翻译的实体：${dto.entity}`);
    }
    const value = String(dto.value ?? '');
    if (!value.trim()) return this.removeTranslation({ locale: dto.locale, entity: dto.entity, entityId: dto.entityId, field: dto.field });
    return this.prisma.translation.upsert({
      where: {
        locale_entity_entityId_field: {
          locale: dto.locale,
          entity: dto.entity,
          entityId: dto.entityId,
          field: dto.field,
        },
      },
      update: { value },
      create: { locale: dto.locale, entity: dto.entity, entityId: dto.entityId, field: dto.field, value },
    });
  }

  async upsertMany(items: UpsertTranslationDto[]) {
    if (!items?.length) return { saved: 0 };
    let saved = 0;
    for (const item of items) {
      await this.upsertTranslation(item);
      saved += 1;
    }
    return { saved };
  }

  async removeTranslation(where: { locale: string; entity: string; entityId: string; field: string }) {
    const res = await this.prisma.translation.deleteMany({ where });
    return { deleted: res.count };
  }

  async removeTranslationById(id: string) {
    const found = await this.prisma.translation.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('译文不存在');
    await this.prisma.translation.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * 按语言合并译文：译文缺失字段自动回落基础记录（规划第 8 节）。
   * block 的 props 为 Json，不参与字段级覆盖，由调用方自行处理。
   */
  async merge<T extends Record<string, any>>(entity: string, record: T, lang?: string): Promise<T> {
    const defaultCode = await this.defaultCode();
    if (!lang || lang === defaultCode || !record?.id) return record;
    const rows = await this.prisma.translation.findMany({ where: { locale: lang, entity, entityId: String(record.id) } });
    if (!rows.length) return record;
    const patched: Record<string, any> = { ...record };
    for (const row of rows) {
      if (row.field in patched) patched[row.field] = row.value;
    }
    return patched as T;
  }

  async mergeMany<T extends Record<string, any>>(entity: string, records: T[], lang?: string): Promise<T[]> {
    const defaultCode = await this.defaultCode();
    if (!lang || lang === defaultCode || !records.length) return records;
    const ids = records.map((r) => String(r.id));
    const rows = await this.prisma.translation.findMany({
      where: { locale: lang, entity, entityId: { in: ids } },
    });
    if (!rows.length) return records;
    const index = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const bucket = index.get(row.entityId) ?? {};
      bucket[row.field] = row.value;
      index.set(row.entityId, bucket);
    }
    return records.map((record) => ({ ...record, ...(index.get(String(record.id)) ?? {}) }));
  }

  private async assertExists(id: string) {
    const found = await this.prisma.locale.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('语言不存在');
  }
}
