import type { CSSProperties } from 'react'
import Reveal from '../components/Reveal'
import { itemText, toItems, toTextList, type BlockComponentProps } from './types'

/**
 * 区位示意图：现网为纯 CSS 绘制（无底图），此处保留同一实现，
 * 标注位置由数据的 x / y 百分比给出（x<=50 靠左、y<=50 靠上，另一侧取余量），
 * 后台若上传了真实底图（props.image），则以底图替代手绘图层，标注照常叠加。
 */
export default function MapSketch({ block }: BlockComponentProps) {
  const labels = toItems(block.props.labels).filter((item) => !!itemText(item, 'text'))
  const marker = itemText(block.props, 'marker')
  const image = itemText(block.props, 'image')
  const notes = toTextList(block.props.notes)
  if (!marker && !labels.length && !image) return null

  /** 单个百分比定位：<=50 贴左 / 贴上，否则贴右 / 贴下（与现网 left-[12%] / right-[10%] 的写法等价） */
  const place = (value: unknown, axis: 'x' | 'y'): CSSProperties => {
    const raw = Number(value)
    const percent = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 50
    if (axis === 'x') return percent <= 50 ? { left: `${percent}%` } : { right: `${100 - percent}%` }
    return percent <= 50 ? { top: `${percent}%` } : { bottom: `${100 - percent}%` }
  }

  return (
    <Reveal delay={120}>
      <div className="relative aspect-[16/7] overflow-hidden border border-cream/10 bg-forest">
        {image ? (
          <img src={image} alt={marker} className="h-full w-full object-cover" />
        ) : (
          <>
            {/* stylized map */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--c-gold)/0.15),transparent_60%)]" />
            {/* river */}
            <div className="absolute left-0 right-0 top-1/2 h-10 -rotate-3 bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
            {/* highway */}
            <div className="absolute left-0 right-0 top-1/4 h-1 bg-cream/20" />
          </>
        )}
        {/* center marker */}
        {marker && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <span className="mx-auto block h-4 w-4 rotate-45 bg-gold shadow-[0_0_0_8px_rgb(var(--c-gold)/0.2)]" />
            <p className="mt-6 font-serif-sc text-lg tracking-widest text-cream">{marker}</p>
          </div>
        )}
        {/* labels */}
        {labels.map((item, i) => (
          <span
            key={itemText(item, 'text') || i}
            style={{ ...place(item.x, 'x'), ...place(item.y, 'y') }}
            className={`absolute text-xs tracking-[0.3em] ${
              itemText(item, 'variant') === 'soft' ? 'text-cream/40' : 'text-cream/50'
            }`}
          >
            {itemText(item, 'text')}
          </span>
        ))}
      </div>
      {notes.map((note, i) => (
        <p key={i} className="mt-4 text-center text-xs leading-6 text-cream/50">
          {note}
        </p>
      ))}
    </Reveal>
  )
}
