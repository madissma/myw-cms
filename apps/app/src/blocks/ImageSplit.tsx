import Reveal from '../components/Reveal'
import { CtaLink } from './CtaBand'
import { itemText, toItems, toTextList, type BlockComponentProps } from './types'

/**
 * 大图 + 文案分栏：可指定图片在左或右，附带数据格与要点。
 * 字段契约见 server/src/modules/page/block.schema.ts 的 image_split。
 */
export default function ImageSplit({ block, tone }: BlockComponentProps) {
  const image = itemText(block.props, 'image')
  const eyebrow = itemText(block.props, 'eyebrow')
  const title = itemText(block.props, 'title') || block.title || ''
  const text = itemText(block.props, 'text', 'description')
  const points = toTextList(block.props.points)
  const stats = toItems(block.props.stats)
  const buttonText = itemText(block.props, 'buttonText')
  const buttonUrl = itemText(block.props, 'buttonUrl')
  const imageLeft = itemText(block.props, 'imageSide') !== 'right'
  if (!image && !title && !text) return null

  const figure = image && (
    <Reveal>
      <img src={image} alt={title || eyebrow} className="aspect-[4/3] w-full object-cover" />
    </Reveal>
  )
  const copy = (
    <Reveal delay={120}>
      <div className="space-y-8">
        {(eyebrow || title) && (
          <div>
            {eyebrow && (
              <div className={`gold-rule text-sm tracking-[0.4em] ${tone === 'dark' ? 'text-gold-light' : 'text-gold'}`}>
                <span>{eyebrow}</span>
              </div>
            )}
            {title && (
              <h3
                className={`mt-5 font-serif-sc text-3xl font-semibold leading-snug tracking-wider ${
                  tone === 'dark' ? 'text-cream' : 'text-forest'
                }`}
              >
                {title}
              </h3>
            )}
          </div>
        )}
        {text && <p className={`text-sm leading-8 lg:text-base ${tone === 'dark' ? 'text-cream/75' : 'text-ink-soft'}`}>{text}</p>}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-6">
            {stats.map((item, i) => {
              const value = itemText(item, 'value', '0')
              const label = itemText(item, 'label', '1')
              if (!value) return null
              return (
                <div key={`${value}-${i}`} className="border border-forest/10 bg-white p-6 text-center">
                  <p className="font-latin text-3xl font-semibold text-gold">{value}</p>
                  <p className="mt-2 text-xs tracking-[0.25em] text-ink-soft">{label}</p>
                </div>
              )
            })}
          </div>
        )}
        {points.length > 0 && (
          <div className="space-y-4">
            {points.map((point, i) => (
              <div key={i} className="border-l-2 border-gold/50 pl-5">
                <p className={`font-serif-sc text-base tracking-wider ${tone === 'dark' ? 'text-cream' : 'text-forest'}`}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        )}
        {buttonText && (
          <CtaLink
            to={buttonUrl}
            className="inline-block border border-forest px-8 py-3 text-sm tracking-widest text-forest transition-colors hover:bg-forest hover:text-cream"
          >
            {buttonText}
          </CtaLink>
        )}
      </div>
    </Reveal>
  )

  return (
    <div className="grid items-center gap-14 lg:grid-cols-2">
      {imageLeft ? (
        <>
          {figure}
          {copy}
        </>
      ) : (
        <>
          {copy}
          {figure}
        </>
      )}
    </div>
  )
}
