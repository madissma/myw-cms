import Reveal from '../components/Reveal'
import { resolveIcon } from './icons'
import { itemText, toItems, type BlockComponentProps } from './types'

function gridClass(columns: number): string {
  if (columns <= 1) return 'grid gap-6'
  if (columns === 2) return 'grid gap-6 sm:grid-cols-2'
  if (columns === 3) return 'grid gap-6 md:grid-cols-3'
  if (columns === 4) return 'grid gap-6 md:grid-cols-2 lg:grid-cols-4'
  if (columns === 5) return 'grid gap-6 md:grid-cols-2 lg:grid-cols-5'
  return 'grid gap-6 md:grid-cols-3 lg:grid-cols-6'
}

const CARD = 'h-full border border-forest/10 bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg'

/**
 * 卡片网格，四种版式：
 * - 'number'      序号卡（核心优势）
 * - 'icon'        图标卡（研发平台）
 * - 'icon-inline' 图标在左的横向卡（商城保障）
 * - 'plain'       纯文字卡（公众号引导）
 * 未登记版式时按条目是否带图标自动选择。
 */
export default function CardGrid({ block, appearance }: BlockComponentProps) {
  const items = toItems(block.props.items)
  if (!items.length) return null
  const columns = block.columns ?? items.length
  const mode =
    appearance ??
    (items.some((item) => !!itemText(item, 'icon'))
      ? 'icon'
      : items.some((item) => !!itemText(item, 'subtitle'))
        ? 'plain'
        : 'number')

  return (
    <div className={gridClass(columns)}>
      {items.map((item, i) => {
        const title = itemText(item, 'title', 'name')
        const subtitle = itemText(item, 'subtitle')
        const desc = itemText(item, 'description')
        const iconName = itemText(item, 'icon')
        const Icon = resolveIcon(iconName)
        if (!title && !desc) return null
        return (
          <Reveal key={`${title}-${i}`} delay={i * 80}>
            {mode === 'icon-inline' ? (
              <div className="flex items-start gap-4 border border-forest/10 bg-white p-6">
                {Icon && <Icon className="mt-0.5 h-7 w-7 shrink-0 text-gold" />}
                <div>
                  <p className="font-serif-sc text-base tracking-wider text-forest">{title}</p>
                  {desc && <p className="mt-1.5 text-sm leading-6 text-ink-soft">{desc}</p>}
                </div>
              </div>
            ) : mode === 'plain' ? (
              <div className="h-full border border-forest/10 bg-white p-6">
                <p className="text-xs tracking-[0.25em] text-ink-soft">{title}</p>
                {subtitle && <p className="mt-1.5 font-serif-sc text-base tracking-wider text-forest">{subtitle}</p>}
                {desc && <p className="mt-2 text-xs leading-6 text-ink-soft">{desc}</p>}
              </div>
            ) : mode === 'icon' ? (
              <div className={CARD}>
                {Icon && <Icon className="h-8 w-8 text-gold" />}
                <h3 className="mt-5 font-serif-sc text-lg leading-7 tracking-wider text-forest">{title}</h3>
                {desc && <p className="mt-3 text-sm leading-7 text-ink-soft">{desc}</p>}
              </div>
            ) : (
              <div className={CARD}>
                <p className="font-latin text-3xl font-semibold text-gold">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-4 font-serif-sc text-lg tracking-widest text-forest">{title}</h3>
                {desc && <p className="mt-3 text-sm leading-7 text-ink-soft">{desc}</p>}
              </div>
            )}
          </Reveal>
        )
      })}
    </div>
  )
}
