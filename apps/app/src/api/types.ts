/**
 * 前台 API 契约类型：与 server/src/modules/public 的返回结构逐项对应。
 *
 * 刻意不引入代码生成 —— 字段以后端为准，改动时两处一起改；
 * 这里只声明前台真正读到的部分，多余字段用索引签名放行，避免详情页频繁报错。
 */

// ==================== 站点骨架 ====================

export interface BrandConfig {
  name: string
  nameEn: string
  logo: string
  logoImage: string
  favicon: string
  companyName: string
  headerEyebrow: string
}

export interface ContactConfig {
  address: string
  hotline: string
  consumerHotline: string
  email: string
  hours: string
}

export interface FooterConfig {
  about: string
  social: string
  sloganVertical: string
  tagline: string
  copyright: string
  icp: string
  police: string
  nameEn: string
}

/** bootstrap.site：由 Setting 表挑出的常用属性，见 server 的 buildSite() */
export interface SiteConfig {
  name: string
  title: string
  description: string
  keywords: string
  slogan: string
  summary: string
  brand: BrandConfig
  contact: ContactConfig
  footer: FooterConfig
  social: { wechat: string; weibo: string; douyin: string }
  analytics: { gaId: string }
  form: { successTip: string }
}

export interface ThemeTokens {
  color: Record<string, string>
  font: Record<string, string>
  radius?: string
}

export interface ThemePayload {
  id: string
  code: string
  name: string
  tokens: ThemeTokens
  isDefault?: boolean
  active?: boolean
  preview?: string | null
}

export interface NavNode {
  id: string
  navKey?: string | null
  label: string
  labelEn?: string | null
  path: string
  icon?: string | null
  target?: string
  sortOrder?: number
  children?: NavNode[]
}

/** 术语：分类筛选、商城渠道、剂型标签都从这里取 */
export interface TermNode {
  id: string
  slug: string
  name: string
  nameEn?: string | null
  anchor?: string | null
  url?: string | null
  image?: string | null
  remark?: string | null
  sortOrder: number
}

export type TaxonomyDict = Record<string, TermNode[]>

export interface LocaleOption {
  id: string
  code: string
  name: string
  nativeName: string
  isDefault: boolean
  active: boolean
}

export interface Bootstrap {
  site: SiteConfig
  /** Setting 全量键值（含 ui.* 这类组件内固定文案） */
  settings: Record<string, unknown>
  theme: ThemePayload | null
  nav: { header: NavNode[]; footer: NavNode[] }
  taxonomies: TaxonomyDict
  locales: { list: LocaleOption[]; default: string }
  lang: string
  cacheTtl?: number
  serverTime?: string
}

// ==================== 页面装修 ====================

/** 区块内容项：entity_list 由服务端解析后注入，内联区块来自 Block.props.items */
export interface BlockItem {
  id?: string
  slug?: string
  title?: string
  image?: string | null
  date?: string | null
  /** 实体原始字段（name / summary / params / year / url ...）原样带出 */
  [key: string]: unknown
}

export interface BlockPayload {
  id: string
  code: string
  type: string
  title?: string | null
  columns?: number | null
  /**
   * 内联数据或已解析的 items。
   * 17 种区块各有自己的 props 结构（服务端 block.schema.ts 只约束必填项），
   * 逐字段建模会把「后台新增一种区块类型」变成必须改类型定义的事，故此处保留松散取值。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>
  /** entity_list 的数据源，服务端已按它解析出 props.items，前台仅用于选版式 */
  source?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme?: Record<string, any> | null
  sortOrder?: number
}

export interface SectionPayload {
  id: string
  anchor: string
  label: string
  eyebrow?: string | null
  title?: string | null
  subtitle?: string | null
  variant?: string | null
  showInSubNav?: boolean
  sortOrder: number
  blocks: BlockPayload[]
}

export interface PageRecord {
  id: string
  key: string
  name: string
  path: string
  heroTitle?: string | null
  heroSubtitle?: string | null
  heroEn?: string | null
  heroImage?: string | null
  body?: string | null
  seoTitle?: string | null
  seoKeywords?: string | null
  seoDescription?: string | null
}

export interface PagePayload {
  page: PageRecord
  sections: SectionPayload[]
  subNav: { anchor: string; label: string; title?: string | null }[]
}

// ==================== 内容实体 ====================

export interface ListResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface PairItem {
  label: string
  value: string
}

export interface Product {
  id: string
  slug: string
  legacyId?: string | null
  name: string
  nameEn?: string | null
  categorySlug: string
  tag?: string | null
  tagline?: string | null
  summary?: string | null
  description?: string | null
  image?: string | null
  /** 服务端对空 JSON 字段会给 null（不是空数组），前台取值一律用 `?? []` 容错 */
  images?: string[] | null
  params?: PairItem[] | null
  certs?: string[] | null
  features?: string[] | null
  audiences?: string[] | null
  spec?: string | null
  usage?: string | null
  shopUrl?: string | null
  isFeatured?: boolean
  isHot?: boolean
  sortOrder?: number
  status?: number
  publishedAt?: string | null
  canonicalSlug?: string
  relocated?: boolean
  related?: Product[]
  [key: string]: unknown
}

export interface News {
  id: string
  slug: string
  legacyId?: string | null
  title: string
  categorySlug: string
  summary?: string | null
  paragraphs?: string[] | null
  bodyHtml?: string | null
  cover?: string | null
  author?: string | null
  source?: string | null
  views?: number
  isTop?: boolean
  publishedAt?: string | null
  canonicalSlug?: string
  relocated?: boolean
  related?: News[]
  [key: string]: unknown
}

export interface Video {
  id: string
  code?: string | null
  title: string
  duration?: string | null
  description?: string | null
  poster?: string | null
  url?: string | null
  categorySlug?: string | null
  [key: string]: unknown
}

export interface Review {
  id: string
  code?: string | null
  customerName: string
  location?: string | null
  role?: string | null
  product?: string | null
  content: string
  avatar?: string | null
  rating?: number | null
  isAuthorized?: boolean
  [key: string]: unknown
}

export interface Honor {
  id: string
  code?: string | null
  name: string
  issuer?: string | null
  year?: string | null
  image?: string | null
  certNo?: string | null
  [key: string]: unknown
}

export interface TimelineEvent {
  id: string
  code?: string | null
  year: string
  eventDate?: string | null
  title?: string | null
  content: string
  [key: string]: unknown
}

/** 前台列表接口的资源标识，与 PUBLIC_CONTENT_ROUTES 一致 */
export type ContentKey = 'products' | 'news' | 'videos' | 'reviews' | 'honors' | 'timeline'

/** 带 slug 的可跳转实体 */
export type SlugEntity = Product | News

export interface ListQuery {
  category?: string
  keyword?: string
  featured?: boolean
  hot?: boolean
  page?: number
  pageSize?: number
  lang?: string
}

// ==================== 留言 ====================

export interface MessagePayload {
  name: string
  phone: string
  email?: string
  type?: string
  content: string
  /** 蜜罐字段，真人永远留空 */
  website?: string
}

export interface MessageResult {
  id?: string
  tip?: string
  [key: string]: unknown
}

// ==================== 静态兜底快照 ====================

/** data/fallback.ts 的形状，字段与接口返回一致（由 server/scripts/dump-app-fallback.mts 生成） */
export interface FallbackSnapshot {
  bootstrap: Bootstrap
  lists: Record<string, ListResult<unknown>>
  pages: Record<string, PagePayload>
}
