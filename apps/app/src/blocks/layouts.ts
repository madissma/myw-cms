/**
 * 版式表：把「数据里没有、但决定视觉」的排布集中一处维护。
 *
 * 后端只存内容与配色（Section.variant / Block.columns），而现网存在
 * 「标题在左 / 图在左 / 标题居中」三类交错版式，无法从数据反推，
 * 故在此按 `page:anchor` 与 `page:anchor:code` 登记一次；
 * 未在表内的栏目（含后台新增的 Section / Block）走默认堆叠版式，内容照样渲染，不会丢。
 */
import type { Tone } from './types'

/** grid 单元格里出现的特殊标记 */
export const HEADING_CELL = '#'
export const REST_CELL = '*'

/** 深色栏目（绿 / 墨绿底）内的区块统一走 dark 形态 */
export function toneOf(variant?: string | null): Tone {
  return variant === 'forest-dark' || variant === 'forest' ? 'dark' : 'light'
}

export type HeadingMode = 'left' | 'center' | 'none'

export interface GridSpec {
  /** 分栏容器 class，默认 lg:grid-cols-2 垂直居中 */
  class?: string
  /** 分栏容器相对上方标题的间距，标题在栏外时才用 */
  topClass?: string
  /** 左栏 class，用于 col-span 微调 */
  leftClass?: string
  /** 右栏 class */
  rightClass?: string
  /** 左右栏内部的块间距，默认 space-y-6 */
  leftSpace?: string
  rightSpace?: string
  /** 左右栏内容：区块 code，'#' 代表标题区，'*' 代表未列出的其余区块 */
  left: string[]
  right: string[]
  /** 排在分栏之后的全宽区块 */
  below?: string[]
  belowSpace?: string
}

export interface SectionLayoutSpec {
  /** 标题区形态，默认取 section.eyebrow/title 是否存在 */
  heading?: HeadingMode
  /** 该区块的 buttonText/buttonUrl 提到标题行右侧（默认取首个带按钮的 entity_list） */
  moreFrom?: string
  grid?: GridSpec
  /** 外层留白：有背景色的栏目加在 <section> 上，纯底色栏目加在内层容器上 */
  className?: string
  /** 标题区与内容区之间的间距，默认 mt-14 */
  contentClass?: string
  /** 无分栏时区块之间的间距 */
  space?: string
  /** 内层容器 class，默认 mx-auto max-w-7xl px-5 lg:px-8 */
  width?: string
  /** 区块自己铺满整屏（首屏轮播），不套容器 */
  bare?: boolean
  /** 底色由区块自带（如 B2B 深色横幅），栏目不铺满视口 */
  flat?: boolean
}

export const DEFAULT_WIDTH = 'mx-auto max-w-7xl px-5 lg:px-8'

const TWO_COL = 'grid items-center gap-14 lg:grid-cols-2'

export const SECTION_LAYOUT: Record<string, SectionLayoutSpec> = {
  // ---------------- home ----------------
  'home:hero': { heading: 'none', bare: true },
  'home:stats': { heading: 'none', className: 'py-12' },
  'home:about': {
    heading: 'left',
    className: 'py-24',
    grid: {
      class: TWO_COL,
      left: [HEADING_CELL],
      right: ['intro', 'founderCard'],
      rightSpace: 'space-y-5',
      below: ['techTags'],
      belowSpace: 'mt-14',
    },
  },
  'home:products': { heading: 'left', className: 'py-24' },
  'home:base': {
    heading: 'left',
    className: 'py-24',
    grid: { class: TWO_COL, left: ['gallery'], right: [HEADING_CELL, 'intro', 'points', 'cta'], rightSpace: 'space-y-8' },
  },
  'home:news': { heading: 'left', className: 'py-24', contentClass: 'mt-12' },
  'home:mall': { heading: 'center', className: 'py-24', contentClass: 'mt-12', space: 'space-y-12' },

  // ---------------- about（位于内容栏内，段间距用 mt） ----------------
  'about:intro': {
    heading: 'left',
    grid: {
      class: 'grid items-start gap-14 lg:grid-cols-5',
      leftClass: 'lg:col-span-2',
      rightClass: 'lg:col-span-3',
      left: [HEADING_CELL, 'founderQuote'],
      leftSpace: 'space-y-8',
      right: ['body'],
      below: ['advantages'],
    },
  },
  'about:history': { heading: 'center', className: 'mt-24 py-20 lg:mt-28', width: 'mx-auto max-w-3xl' },
  'about:culture': { heading: 'center', className: 'mt-24' },
  'about:honors': { heading: 'center', className: 'mt-24 py-20' },
  'about:base': {
    heading: 'left',
    className: 'mt-24',
    grid: {
      class: TWO_COL,
      left: ['gallery'],
      right: [HEADING_CELL, 'intro', 'stats', 'points', 'cta'],
      rightSpace: 'space-y-8',
    },
  },

  // ---------------- tech ----------------
  'tech:rd': { heading: 'center', className: 'py-20' },
  'tech:lines': {
    heading: 'left',
    className: 'py-24',
    grid: { class: TWO_COL, left: ['banner'], right: [HEADING_CELL, 'processes'], rightSpace: 'space-y-8' },
  },
  'tech:dosage': {
    heading: 'left',
    className: 'py-20',
    grid: {
      class: TWO_COL,
      left: [HEADING_CELL, 'intro', 'forms'],
      leftSpace: 'space-y-8',
      right: ['photo'],
    },
  },
  'tech:coop': {
    heading: 'center',
    className: 'py-24',
    grid: { class: TWO_COL, left: ['photo'], right: ['projects', 'note'], rightSpace: 'space-y-5' },
  },
  'tech:team': {
    heading: 'left',
    className: 'py-20',
    grid: { class: TWO_COL, left: ['photo'], right: [HEADING_CELL, 'intro'] },
  },

  // ---------------- products ----------------
  // 现网两节同属一个 <section>（筛选条 py-10 / 列表 pb-20 / 横幅 mt-20），
  // 拆成两个栏目后按 5rem 还原间距
  'products:list': { heading: 'none' },
  'products:b2b': { heading: 'none', className: 'pt-20 pb-20', flat: true },

  // ---------------- media ----------------
  'media:videos': { heading: 'center', className: 'py-20' },
  'media:news': { heading: 'left', className: 'py-24', contentClass: 'mt-12' },

  // ---------------- voice ----------------
  'voice:stats': { heading: 'none', className: 'py-16', width: 'mx-auto max-w-6xl px-5 lg:px-8' },
  'voice:reviews': { heading: 'center', className: 'py-24' },

  // ---------------- mall ----------------
  'mall:platforms': { heading: 'none', className: 'py-16' },
  'mall:guarantees': { heading: 'none', className: 'py-16', width: 'mx-auto max-w-6xl px-5 lg:px-8' },
  'mall:hot': { heading: 'center', className: 'py-20' },
  // 现网底部引导挂在热销区末尾（mt-14），拆栏后按 3.5rem / 5rem 还原
  'mall:foot': { heading: 'none', className: 'pt-14 pb-20' },

  // ---------------- contact ----------------
  // info / form 两节由 Contact.tsx 合成一个 5 栏栅格（2 + 3），这里只登记栏内间距
  'contact:info': { heading: 'none', space: 'space-y-6' },
  'contact:form': { heading: 'none' },
  'contact:map': { heading: 'center', className: 'py-20', space: 'space-y-12' },
}

/** 区块版式微调，见各组件内 switch */
export const BLOCK_APPEARANCE: Record<string, string> = {
  'home:about:founderCard': 'card',
  'home:base:gallery': 'overlap',
  'home:base:points': 'boxed',
  'home:base:cta': 'link',
  'home:mall:channels': 'channel',
  'home:mall:cta': 'center',
  'home:news:latest': 'card',
  'home:products:featured': 'featured',

  'about:intro:founderQuote': 'aside',
  'about:intro:advantages': 'number',
  'about:base:gallery': 'mosaic',
  'about:base:points': 'rule',
  'about:base:cta': 'link',

  'tech:rd:labs': 'icon',
  'tech:lines:banner': 'banner',
  'tech:dosage:photo': 'banner',
  'tech:coop:photo': 'banner',
  'tech:coop:note': 'note',
  'tech:team:photo': 'banner',

  'products:list:all': 'catalog',
  'products:b2b:band': 'band',

  'media:videos:videos': 'video',
  'media:news:list': 'row',

  'voice:reviews:list': 'review',
  'voice:reviews:foot': 'center',

  'mall:platforms:channels': 'channel',
  'mall:guarantees:items': 'icon-inline',
  'mall:hot:products': 'hot',
  'mall:foot:band': 'panel',

  'contact:info:channels': 'contact',
  'contact:info:wechat': 'plain',
}

export function sectionLayout(page: string, anchor: string): SectionLayoutSpec {
  return SECTION_LAYOUT[`${page}:${anchor}`] ?? {}
}

export function blockAppearance(page: string, section: string, code: string): string | undefined {
  return BLOCK_APPEARANCE[`${page}:${section}:${code}`]
}

export { DEFAULT_WIDTH as CONTAINER_WIDTH }
