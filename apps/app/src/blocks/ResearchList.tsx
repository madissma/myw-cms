import Reveal from '../components/Reveal'
import { itemText, toItems, type BlockComponentProps } from './types'

/** 科研合作列表：课题名 + 周期 + 承接平台（科技强企 校企合作） */
export default function ResearchList({ block }: BlockComponentProps) {
  const items = toItems(block.props.items)
  if (!items.length) return null

  return (
    <div className="space-y-5">
      {items.map((item, i) => {
        const title = itemText(item, 'title', 'name')
        const date = itemText(item, 'date', 'period')
        const partner = itemText(item, 'partner', 'lab')
        if (!title) return null
        return (
          <Reveal key={`${title}-${i}`} delay={i * 80}>
            <div className="border border-forest/10 bg-white p-6 transition-all duration-500 hover:border-gold/50 hover:shadow-lg">
              <p className="font-serif-sc text-base leading-7 tracking-wider text-forest">{title}</p>
              {(date || partner) && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {date && <span className="bg-forest px-3 py-1 tracking-wider text-cream">{date}</span>}
                  {partner && (
                    <span className="border border-gold/40 px-3 py-1 tracking-wider text-gold">{partner}</span>
                  )}
                </div>
              )}
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
