import Reveal from '../components/Reveal'
import { CtaLink } from './CtaBand'
import { itemText, toTextList, type BlockComponentProps } from './types'

/**
 * 图文段：左图右文（或反之），未纳入现网基线，供后台新增栏目使用。
 * 字段契约见 server/src/modules/page/block.schema.ts 的 image_text。
 */
export default function ImageText({ block, tone }: BlockComponentProps) {
  const image = itemText(block.props, 'image')
  const eyebrow = itemText(block.props, 'eyebrow')
  const title = itemText(block.props, 'title') || block.title || ''
  const paragraphs = toTextList(block.props.paragraphs)
  const points = toTextList(block.props.points)
  const buttonText = itemText(block.props, 'buttonText')
  const buttonUrl = itemText(block.props, 'buttonUrl')
  const imageLeft = itemText(block.props, 'imageSide') !== 'right'
  if (!image && !title && !paragraphs.length) return null

  const figure = image && (
    <Reveal>
      <img src={image} alt={title || eyebrow} className="aspect-[4/3] w-full object-cover" />
    </Reveal>
  )
  const copy = (
    <Reveal delay={120}>
      <div className="space-y-5">
        {eyebrow && (
          <div className={`gold-rule text-sm tracking-[0.4em] ${tone === 'dark' ? 'text-gold-light' : 'text-gold'}`}>
            <span>{eyebrow}</span>
          </div>
        )}
        {title && (
          <h3 className={`font-serif-sc text-2xl font-semibold tracking-wider ${tone === 'dark' ? 'text-cream' : 'text-forest'}`}>
            {title}
          </h3>
        )}
        {paragraphs.map((p, i) => (
          <p key={i} className={`text-sm leading-8 lg:text-base ${tone === 'dark' ? 'text-cream/75' : 'text-ink-soft'}`}>
            {p}
          </p>
        ))}
        {points.length > 0 && (
          <ul className="space-y-3">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                <span className={`text-sm leading-7 ${tone === 'dark' ? 'text-cream/75' : 'text-ink-soft'}`}>{point}</span>
              </li>
            ))}
          </ul>
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
