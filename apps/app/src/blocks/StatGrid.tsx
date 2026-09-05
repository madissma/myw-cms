import Reveal from '../components/Reveal'
import { itemText, toItems, type BlockComponentProps } from './types'

function darkGrid(columns: number): string {
  if (columns >= 5) return 'grid grid-cols-2 gap-8 md:grid-cols-5'
  if (columns === 4) return 'grid grid-cols-2 gap-10 lg:grid-cols-4'
  if (columns === 3) return 'grid grid-cols-2 gap-10 md:grid-cols-3'
  return 'grid grid-cols-2 gap-10'
}

function lightGrid(columns: number): string {
  if (columns <= 2) return 'grid grid-cols-2 gap-6'
  if (columns === 3) return 'grid gap-6 sm:grid-cols-3'
  return 'grid gap-6 sm:grid-cols-2 lg:grid-cols-4'
}

/** 数据统计格：深色栏目为纯文字横幅，浅色栏目为白底小卡（绿色基地的四格） */
export default function StatGrid({ block, tone }: BlockComponentProps) {
  const items = toItems(block.props.items)
  if (!items.length) return null
  const columns = block.columns ?? items.length
  const big = tone === 'dark' && columns <= 4

  return (
    <div className={tone === 'dark' ? darkGrid(columns) : lightGrid(columns)}>
      {items.map((item, i) => {
        const value = itemText(item, 'value')
        const label = itemText(item, 'label')
        const desc = itemText(item, 'description')
        if (!value) return null
        return (
          <Reveal key={`${value}-${i}`} delay={i * 80}>
            <div
              className={
                tone === 'dark'
                  ? 'text-center'
                  : 'border border-forest/10 bg-white p-6 text-center'
              }
            >
              <p
                className={`font-latin font-semibold ${
                  tone === 'dark'
                    ? big
                      ? 'text-5xl text-gold-light lg:text-6xl'
                      : 'text-3xl text-gold-light lg:text-4xl'
                    : 'text-3xl text-gold'
                }`}
              >
                {value}
              </p>
              <p
                className={
                  tone === 'dark'
                    ? big
                      ? 'mt-3 text-sm tracking-[0.3em] text-cream/60'
                      : 'mt-2 text-xs tracking-[0.3em] text-cream/60'
                    : 'mt-2 text-xs tracking-[0.25em] text-ink-soft'
                }
              >
                {label}
              </p>
              {desc && <p className="mt-2 text-xs leading-5 text-ink-soft/80">{desc}</p>}
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
