import { Link } from 'react-router'
import { ExternalLink, Film, Play, Quote as QuoteIcon } from 'lucide-react'
import Reveal from '../components/Reveal'
import { useSite } from '../store/site'
import { CtaLink } from './CtaBand'
import { itemText, toItems, type BlockComponentProps } from './types'

/** 未登记版式时按数据源选默认形态（timeline / honor 靠这条规则，无需逐个登记） */
const DEFAULT_APPEARANCE: Record<string, string> = {
  product: 'hot',
  news: 'card',
  video: 'video',
  review: 'review',
  honor: 'honor',
  timeline: 'timeline',
  term: 'channel',
}

function gridClass(mode: string, columns: number): string {
  if (mode === 'card' || mode === 'channel') return columns >= 3 ? 'grid gap-6 md:grid-cols-3' : 'grid gap-6 md:grid-cols-2'
  if (mode === 'honor') return 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4'
  if (mode === 'hot') return columns >= 5 ? 'grid gap-8 md:grid-cols-2 lg:grid-cols-5' : 'grid gap-8 md:grid-cols-2 lg:grid-cols-4'
  return columns >= 5
    ? 'grid gap-8 md:grid-cols-2 lg:grid-cols-5'
    : columns === 4
      ? 'grid gap-8 md:grid-cols-2 lg:grid-cols-4'
      : columns === 2
        ? 'grid gap-8 md:grid-cols-2'
        : 'grid gap-8 md:grid-cols-2 lg:grid-cols-3'
}

/**
 * 实体集合：后端 BlockAssembler 已把 { source, query } 解析为 props.items，
 * 这里只负责按业务形态渲染，十种版式对应现网十处列表。
 */
export default function EntityList({ block, tone, appearance }: BlockComponentProps) {
  const { termName, setting } = useSite()
  const items = toItems(block.props.items)
  if (!items.length) return null

  const source = block.source ?? 'product'
  const mode = appearance ?? DEFAULT_APPEARANCE[source] ?? 'card'
  const columns = block.columns ?? 3
  const dark = tone === 'dark'

  // ---------------- 深色产品卡（首页精选） ----------------
  if (mode === 'featured') {
    return (
      <div className={gridClass('featured', columns)}>
        {items.map((item, i) => {
          const name = itemText(item, 'title', 'name')
          const slug = itemText(item, 'slug')
          const tag = itemText(item, 'tag')
          const category = termName('product_category', itemText(item, 'categorySlug'))
          return (
            <Reveal key={slug || i} delay={(i % 5) * 80}>
              <Link
                to={`/product/${slug}`}
                className="group block border border-cream/10 bg-forest-deep/60 p-6 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50"
              >
                <div className="flex h-40 items-center justify-center overflow-hidden">
                  <img
                    src={itemText(item, 'image') || ''}
                    alt={name}
                    className="max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <p className="mt-5 flex items-center justify-between text-xs">
                  <span className="tracking-[0.3em] text-gold-light">{category}</span>
                  {tag && <span className="border border-gold/50 px-2 py-0.5 text-[10px] text-gold-light">{tag}</span>}
                </p>
                <h3 className="mt-2 font-serif-sc text-lg tracking-wider">{name}</h3>
                <p className="mt-2 text-xs leading-6 text-cream/55">{itemText(item, 'tagline', 'summary')}</p>
              </Link>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 资讯卡（首页动态） ----------------
  if (mode === 'card' && source === 'news') {
    return (
      <div className={gridClass('card', columns)}>
        {items.map((item, i) => {
          const slug = itemText(item, 'slug')
          const title = itemText(item, 'title')
          return (
            <Reveal key={slug || i} delay={i * 100}>
              <Link
                to={`/news/${slug}`}
                className="group flex h-full flex-col border border-forest/10 bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="tracking-[0.25em] text-gold">
                    {termName('news_category', itemText(item, 'categorySlug'))}
                  </span>
                  <span className="font-latin text-ink-soft/70">{itemText(item, 'date')}</span>
                </div>
                <h3 className="mt-4 flex-1 font-serif-sc text-lg leading-7 tracking-wider text-forest transition-colors group-hover:text-gold">
                  {title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-7 text-ink-soft">{itemText(item, 'summary')}</p>
              </Link>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 资讯横排（媒体中心） ----------------
  if (mode === 'row') {
    return (
      <div className="space-y-5">
        {items.map((item, i) => {
          const slug = itemText(item, 'slug')
          return (
            <Reveal key={slug || i} delay={i * 60}>
              <Link
                to={`/news/${slug}`}
                className="group flex flex-col gap-4 border border-forest/10 bg-white p-7 transition-all duration-500 hover:-translate-y-1 hover:border-gold/50 hover:shadow-lg md:flex-row md:items-center md:gap-8"
              >
                <span className="font-latin text-2xl font-semibold text-gold">{itemText(item, 'date')}</span>
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.3em] text-gold">
                    {termName('news_category', itemText(item, 'categorySlug'))}
                  </p>
                  <h3 className="mt-1.5 font-serif-sc text-lg leading-7 tracking-wider text-forest transition-colors group-hover:text-gold">
                    {itemText(item, 'title')}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">{itemText(item, 'summary')}</p>
                </div>
                <Film className="hidden h-5 w-5 shrink-0 text-gold/50 md:block" />
              </Link>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 产品卡（商城热销 / 产品中心目录） ----------------
  if (mode === 'hot' || mode === 'catalog') {
    const catalog = mode === 'catalog'
    return (
      <div className={gridClass(mode, columns)}>
        {items.map((item, i) => {
          const name = itemText(item, 'title', 'name')
          const slug = itemText(item, 'slug')
          const tag = itemText(item, 'tag')
          return (
            <Reveal key={slug || i} delay={(i % 4) * 80}>
              <Link
                to={`/product/${slug}`}
                className="group flex h-full flex-col border border-forest/10 bg-white transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg"
              >
                <div
                  className={`relative flex items-center justify-center overflow-hidden bg-cream-deep/50 ${
                    catalog ? 'h-56 p-6' : 'h-44 p-6'
                  }`}
                >
                  <img
                    src={itemText(item, 'image') || ''}
                    alt={name}
                    className="max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                  />
                  {tag && (
                    <span className="absolute left-4 top-4 border border-gold/50 bg-cream px-2.5 py-1 text-[10px] tracking-[0.2em] text-gold">
                      {tag}
                    </span>
                  )}
                </div>
                <div className={`flex flex-1 flex-col ${catalog ? 'p-7' : 'p-6'}`}>
                  {catalog ? (
                    <>
                      <p className="text-[10px] tracking-[0.35em] text-gold">{itemText(item, 'nameEn')}</p>
                      <h3 className="mt-2 font-serif-sc text-xl tracking-wider text-forest">{name}</h3>
                      <p className="mt-3 flex-1 text-sm leading-7 text-ink-soft">{itemText(item, 'tagline', 'summary')}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-forest/8 pt-4">
                        <span className="text-xs text-ink-soft">
                          {termName('product_category', itemText(item, 'categorySlug'))}
                        </span>
                        <span className="link-line text-sm text-gold">{setting('ui.productsDetailBtn', '查看详情')}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="mt-2 font-serif-sc text-lg tracking-wider text-forest">{name}</h3>
                      <p className="mt-2 flex-1 text-xs leading-6 text-ink-soft">{itemText(item, 'spec')}</p>
                      <p className="mt-4 font-latin text-lg font-semibold text-gold">
                        {setting('ui.mallOfficialTag', '官方直营')}
                      </p>
                    </>
                  )}
                </div>
              </Link>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 视频（媒体中心） ----------------
  if (mode === 'video') {
    return (
      <div className={gridClass('video', columns)}>
        {items.map((item, i) => {
          const title = itemText(item, 'title')
          return (
            <Reveal key={itemText(item, 'code') || title || i} delay={(i % 3) * 80}>
              <div className="group block w-full text-left">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={itemText(item, 'image') || ''}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-forest-deep/40 transition-colors duration-500 group-hover:bg-forest-deep/20" />
                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cream/60 bg-forest-deep/50 text-cream backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:border-gold group-hover:text-gold-light">
                    <Play className="ml-0.5 h-5 w-5" />
                  </span>
                  {itemText(item, 'duration') && (
                    <span className="absolute bottom-3 right-3 bg-forest-deep/80 px-2.5 py-1 font-latin text-xs text-cream">
                      {itemText(item, 'duration')}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-serif-sc text-lg tracking-wider text-forest transition-colors group-hover:text-gold">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{itemText(item, 'description')}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 口碑（顾客口碑） ----------------
  if (mode === 'review') {
    return (
      <div className={gridClass('review', columns)}>
        {items.map((item, i) => {
          const name = itemText(item, 'title', 'customerName')
          return (
            <Reveal key={itemText(item, 'code') || `${name}-${i}`} delay={(i % 3) * 80}>
              <figure className="flex h-full flex-col border border-forest/10 bg-white p-8 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg">
                <QuoteIcon className="h-8 w-8 text-gold/40" />
                <blockquote className="mt-5 flex-1 text-sm leading-8 text-ink">
                  &quot;{itemText(item, 'content')}&quot;
                </blockquote>
                <figcaption className="mt-6 border-t border-forest/8 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif-sc text-base tracking-wider text-forest">{name}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {[itemText(item, 'location'), itemText(item, 'role')].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {itemText(item, 'product') && (
                      <span className="border border-gold/40 px-3 py-1 text-[10px] tracking-[0.2em] text-gold">
                        {itemText(item, 'product')}
                      </span>
                    )}
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 荣誉（关于页） ----------------
  if (mode === 'honor') {
    return (
      <div className={gridClass('honor', columns)}>
        {items.map((item, i) => {
          const name = itemText(item, 'title', 'name')
          return (
            <Reveal key={itemText(item, 'code') || `${name}-${i}`} delay={(i % 4) * 60}>
              <div className="cert-frame flex h-44 flex-col items-center justify-center p-6 text-center">
                <p className="font-serif-sc text-lg leading-7 tracking-widest text-forest">{name}</p>
                <p className="mt-3 text-xs leading-5 text-ink-soft">{itemText(item, 'issuer')}</p>
                {itemText(item, 'year') && <p className="mt-2 font-latin text-sm text-gold">{itemText(item, 'year')}</p>}
              </div>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // ---------------- 大事记（关于页时间轴） ----------------
  if (mode === 'timeline') {
    return (
      <div className="relative">
        <div className="absolute left-4 top-0 h-full w-px bg-gold/40 md:left-1/2" />
        {items.map((item, i) => (
          <Reveal
            key={itemText(item, 'code') || itemText(item, 'year') || i}
            delay={60}
            className="relative mb-10 md:w-1/2 md:odd:pr-12 md:even:ml-auto md:even:pl-12"
          >
            <span className="absolute left-4 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gold ring-4 ring-gold/20 md:left-auto md:odd:left-full md:odd:translate-x-[-50%] md:even:left-0 md:even:translate-x-[-50%]" />
            <div className="ml-10 md:ml-0">
              <p className="font-latin text-2xl font-semibold text-gold-light">{itemText(item, 'year')}</p>
              <p className="mt-2 border-l-2 border-gold/30 pl-4 text-sm leading-7 text-cream/75">
                {itemText(item, 'content', 'title')}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    )
  }

  // ---------------- 电商渠道（首页深色 / 商城页浅色） ----------------
  const action = itemText(block.props, 'itemAction')
  return (
    <div className={gridClass('channel', columns)}>
      {items.map((item, i) => {
        const name = itemText(item, 'title', 'name')
        const href = itemText(item, 'url')
        const body = (
          <>
            {itemText(item, 'nameEn') && (
              <p
                className={`font-latin font-semibold tracking-wider ${
                  dark ? 'text-2xl text-gold-light' : 'text-3xl text-gold'
                }`}
              >
                {itemText(item, 'nameEn')}
              </p>
            )}
            <p
              className={`font-serif-sc tracking-widest ${
                dark ? 'mt-3 text-lg' : 'mt-4 text-xl text-forest group-hover:text-gold'
              }`}
            >
              {name}
            </p>
            {itemText(item, 'remark', 'description') && (
              <p className={`mt-2 text-xs tracking-[0.2em] ${dark ? 'text-cream/50' : 'text-ink-soft'}`}>
                {itemText(item, 'remark', 'description')}
              </p>
            )}
            {!dark && action && (
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-gold">
                {action}
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            )}
          </>
        )
        const card = dark
          ? 'group block w-full border border-cream/15 bg-cream/5 p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:border-gold/60 hover:bg-cream/10'
          : 'group flex h-full flex-col items-center border border-forest/10 bg-white p-10 text-center transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg'
        return (
          <Reveal key={itemText(item, 'slug') || `${name}-${i}`} delay={i * 80}>
            {href ? (
              <CtaLink to={href} className={card}>
                {body}
              </CtaLink>
            ) : (
              <div className={card}>{body}</div>
            )}
          </Reveal>
        )
      })}
    </div>
  )
}
