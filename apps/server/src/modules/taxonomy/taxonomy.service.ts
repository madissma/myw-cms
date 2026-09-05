import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { pageParams, paginate, searchFilter, slugify, textOrNull } from '../../common/utils/index.util';
import { CONTENT_RESOURCES } from '../content/content.registry';
import { CreateTaxonomyDto, CreateTermDto, TermQueryDto, UpdateTaxonomyDto, UpdateTermDto } from './dto/taxonomy.dto';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Taxonomy ----------

  async listTaxonomies() {
    const list = await this.prisma.taxonomy.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { terms: true } } },
    });
    return list.map(({ _count, ...t }) => ({ ...t, termCount: _count.terms }));
  }

  async createTaxonomy(dto: CreateTaxonomyDto) {
    const key = slugify(dto.key, 'taxonomy');
    if (!key) throw new BadRequestException('分类标识不能为空');
    const hit = await this.prisma.taxonomy.findUnique({ where: { key } });
    if (hit) throw new BadRequestException(`分类标识 ${key} 已存在`);
    return this.prisma.taxonomy.create({
      data: { key, name: dto.name.trim(), remark: textOrNull(dto.remark), sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateTaxonomy(id: string, dto: UpdateTaxonomyDto) {
    await this.mustFindTaxonomy(id);
    return this.prisma.taxonomy.update({
      where: { id },
      data: { name: dto.name?.trim(), remark: dto.remark === undefined ? undefined : textOrNull(dto.remark), sortOrder: dto.sortOrder },
    });
  }

  async removeTaxonomy(id: string) {
    const tax = await this.mustFindTaxonomy(id, { terms: { select: { slug: true } } });
    const used = await this.usedTermSlugs(tax.terms.map((t) => t.slug));
    if (used.length) throw new BadRequestException(`该分类下仍有 ${used.length} 条内容在使用，请先调整内容再删除`);
    return this.prisma.taxonomy.delete({ where: { id } });
  }

  // ---------- Term ----------

  async listTerms(query: TermQueryDto) {
    const { page, pageSize } = pageParams(query);
    const where: any = {};

    if (query.taxonomyId) where.taxonomyId = query.taxonomyId;
    else if (query.taxonomyKey) {
      const tax = await this.prisma.taxonomy.findUnique({ where: { key: query.taxonomyKey } });
      if (!tax) throw new NotFoundException(`分类 ${query.taxonomyKey} 不存在`);
      where.taxonomyId = tax.id;
    }
    if (query.status !== undefined) where.status = query.status;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['name', 'slug', 'nameEn'], kw);

    const [list, total] = await Promise.all([
      this.prisma.term.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { sortOrder: 'asc' }, include: { taxonomy: true } }),
      this.prisma.term.count({ where }),
    ]);
    return paginate(list, total, page, pageSize);
  }

  /** 前台/后台下拉用的扁平字典：{ product_category: [{slug,name}], ... } */
  async dict() {
    const list = await this.prisma.term.findMany({
      where: { status: 1 },
      include: { taxonomy: true },
      orderBy: [{ taxonomy: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    const dict: Record<string, any[]> = {};
    for (const t of list) {
      dict[t.taxonomy.key] = dict[t.taxonomy.key] || [];
      dict[t.taxonomy.key].push({
        slug: t.slug,
        name: t.name,
        nameEn: t.nameEn,
        anchor: t.anchor,
        url: t.url,
        image: t.image,
        remark: t.remark,
        sortOrder: t.sortOrder,
      });
    }
    return dict;
  }

  async createTerm(dto: CreateTermDto) {
    const tax = await this.prisma.taxonomy.findUnique({ where: { key: dto.taxonomyKey } });
    if (!tax) throw new NotFoundException(`分类 ${dto.taxonomyKey} 不存在`);
    const slug = slugify(dto.slug || dto.name, 'term');
    const hit = await this.prisma.term.findUnique({ where: { taxonomyId_slug: { taxonomyId: tax.id, slug } } });
    if (hit) throw new BadRequestException(`术语标识 ${slug} 在该分类下已存在`);

    return this.prisma.term.create({
      data: {
        taxonomyId: tax.id,
        slug,
        name: dto.name.trim(),
        nameEn: textOrNull(dto.nameEn),
        anchor: textOrNull(dto.anchor),
        url: textOrNull(dto.url),
        image: textOrNull(dto.image),
        remark: textOrNull(dto.remark),
        sortOrder: dto.sortOrder ?? (await this.nextTermSort(tax.id)),
        status: dto.status ?? 1,
      },
      include: { taxonomy: true },
    });
  }

  async updateTerm(id: string, dto: UpdateTermDto) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('术语不存在');

    const slug = dto.slug === undefined ? undefined : slugify(dto.slug, 'term');
    if (slug && slug !== term.slug) {
      const hit = await this.prisma.term.findUnique({ where: { taxonomyId_slug: { taxonomyId: term.taxonomyId, slug } } });
      if (hit) throw new BadRequestException(`术语标识 ${slug} 已存在`);
      await this.repointContent(term.slug, slug, term.taxonomyId);
    }

    return this.prisma.term.update({
      where: { id },
      data: {
        slug: slug ?? undefined,
        name: dto.name?.trim(),
        nameEn: dto.nameEn === undefined ? undefined : textOrNull(dto.nameEn),
        anchor: dto.anchor === undefined ? undefined : textOrNull(dto.anchor),
        url: dto.url === undefined ? undefined : textOrNull(dto.url),
        image: dto.image === undefined ? undefined : textOrNull(dto.image),
        remark: dto.remark === undefined ? undefined : textOrNull(dto.remark),
        sortOrder: dto.sortOrder,
        status: dto.status,
      },
      include: { taxonomy: true },
    });
  }

  async setStatus(id: string, status: number) {
    await this.mustFindTerm(id);
    return this.prisma.term.update({ where: { id }, data: { status } });
  }

  async resort(ids: string[]) {
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.term.update({ where: { id }, data: { sortOrder: i + 1 } })));
    return { updated: ids.length };
  }

  async removeTerm(id: string) {
    const term = await this.mustFindTerm(id);
    const used = await this.usedTermSlugs([term.slug]);
    if (used.length) throw new BadRequestException(`该术语正被 ${used.length} 条内容引用，无法删除；可先改为「禁用」`);
    return this.prisma.term.delete({ where: { id } });
  }

  // ---------- helpers ----------

  private async mustFindTaxonomy(id: string, include?: any) {
    const tax = await this.prisma.taxonomy.findUnique({ where: { id }, include });
    if (!tax) throw new NotFoundException('分类不存在');
    return tax;
  }

  private async mustFindTerm(id: string) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('术语不存在');
    return term;
  }

  private async nextTermSort(taxonomyId: string) {
    const last = await this.prisma.term.findMany({ where: { taxonomyId }, orderBy: { sortOrder: 'desc' }, take: 1 });
    return (last[0]?.sortOrder ?? 0) + 1;
  }

  /** 统计一批 slug 被多少条内容引用 */
  private async usedTermSlugs(slugs: string[]) {
    if (!slugs.length) return [];
    const out: { slug: string; model: string; count: number }[] = [];
    for (const def of CONTENT_RESOURCES) {
      if (!def.categoryOf) continue;
      const taxonomy = await this.prisma.taxonomy.findUnique({
        where: { key: def.categoryOf.taxonomy },
        include: { terms: { where: { slug: { in: slugs } }, select: { slug: true } } },
      });
      const targets = taxonomy?.terms.map((t) => t.slug) ?? [];
      if (!targets.length) continue;
      const count = await (this.prisma as any)[def.delegate].count({ where: { [def.categoryOf.field]: { in: targets } } });
      if (count) out.push(...targets.map((slug) => ({ slug, model: def.delegate, count })));
    }
    return out;
  }

  /** 改 slug 时同步内容表里的 categorySlug，避免出现孤儿分类 */
  private async repointContent(oldSlug: string, newSlug: string, taxonomyId: string) {
    const taxonomy = await this.prisma.taxonomy.findUnique({ where: { id: taxonomyId } });
    if (!taxonomy) return;
    const defs = CONTENT_RESOURCES.filter((d) => d.categoryOf?.taxonomy === taxonomy.key);
    for (const def of defs) {
      await (this.prisma as any)[def.delegate].updateMany({
        where: { [def.categoryOf.field]: oldSlug },
        data: { [def.categoryOf.field]: newSlug },
      });
    }
  }
}
