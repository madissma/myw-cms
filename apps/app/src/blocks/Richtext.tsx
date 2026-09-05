import Reveal from '../components/Reveal'
import { toTextList, type BlockComponentProps } from './types'

/**
 * 富文本 / 纯文本段落。
 * props.html 优先（后台富文本产出，服务端已按标签白名单过滤），
 * 否则渲染 props.paragraphs —— 现网散文走的都是后者。
 *
 * appearance：
 * - 'note'   紧跟列表后的补充说明（校企合作「合作模式」一行）
 * - 'center' 居中脚注，第二段起以金色强调（顾客口碑底部授权说明）
 */
export default function Richtext({ block, tone, appearance }: BlockComponentProps) {
  const paragraphs = toTextList(block.props.paragraphs)
  const html = typeof block.props.html === 'string' ? block.props.html.trim() : ''
  if (!paragraphs.length && !html) return null

  if (appearance === 'note') {
    return (
      <div className="pt-2 text-sm leading-7 text-ink-soft">
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    )
  }

  if (appearance === 'center') {
    return (
      <Reveal delay={120}>
        <p className="text-center text-sm leading-7 text-ink-soft">
          {paragraphs.map((p, i) =>
            i === 0 ? (
              <span key={i}>{p}</span>
            ) : (
              <span key={i}>
                <span className="text-gold">{p}</span>。
              </span>
            ),
          )}
        </p>
      </Reveal>
    )
  }

  const wrapper = `space-y-5 text-sm leading-8 lg:text-base ${tone === 'dark' ? 'text-cream/75' : 'text-ink-soft'}`
  return (
    <Reveal>
      {html ? (
        <div className={`${wrapper} rich-text`} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className={wrapper}>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </Reveal>
  )
}
