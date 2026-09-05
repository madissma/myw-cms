import { Fragment, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router'
import Reveal from '../components/Reveal'
import type { BlockPayload, SectionPayload } from '../api/types'
import CardGrid from './CardGrid'
import ContactForm from './ContactForm'
import CtaBand from './CtaBand'
import CultureGrid from './CultureGrid'
import EntityList from './EntityList'
import FeatureList from './FeatureList'
import Gallery from './Gallery'
import HeroSlider from './HeroSlider'
import ImageSplit from './ImageSplit'
import ImageText from './ImageText'
import MapSketch from './MapSketch'
import NumberedList from './NumberedList'
import Quote from './Quote'
import ResearchList from './ResearchList'
import Richtext from './Richtext'
import StatGrid from './StatGrid'
import TagCloud from './TagCloud'
import {
  DEFAULT_WIDTH,
  HEADING_CELL,
  REST_CELL,
  blockAppearance,
  sectionLayout,
  toneOf,
  type HeadingMode,
  type SectionLayoutSpec,
} from './layouts'
import type { BlockComponentProps, Tone } from './types'
import { itemText, splitLines } from './types'

/** 区块类型 -> 组件，与服务端 block.schema.ts 的 17 种类型一一对应 */
const REGISTRY: Record<string, ComponentType<BlockComponentProps>> = {
  hero_slider: HeroSlider,
  stat_grid: StatGrid,
  card_grid: CardGrid,
  culture_grid: CultureGrid,
  numbered_list: NumberedList,
  research_list: ResearchList,
  gallery: Gallery,
  image_text: ImageText,
  image_split: ImageSplit,
  richtext: Richtext,
  quote: Quote,
  cta_band: CtaBand,
  tag_cloud: TagCloud,
  feature_list: FeatureList,
  map_sketch: MapSketch,
  entity_list: EntityList,
  contact_form: ContactForm,
}

function variantClass(variant?: string | null): string {
  switch (variant) {
    case 'forest-dark':
      return 'bg-forest-deep text-cream'
    case 'forest':
      return 'bg-forest text-cream'
    case 'cream-deep':
      return 'bg-cream-deep/60'
    default:
      return ''
  }
}

interface BlockContext {
  page: string
  section: string
  tone: Tone
}

/** 单个区块：查表取组件，按 page:anchor:code 取版式微调；未知类型不渲染也不报错 */
function renderBlock(block: BlockPayload | undefined, ctx: BlockContext): ReactNode {
  if (!block) return null
  const Comp = REGISTRY[block.type]
  if (!Comp) return null
  const appearance = blockAppearance(ctx.page, ctx.section, block.code)
  return <Comp key={block.id || block.code} block={block} tone={ctx.tone} appearance={appearance} />
}

function headingModeOf(layout: SectionLayoutSpec, section: SectionPayload): HeadingMode {
  if (layout.heading) return layout.heading
  return section.eyebrow || section.title ? 'left' : 'none'
}

/** 标题区：眉标 + 主标题（支持 \n 断行）+ 副标题 */
function SectionHeading({ section, mode, tone }: { section: SectionPayload; mode: HeadingMode; tone: Tone }) {
  const { eyebrow, title, subtitle } = section
  if (!eyebrow && !title && !subtitle) return null
  const centered = mode === 'center'
  const lines = splitLines(title)
  const dark = tone === 'dark'
  return (
    <Reveal>
      <div className={centered ? 'text-center' : undefined}>
        {eyebrow && (
          <div
            className={`gold-rule text-sm tracking-[0.4em] ${centered ? 'justify-center ' : ''}${
              dark ? 'text-gold-light' : 'text-gold'
            }`}
          >
            <span>{eyebrow}</span>
          </div>
        )}
        {title && (
          <h2
            className={`mt-5 font-serif-sc text-3xl font-semibold tracking-wider lg:text-4xl ${
              dark ? 'text-cream' : 'text-forest'
            } ${lines.length > 1 ? 'leading-snug' : ''}`}
          >
            {lines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
        )}
        {subtitle &&
          (dark ? (
            <p className={`mt-4 max-w-2xl text-sm leading-7 text-cream/65 ${centered ? 'mx-auto' : ''}`}>{subtitle}</p>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">{subtitle}</p>
          ))}
      </div>
    </Reveal>
  )
}

/** entity_list 上的 buttonText/buttonUrl 提升到标题行右侧，与现网「查看全部产品 →」位置一致 */
function moreLinkOf(section: SectionPayload, layout: SectionLayoutSpec) {
  const candidates = layout.moreFrom
    ? section.blocks.filter((block) => block.code === layout.moreFrom)
    : section.blocks.filter((block) => block.type === 'entity_list')
  for (const block of candidates) {
    const text = itemText(block.props, 'buttonText')
    const url = itemText(block.props, 'buttonUrl')
    if (text && url) return { text, url }
  }
  return null
}

function HeadingRow({
  section,
  mode,
  tone,
  more,
  extra,
}: {
  section: SectionPayload
  mode: HeadingMode
  tone: Tone
  more?: { text: string; url: string } | null
  extra?: ReactNode
}) {
  const heading = <SectionHeading section={section} mode={mode} tone={tone} />
  if (!more && !extra) return mode === 'none' ? null : heading
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      {heading}
      {(more || extra) && (
        <Reveal delay={120}>
          {more ? (
            <Link
              to={more.url}
              className={`link-line text-sm tracking-widest ${tone === 'dark' ? 'text-gold-light' : 'text-gold'}`}
            >
              {more.text}
            </Link>
          ) : (
            extra
          )}
        </Reveal>
      )}
    </div>
  )
}

/**
 * 栏目内容：按版式表把标题与区块摆进「单列 / 分栏 / 栏下」三类位置。
 * 未登记版式的栏目（含后台新增）走默认堆叠，区块一律不丢。
 */
export function SectionInner({
  page,
  section,
  toneOverride,
  more,
}: {
  page: string
  section: SectionPayload
  toneOverride?: Tone
  /** 标题行右侧的自定义内容，传了就压过区块里提升出来的「更多」链接 */
  more?: ReactNode
}) {
  const layout = sectionLayout(page, section.anchor)
  const tone = toneOverride ?? toneOf(section.variant)
  const blocks = section.blocks
  const ctx: BlockContext = { page, section: section.anchor, tone }
  const mode = headingModeOf(layout, section)
  const autoMore = mode === 'none' || more ? null : moreLinkOf(section, layout)
  const headingNode =
    mode === 'none' ? null : (
      <HeadingRow section={section} mode={mode} tone={tone} more={autoMore} extra={more} />
    )

  const byCode = new Map(blocks.map((block) => [block.code, block]))
  const grid = layout.grid
  if (!grid) {
    const content = blocks.map((block) => renderBlock(block, ctx))
    if (!headingNode) return <div className={layout.space ?? 'space-y-14'}>{content}</div>
    // 有 contentClass 时标题与内容分两层控制间距，否则一并交给 space
    if (!layout.contentClass)
      return (
        <div className={layout.space ?? 'space-y-14'}>
          {headingNode}
          {content}
        </div>
      )
    return (
      <>
        {headingNode}
        <div className={layout.contentClass}>
          <div className={layout.space ?? 'space-y-14'}>{content}</div>
        </div>
      </>
    )
  }

  const placed = new Set([...grid.left, ...grid.right, ...(grid.below ?? [])].filter(isCode))
  const rest = blocks.filter((block) => !placed.has(block.code))
  const hasRest = [...grid.left, ...grid.right, ...(grid.below ?? [])].includes(REST_CELL)
  // 未被版式提及的区块（后台新增 / 改了 code）附到右栏末尾，不丢内容
  const tail = hasRest || !rest.length ? null : rest.map((block) => renderBlock(block, ctx))
  const cells = (codes: string[]): ReactNode[] => {
    const nodes: ReactNode[] = []
    codes.forEach((code, i) => {
      if (code === HEADING_CELL) {
        if (headingNode) nodes.push(<Fragment key={`heading-${i}`}>{headingNode}</Fragment>)
        return
      }
      if (code === REST_CELL) {
        for (const block of rest) nodes.push(renderBlock(block, ctx))
        return
      }
      const node = renderBlock(byCode.get(code), ctx)
      if (node) nodes.push(node)
    })
    return nodes
  }
  const column = (codes: string[], className: string | undefined, space: string | undefined, extra: ReactNode[]) => (
    <div className={`${className ?? ''} ${space ?? 'space-y-6'}`.trim()}>
      {cells(codes)}
      {extra}
    </div>
  )
  const headingInside = grid.left.includes(HEADING_CELL) || grid.right.includes(HEADING_CELL)
  const belowCodes = grid.below ?? []

  return (
    <>
      {!headingInside && headingNode}
      <div
        className={`${grid.class ?? 'grid items-center gap-14 lg:grid-cols-2'} ${
          headingInside ? '' : layout.contentClass ?? 'mt-14'
        }`.trim()}
      >
        {column(
          grid.left,
          grid.leftClass,
          grid.leftSpace,
          grid.right.length ? [] : (tail ?? []),
        )}
        {grid.right.length ? column(grid.right, grid.rightClass, grid.rightSpace, tail ?? []) : null}
      </div>
      {belowCodes.length > 0 && (
        <div className={`${grid.belowSpace ?? 'mt-14'} space-y-14`}>{cells(belowCodes)}</div>
      )}
    </>
  )
}

function isCode(value: string): boolean {
  return value !== HEADING_CELL && value !== REST_CELL
}

export interface SectionViewProps {
  page: string
  section: SectionPayload
  /** 标题行右侧的自定义内容（如媒体中心的分类计数） */
  more?: ReactNode
  /** 只铺内容列，不套容器（关于页正文栏内的栏目） */
  contained?: boolean
  /** 附加在外层 <section> 上的 class */
  className?: string
}

/** 栏目外壳：底色 / 纹理 / 留白 / 锚点 id，其余交给 SectionInner */
export function SectionView({ page, section, more, contained, className }: SectionViewProps) {
  const layout = sectionLayout(page, section.anchor)
  const flat = layout.flat === true
  const textured = !flat && section.blocks.some((block) => block.theme?.texture === true)
  const bg = flat ? '' : variantClass(section.variant)

  // 首屏轮播自己铺满整屏，不再套 section / 容器
  if (layout.bare) {
    return section.blocks.map((block) => renderBlock(block, { page, section: section.anchor, tone: 'dark' }))
  }

  const body = (
    <SectionInner page={page} section={section} toneOverride={flat ? 'light' : undefined} more={more} />
  )

  if (contained) {
    // 正文栏内的栏目：容器由页面提供，但底色 / 纹理 / 限宽仍需保留（关于页发展历程）
    return (
      <section
        id={section.anchor}
        className={`scroll-mt-28 ${bg} ${textured ? 'grain' : ''} ${layout.className ?? ''} ${className ?? ''}`.trim()}
      >
        {layout.width ? <div className={layout.width}>{body}</div> : body}
      </section>
    )
  }

  // 无底色的栏目把留白落在内层容器上，等价于现网「section 即容器」的写法
  const spacing = bg ? layout.className ?? '' : ''
  const innerSpacing = bg ? '' : layout.className ?? ''
  return (
    <section
      id={section.anchor}
      className={`scroll-mt-28 ${bg} ${textured ? 'grain' : ''} ${spacing} ${className ?? ''}`.trim()}
    >
      <div className={`${layout.width ?? DEFAULT_WIDTH} ${innerSpacing}`.trim()}>{body}</div>
    </section>
  )
}

/** 供页面直接渲染单个区块（如产品中心过滤后的列表） */
export function BlockView({
  block,
  page,
  section,
  tone = 'light',
}: {
  block: BlockPayload
  page: string
  section: string
  tone?: Tone
}) {
  return renderBlock(block, { page, section, tone })
}