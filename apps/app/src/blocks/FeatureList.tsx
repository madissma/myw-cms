import Reveal from '../components/Reveal'
import { useSite } from '../store/site'
import { resolveIcon } from './icons'
import { itemText, toItems, type BlockComponentProps } from './types'

/**
 * 要点列表，三种形态：
 * - 'boxed'   描边方卡 + 菱形点（首页绿色基地三条要点）
 * - 'rule'    左侧金线（关于页基地两条要点）
 * - 'contact' 联系信息行：图标 + 标签 + 取值，取值按 valueKey 实时读 Setting，
 *             保证热线 / 地址只有一处真源（规划 §2：contactInfo -> Setting(group=contact)）
 * - 默认      同 boxed
 */
export default function FeatureList({ block, appearance }: BlockComponentProps) {
  const items = toItems(block.props.items)
  const { setting } = useSite()
  if (!items.length) return null

  const value = (item: (typeof items)[number], key: string) => {
    const valueKey = itemText(item, 'valueKey')
    if (valueKey) return setting(valueKey, '') || key
    return key
  }

  if (appearance === 'contact') {
    return (
      <div className="space-y-6">
        {items.map((item, i) => {
          const label = itemText(item, 'title', 'label')
          const text = value(item, itemText(item, 'description', 'text'))
          const Icon = resolveIcon(itemText(item, 'icon'))
          if (!label && !text) return null
          return (
            <Reveal key={`${label}-${i}`} delay={i * 60}>
              <div className="flex items-start gap-4 border border-forest/10 bg-white p-6">
                {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
                <div>
                  <p className="text-xs tracking-[0.25em] text-ink-soft">{label}</p>
                  <p className="mt-1.5 font-serif-sc text-base tracking-wider text-forest">{text}</p>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    )
  }

  if (appearance === 'rule') {
    return (
      <div className="space-y-4">
        {items.map((item, i) => {
          const title = itemText(item, 'title')
          const desc = itemText(item, 'description')
          if (!title && !desc) return null
          return (
            <Reveal key={`${title}-${i}`} delay={i * 80}>
              <div className="border-l-2 border-gold/50 pl-5">
                <p className="font-serif-sc text-base tracking-wider text-forest">{title}</p>
                {desc && <p className="mt-1.5 text-sm leading-7 text-ink-soft">{desc}</p>}
              </div>
            </Reveal>
          )
        })}
      </div>
    )
  }

  // boxed / 默认
  return (
    <ul className="space-y-4">
      {items.map((item, i) => {
        const title = itemText(item, 'title')
        const desc = itemText(item, 'description')
        if (!title && !desc) return null
        return (
          <Reveal as="li" key={`${title}-${i}`} delay={i * 80}>
            <div className="flex items-start gap-4 border border-forest/10 bg-white p-5">
              <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-gold" />
              <div>
                <p className="font-serif-sc text-base tracking-wider text-forest">{title}</p>
                {desc && <p className="mt-1 text-sm leading-6 text-ink-soft">{desc}</p>}
              </div>
            </div>
          </Reveal>
        )
      })}
    </ul>
  )
}
