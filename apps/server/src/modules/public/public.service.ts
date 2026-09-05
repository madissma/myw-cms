import { BadRequestException, Injectable } from '@nestjs/common';
import { SETTING_KEYS } from '../../common/constants/settings';
import { pageParams } from '../../common/utils/pagination.util';
import type { ResourceDef } from '../content/content.registry';
import { ContentService } from '../content/content.service';
import { LocaleService } from '../site/locale.service';
import { SettingService } from '../site/setting.service';
import { ThemeService } from '../site/theme.service';
import { NavService } from '../navigation/nav.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { PageService } from '../page/page.service';
import { PublicCacheService } from './public-cache.service';
import type { PublicListQueryDto } from './dto/public.dto';

/** 前台导航位置，与 NavMenu.position 默认值一致 */
const NAV_POSITIONS = ['header', 'footer'] as const;

@Injectable()
export class PublicService {
  constructor(
    private readonly settings: SettingService,
    private readonly themes: ThemeService,
    private readonly locales: LocaleService,
    private readonly nav: NavService,
    private readonly taxonomy: TaxonomyService,
    private readonly content: ContentService,
    private readonly pages: PageService,
    private readonly cache: PublicCacheService,
  ) {}

  /** 站点骨架：一次请求拿齐 site / theme / nav / taxonomies / locales / settings */
  async bootstrap(lang?: string) {
    return this.cache.wrap(`bootstrap:${lang ?? '-'}`, () => this.buildBootstrap(lang));
  }

  /** 前台整页装修数据（含已解析的 entity_list 与 subNav） */
  async page(key: string, lang?: string) {
    const clean = String(key || '').trim();
    if (!clean) throw new BadRequestException('页面标识不能为空');
    return this.cache.wrap(`page:${clean}:${lang ?? '-'}`, () => this.pages.assemble(clean, lang));
  }

  async list(def: ResourceDef, query: PublicListQueryDto) {
    const { page, pageSize } = pageParams(query);
    const result = await this.content.publicList(def, {
      category: query.category,
      keyword: query.keyword,
      page,
      pageSize,
      where: publicExtraWhere(def, query),
    });
    const list = await this.locales.mergeMany(i18nEntity(def), result.list, query.lang);
    return { ...result, list };
  }

  /** 详情：slug / legacyId / id 三种入参都可命中；经 legacyId 命中时返回 canonicalSlug 供前台改写地址 */
  async detail(def: ResourceDef, slugOrId: string, lang?: string, relatedTake = 3) {
    const row = await this.content.publicDetail(def, slugOrId);
    const merged = (await this.locales.mergeMany(i18nEntity(def), [row], lang))[0];
    const canonicalSlug = def.hasSlug ? merged?.slug ?? null : null;
    const payload: Record<string, any> = {
      ...merged,
      canonicalSlug,
      /** 入参不是语义 slug（旧链接 /news/n1）时为 true，由前台做地址归一 */
      relocated: !!(canonicalSlug && canonicalSlug !== slugOrId),
    };
    if (def.hasSlug) {
      const related = await this.content.related(def, String(merged.slug ?? slugOrId), relatedTake);
      payload.related = await this.locales.mergeMany(i18nEntity(def), related, lang);
    }
    return payload;
  }

  async related(def: ResourceDef, slug: string, lang?: string, take = 3) {
    const rows = await this.content.related(def, slug, take);
    return this.locales.mergeMany(i18nEntity(def), rows, lang);
  }

  async view(def: ResourceDef, idOrSlug: string) {
    return this.content.bumpViews(def, idOrSlug);
  }

  /** 供前台路由表使用的已发布页面清单 */
  async pageKeys() {
    return this.cache.wrap('page-keys', async () => {
      const rows = await this.pages.publishedSummaries();
      return rows.map((r) => ({ key: r.key, name: r.name, path: r.path }));
    });
  }

  private async buildBootstrap(lang?: string) {
    const values = await this.settings.values();
    const [theme, terms, enabledLocales, defaultCode, navEntries] = await Promise.all([
      this.themes.active(),
      this.taxonomy.dict(),
      this.locales.enabled(),
      this.locales.defaultCode(),
      Promise.all(NAV_POSITIONS.map((position) => this.nav.publishedTree(position))),
    ]);

    const nav: Record<string, unknown> = {};
    NAV_POSITIONS.forEach((position, index) => {
      nav[position] = navEntries[index];
    });

    return {
      site: buildSite(values),
      settings: values,
      theme,
      nav,
      taxonomies: terms,
      locales: { list: enabledLocales, default: defaultCode },
      lang: lang && lang !== defaultCode ? lang : defaultCode,
      cacheTtl: this.cache.ttlSec,
      serverTime: new Date().toISOString(),
    };
  }
}

/** 精选 / 热销开关只在该资源确有对应布尔列时生效 */
function publicExtraWhere(def: ResourceDef, query: PublicListQueryDto) {
  const where: Record<string, boolean> = {};
  const bools = def.bools ?? [];
  if (query.featured && bools.includes('isFeatured')) where.isFeatured = true;
  if (query.hot && bools.includes('isHot')) where.isHot = true;
  return where;
}

/**
 * Translation.entity 的取值按规划第 4 节约定为 product | news | timeline 等单词，
 * 与权限前缀 content:<entity> 的 <entity> 一致，因此从 perm 推导而不是用 Prisma delegate 名。
 */
function i18nEntity(def: ResourceDef): string {
  return def.perm.split(':')[1] ?? def.delegate;
}

/** 从 Setting 表挑出品牌 / 联系 / 页脚等离散属性，形成稳定的 site 节点 */
function buildSite(values: Record<string, any>) {
  const pick = (key: string, fallback = '') => (values[key] === undefined || values[key] === null ? fallback : values[key]);
  const year = new Date().getFullYear();
  const copyright = String(pick(SETTING_KEYS.footerCopyright)).replaceAll('{year}', String(year));

  return {
    name: pick(SETTING_KEYS.siteName),
    title: pick(SETTING_KEYS.seoTitle),
    description: pick(SETTING_KEYS.seoDescription),
    keywords: pick(SETTING_KEYS.seoKeywords),
    slogan: pick(SETTING_KEYS.siteSlogan),
    summary: pick(SETTING_KEYS.siteDesc),
    brand: {
      name: pick(SETTING_KEYS.brandName),
      nameEn: pick(SETTING_KEYS.brandNameEn),
      logo: pick(SETTING_KEYS.brandLogo),
      logoImage: pick(SETTING_KEYS.brandLogoImage),
      favicon: pick(SETTING_KEYS.brandFavicon),
      companyName: pick(SETTING_KEYS.brandCompanyName),
      headerEyebrow: pick(SETTING_KEYS.brandHeaderEyebrow),
    },
    contact: {
      address: pick(SETTING_KEYS.contactAddress),
      hotline: pick(SETTING_KEYS.contactHotline),
      consumerHotline: pick(SETTING_KEYS.contactConsumerHotline),
      email: pick(SETTING_KEYS.contactEmail),
      hours: pick(SETTING_KEYS.contactHours),
    },
    footer: {
      about: pick(SETTING_KEYS.footerAbout),
      social: pick(SETTING_KEYS.footerSocial),
      sloganVertical: pick(SETTING_KEYS.footerSloganVertical),
      tagline: pick(SETTING_KEYS.footerTagline),
      copyright,
      icp: pick(SETTING_KEYS.icpNumber),
      police: pick(SETTING_KEYS.policeNumber),
      nameEn: pick(SETTING_KEYS.footerNameEn),
    },
    social: {
      wechat: pick(SETTING_KEYS.socialWechat),
      weibo: pick(SETTING_KEYS.socialWeibo),
      douyin: pick(SETTING_KEYS.socialDouyin),
    },
    analytics: { gaId: pick(SETTING_KEYS.analyticsGaId) },
    form: { successTip: pick(SETTING_KEYS.formSuccessTip) },
  };
}
