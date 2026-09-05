import Reveal from '../components/Reveal'
import { itemText, toItems, type BlockComponentProps } from './types'

function gridClass(columns: number): string {
  if (columns <= 1) return 'grid gap-4'
  if (columns === 2) return 'grid gap-4 sm:grid-cols-2'
  if (columns === 3) return 'grid gap-4 sm:grid-cols-3'
  return 'grid grid-cols-2 gap-4 lg:grid-cols-4'
}

/**
 * 图集，四种形态：
 * - 'overlap' 首页基地：大图 + 右下角压一张小图
 * - 'mosaic'  关于页基地：首图通栏 16/9，其余方形并列
 * - 'banner'  单图大图（科技强企的产线 / 剂型 / 合作 / 团队）
 * - 默认      等宽栅格
 * caption 只作 alt 文本，不在页面上占行，与现网一致。
 */
export default function Gallery({ block, appearance }: BlockComponentProps) {
  const items = toItems(block.props.items).filter((item) => !!itemText(item, 'image'))
  if (!items.length) return null
  const columns = block.columns ?? items.length

  if (appearance === 'overlap') {
    const [first, second] = items
    return (
      <Reveal>
        <div className="relative">
          <img src={itemText(first, 'image')} alt={itemText(first, 'caption')} className="aspect-[4/3] w-full object-cover" />
          {second && (
            <img
              src={itemText(second, 'image')}
              alt={itemText(second, 'caption')}
              className="absolute -bottom-8 -right-4 hidden w-44 border-4 border-cream object-cover shadow-xl md:block lg:w-56"
            />
          )}
        </div>
      </Reveal>
    )
  }

  if (appearance === 'mosaic') {
    return (
      <Reveal>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, i) => (
            <img
              key={itemText(item, 'image') || i}
              src={itemText(item, 'image')}
              alt={itemText(item, 'caption')}
              className={`w-full object-cover ${i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}
            />
          ))}
        </div>
      </Reveal>
    )
  }

  if (appearance === 'banner' || columns <= 1) {
    const first = items[0]
    return (
      <Reveal>
        <figure className="relative">
          <img
            src={itemText(first, 'image')}
            alt={itemText(first, 'caption')}
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="sr-only">{itemText(first, 'caption')}</figcaption>
        </figure>
      </Reveal>
    )
  }

  return (
    <Reveal>
      <div className={gridClass(columns)}>
        {items.map((item, i) => (
          <figure key={itemText(item, 'image') || i} className="relative">
            <img
              src={itemText(item, 'image')}
              alt={itemText(item, 'caption')}
              className="aspect-[4/3] w-full object-cover"
            />
            {itemText(item, 'caption') && (
              <figcaption className="mt-2 text-xs tracking-widest text-ink-soft">
                {itemText(item, 'caption')}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </Reveal>
  )
}
