import Reveal from '../components/Reveal'
import { itemText, toItems, type BlockComponentProps } from './types'

/** 文化理念卡：单个汉字方印 + 四字标题 + 说明（About 页企业文化） */
export default function CultureGrid({ block }: BlockComponentProps) {
  const items = toItems(block.props.items)
  if (!items.length) return null
  const columns = block.columns ?? items.length

  const grid =
    columns >= 4
      ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4'
      : columns === 3
        ? 'grid gap-6 md:grid-cols-3'
        : 'grid gap-6 sm:grid-cols-2'

  return (
    <div className={grid}>
      {items.map((item, i) => {
        const char = itemText(item, 'char')
        const title = itemText(item, 'title')
        const desc = itemText(item, 'description')
        if (!char && !title) return null
        return (
          <Reveal key={`${char || title}-${i}`} delay={i * 100}>
            <div className="h-full border border-forest/10 bg-white p-8 text-center transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg">
              {char && (
                <span className="mx-auto flex h-14 w-14 items-center justify-center bg-forest font-serif-sc text-2xl font-semibold text-gold-light">
                  {char}
                </span>
              )}
              <h3 className="mt-5 font-serif-sc text-lg tracking-widest text-forest">{title}</h3>
              {desc && <p className="mt-3 text-sm leading-7 text-ink-soft">{desc}</p>}
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
