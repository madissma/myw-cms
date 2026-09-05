import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Reveal from '../components/Reveal'
import { isExternal, itemText, type BlockComponentProps } from './types'

interface CtaProps {
  to: string
  className: string
  children: ReactNode
}

/** 内链走 router，外链（商城地址等）走 a 标签 */
function CtaLink({ to, className, children }: CtaProps) {
  if (!to) return <span className={className}>{children}</span>
  if (isExternal(to)) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

/**
 * 行动引导，四种形态：
 * - 'link'   仅一个描边按钮（首页 / 关于页基地底部的「探访基地」「商务合作洽谈」）
 * - 'center' 居中金色实心按钮（首页商城区底部）
 * - 'band'   深色横幅，文案在左、按钮在右（产品中心 B2B 引导）
 * - 'panel'  金色描边面板，标题 + 说明 + 按钮纵向居中（商城页底部引导）
 */
export default function CtaBand({ block, appearance }: BlockComponentProps) {
  const title = itemText(block.props, 'title') || block.title || ''
  const text = itemText(block.props, 'text', 'description')
  const buttonText = itemText(block.props, 'buttonText')
  const buttonUrl = itemText(block.props, 'buttonUrl')
  if (!title && !text && !buttonText) return null

  if (appearance === 'center') {
    return (
      <Reveal delay={150}>
        <div className="text-center">
          <CtaLink
            to={buttonUrl}
            className="inline-block bg-gold px-10 py-4 text-sm tracking-widest text-forest transition-colors hover:bg-gold-light"
          >
            {buttonText}
          </CtaLink>
        </div>
      </Reveal>
    )
  }

  if (appearance === 'band') {
    return (
      <Reveal delay={100}>
        <div className="grain flex flex-col items-center gap-6 bg-forest-deep px-8 py-14 text-center text-cream md:flex-row md:justify-between md:text-left">
          <div>
            {title && <h3 className="font-serif-sc text-2xl font-semibold tracking-wider lg:text-3xl">{title}</h3>}
            {text && <p className="mt-3 max-w-2xl text-sm leading-7 text-cream/70">{text}</p>}
          </div>
          {buttonText && (
            <CtaLink
              to={buttonUrl}
              className="shrink-0 bg-gold px-10 py-4 text-sm tracking-widest text-forest transition-colors hover:bg-gold-light"
            >
              {buttonText}
            </CtaLink>
          )}
        </div>
      </Reveal>
    )
  }

  if (appearance === 'panel') {
    return (
      <Reveal>
        <div className="flex flex-col items-center gap-4 border border-gold/30 bg-gold/5 px-8 py-10 text-center">
          {title && <h3 className="font-serif-sc text-2xl font-semibold tracking-wider text-forest lg:text-3xl">{title}</h3>}
          {text && <p className="max-w-2xl text-sm leading-7 text-ink-soft">{text}</p>}
          {buttonText && (
            <CtaLink
              to={buttonUrl}
              className="mt-2 border border-forest px-8 py-3 text-sm tracking-widest text-forest transition-colors hover:bg-forest hover:text-cream"
            >
              {buttonText}
            </CtaLink>
          )}
        </div>
      </Reveal>
    )
  }

  // 'link' 与未登记版式：只保留一个描边按钮，缺按钮时退化为一段文字
  if (!buttonText) {
    if (!title && !text) return null
    return (
      <Reveal>
        <p className="text-sm leading-7 text-ink-soft">{title || text}</p>
      </Reveal>
    )
  }
  return (
    <Reveal>
      <CtaLink
        to={buttonUrl}
        className="inline-block border border-forest px-8 py-3 text-sm tracking-widest text-forest transition-colors hover:bg-forest hover:text-cream"
      >
        {buttonText}
      </CtaLink>
    </Reveal>
  )
}

export { CtaLink }
