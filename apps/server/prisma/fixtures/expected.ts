/**
 * seed 条数基线（规划 10.8 第一道闸门）。
 *
 * 独立成模块的原因：verify 脚本需要同一份期望值，但不能 import seed.ts
 * （那会在加载时直接写库）。所有数字均由 fixtures 派生，不手写常量，
 * 这样改 fixtures 后两条链路的期望值同步变化。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { PERMISSIONS, PRESET_ROLES } from '../../src/common/constants/permissions'
import { SETTINGS } from '../../src/common/constants/settings'
import { LAYOUT_STATS } from './layout'
import { LOCALES, MEDIA_ASSETS, PAGES, TAXONOMIES, THEMES, UI_SETTING_COPY } from './meta'
import { pageConstants } from './pages'

const site = JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf-8')) as {
  products: unknown[]
  news: unknown[]
  reviews: unknown[]
  mallLinks: unknown[]
  contactInfo: Record<string, string>
}

/** header 一级 + 其子锚点 + footer 快捷链接 */
interface NavLike {
  children?: { to: string; label: string }[]
}
const NAV_TOTAL =
  pageConstants.navbar.navItems.reduce((n, item) => n + 1 + ((item as unknown as NavLike).children?.length ?? 0), 0) +
  pageConstants.footer.quickLinks.length

export const EXPECTED_COUNTS: Record<string, number> = {
  Permission: PERMISSIONS.length,
  Role: PRESET_ROLES.length,
  Org: 1,
  User: 1,
  Taxonomy: TAXONOMIES.length,
  Term: TAXONOMIES.reduce((n, tax) => n + tax.terms.length, 0),
  Setting: SETTINGS.length + UI_SETTING_COPY.length,
  Theme: THEMES.length,
  Locale: LOCALES.length,
  NavMenu: NAV_TOTAL,
  Product: site.products.length,
  News: site.news.length,
  Video: pageConstants.media.videos.length,
  Review: site.reviews.length,
  Honor: pageConstants.about.honors.length,
  TimelineEvent: pageConstants.about.timeline.length,
  Page: PAGES.length,
  Section: LAYOUT_STATS.sections,
  Block: LAYOUT_STATS.blocks,
  MediaAsset: MEDIA_ASSETS.length,
}

/** 校验脚本用：分类术语的期望明细 */
export const EXPECTED_TERMS = TAXONOMIES.map((tax) => ({ key: tax.key, count: tax.terms.length }))
