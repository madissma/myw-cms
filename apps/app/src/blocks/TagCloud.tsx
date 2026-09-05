import { Link } from 'react-router'
import Reveal from '../components/Reveal'
import { itemText, type BlockComponentProps } from './types'

/**
 * 标签云：首页技术关键词、科技强企的剂型清单。
 * 条目可以是纯文本，也可以是带 url / slug 的对象；
 * props.baseUrl 仅对带 slug 或 anchor 的条目生效（纯文本标签不生成死链）。
 */
export default function TagCloud({ block }: BlockComponentProps) {
  const raw: unknown[] = Array.isArray(block.props.items) ? (block.props.items as unknown[]) : []
  const baseUrl = typeof block.props.baseUrl === 'string' ? block.props.baseUrl : ''
  const tags = raw
    .map((entry) => {
      const text = typeof entry === 'string' ? entry : itemText(entry ?? {}, 'text', 'name', 'title')
      if (!text) return null
      const record = typeof entry === 'string' ? {} : entry
      const url = itemText(record, 'url')
      const key = itemText(record, 'slug', 'anchor')
      const to = url || (baseUrl && key ? `${baseUrl}${key}` : '')
      return { text, to }
    })
    .filter((entry): entry is { text: string; to: string } => !!entry)
  if (!tags.length) return null

  const className =
    'border border-gold/40 bg-gold/5 px-5 py-2 text-sm tracking-widest text-forest transition-colors hover:border-gold hover:bg-gold/10'

  return (
    <Reveal delay={100}>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) =>
          tag.to ? (
            tag.to.startsWith('http') ? (
              <a key={tag.text} href={tag.to} target="_blank" rel="noreferrer" className={className}>
                {tag.text}
              </a>
            ) : (
              <Link key={tag.text} to={tag.to} className={className}>
                {tag.text}
              </Link>
            )
          ) : (
            <span key={tag.text} className={className}>
              {tag.text}
            </span>
          ),
        )}
      </div>
    </Reveal>
  )
}
