import { Link } from 'react-router'
import { Play, Quote as QuoteIcon } from 'lucide-react'
import Reveal from '../components/Reveal'
import { itemText, splitLines, type BlockComponentProps } from './types'

/**
 * 语录 / 人物卡，三种形态：
 * - 'card'   首页创始人卡：头像 + 两行简介，下方可挂宣传片入口
 * - 'aside'  关于页侧栏语录：小标题 + 正文 + 右对齐署名
 * - 默认     通栏引用块（大引号 + 正文 + 署名）
 */
export default function Quote({ block, tone, appearance }: BlockComponentProps) {
  const text = itemText(block.props, 'text', 'content')
  const author = itemText(block.props, 'author')
  const role = itemText(block.props, 'role')
  const image = itemText(block.props, 'image')
  const buttonText = itemText(block.props, 'buttonText')
  const buttonUrl = itemText(block.props, 'buttonUrl')
  if (!text && !role) return null

  if (appearance === 'card') {
    return (
      <Reveal>
        <div className="space-y-5">
          {image && (
            <div className="flex items-center gap-4 border border-forest/10 bg-white p-5">
              <img src={image} alt={role || block.title || ''} className="h-20 w-20 rounded-sm object-cover" />
              <div>
                {role && <p className="text-xs tracking-[0.25em] text-gold">{role}</p>}
                <p className="mt-1.5 text-sm leading-6 text-ink">
                  {splitLines(text).map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}
          {buttonText && (
            <Link
              to={buttonUrl || '/media'}
              className="inline-flex items-center gap-2 text-sm tracking-widest text-gold transition-colors hover:text-forest"
            >
              <Play className="h-4 w-4" />
              {buttonText}
            </Link>
          )}
        </div>
      </Reveal>
    )
  }

  if (appearance === 'aside') {
    return (
      <Reveal delay={100}>
        <div className="border border-forest/10 bg-white p-6">
          {block.title && <p className="text-xs tracking-[0.25em] text-gold">{block.title}</p>}
          <p className="mt-3 font-serif-sc text-base leading-8 text-ink">{text}</p>
          {author && <p className="mt-4 text-right text-sm text-ink-soft">{author}</p>}
        </div>
      </Reveal>
    )
  }

  return (
    <Reveal>
      <blockquote
        className={`border-l-2 border-gold/50 pl-6 ${
          tone === 'dark' ? 'text-cream/80' : 'text-ink-soft'
        }`}
      >
        <QuoteIcon className="h-7 w-7 text-gold/40" />
        <p className="mt-4 font-serif-sc text-lg leading-9 tracking-wider">{text}</p>
        {(author || role) && (
          <footer className="mt-4 text-sm tracking-widest text-gold">
            {author}
            {author && role ? ' · ' : ''}
            {role}
          </footer>
        )}
      </blockquote>
    </Reveal>
  )
}
