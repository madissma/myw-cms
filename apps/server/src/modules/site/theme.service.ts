import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { readJsonObject, textOrNull } from '../../common/utils/index.util';
import { CreateThemeDto, UpdateThemeDto } from './dto/site.dto';

/** 主题 token 的规范结构：仅这些分组会被前台 applyTheme 消费 */
const TOKEN_GROUPS = ['color', 'font', 'radius', 'shadow'];

/** radius 是标量分组（applyTheme 直接把它写进 --radius），其余分组是对象 */
const SCALAR_GROUPS = new Set(['radius']);

function normalizeTokens(input: unknown): Record<string, any> {
  const src = readJsonObject<Record<string, any>>(input, {});
  const out: Record<string, any> = {};
  for (const group of TOKEN_GROUPS) {
    const value = src[group];
    // 早先这里只放行「对象型」分组，于是字符串型的 radius 在任何一次后台保存中都被静默丢掉，
    // 表现是「圆角填了不生效、卡片上圆角显示为 -」。
    if (SCALAR_GROUPS.has(group)) {
      if (typeof value === 'string' && value.trim()) out[group] = value.trim();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[group] = value;
    }
  }
  if (!out.color) throw new BadRequestException('主题必须包含 color 分组');
  return out;
}

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.theme.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((r) => ({ ...r, tokens: readJsonObject(r.tokens, {}), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  }

  async detail(id: string) {
    const row = await this.prisma.theme.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('主题不存在');
    return { ...row, tokens: readJsonObject(row.tokens, {}) };
  }

  /** 当前生效主题；缺失时回落 isDefault，再回落任意一条，保证前台永远拿得到 token */
  async active() {
    const found =
      (await this.prisma.theme.findFirst({ where: { active: true } })) ??
      (await this.prisma.theme.findFirst({ where: { isDefault: true } })) ??
      (await this.prisma.theme.findFirst({ orderBy: { createdAt: 'asc' } }));
    if (!found) return null;
    return { code: found.code, name: found.name, tokens: readJsonObject<Record<string, any>>(found.tokens, {}) };
  }

  async create(dto: CreateThemeDto) {
    const code = dto.code.trim();
    const hit = await this.prisma.theme.findUnique({ where: { code } });
    if (hit) throw new ConflictException(`主题编码 ${code} 已存在`);
    const total = await this.prisma.theme.count();
    const created = await this.prisma.theme.create({
      data: {
        code,
        name: dto.name.trim(),
        tokens: normalizeTokens(dto.tokens),
        preview: textOrNull(dto.preview),
        remark: textOrNull(dto.remark),
        // 第一条主题即为默认且生效，避免新装站点前台无配色可用
        isDefault: total === 0,
        active: total === 0,
      },
    });
    return this.detail(created.id);
  }

  async update(id: string, dto: UpdateThemeDto) {
    await this.assertExists(id);
    await this.prisma.theme.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        tokens: dto.tokens === undefined ? undefined : normalizeTokens(dto.tokens),
        preview: dto.preview === undefined ? undefined : textOrNull(dto.preview),
        remark: dto.remark === undefined ? undefined : textOrNull(dto.remark),
      },
    });
    return this.detail(id);
  }

  /** 同一时刻仅一个 active；启用非默认主题时保留原 default 以便回退 */
  async activate(id: string) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('主题不存在');
    await this.prisma.$transaction([
      this.prisma.theme.updateMany({ where: { active: true }, data: { active: false } }),
      this.prisma.theme.update({ where: { id }, data: { active: true } }),
    ]);
    return this.detail(id);
  }

  async setDefault(id: string) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('主题不存在');
    await this.prisma.$transaction([
      this.prisma.theme.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      this.prisma.theme.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return this.detail(id);
  }

  async remove(id: string) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('主题不存在');
    if (theme.isDefault) throw new BadRequestException('默认主题不可删除，请先将其他主题设为默认');
    if (theme.active) throw new BadRequestException('请先启用其他主题再删除');
    await this.prisma.theme.delete({ where: { id } });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const found = await this.prisma.theme.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('主题不存在');
  }
}
