import Reveal from '../components/Reveal'
import { itemText, toItems, type BlockComponentProps } from './types'

/** 序号流程表：产线五大核心工艺，序号由数据给出（seed 按现网 01..05 生成） */
export default function NumberedList({ block, tone }: BlockComponentProps) {
  const items = toItems(block.props.items)
  if (!items.length) return null

  return (
    <ul className="space-y-4">
      {items.map((item, i) => {
        const step = itemText(item, 'step') || String(i + 1).padStart(2, '0')
        const title = itemText(item, 'title')
        const desc = itemText(item, 'description')
        if (!title && !desc) return null
        return (
          <Reveal as="li" key={`${step}-${i}`} delay={i * 60}>
            <div className="flex items-start gap-4">
              <span
                className={`font-latin text-xl font-semibold ${
                  tone === 'dark' ? 'text-gold-light' : 'text-gold'
                }`}
              >
                {step}
              </span>
              <div>
                <p className="font-serif-sc text-base tracking-wider">{title}</p>
                {desc && (
                  <p className={`mt-1 text-sm leading-6 ${tone === 'dark' ? 'text-cream/60' : 'text-ink-soft'}`}>
                    {desc}
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        )
      })}
    </ul>
  )
}
