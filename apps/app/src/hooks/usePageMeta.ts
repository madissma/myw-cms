import { useEffect } from 'react'
import { useSite } from '../store/site'
import type { PageRecord } from '../api/types'

/**
 * 按页面 SEO 字段维护 document.title 与 meta（规划 §7.6）。
 *
 * 优先级：调用方传入（详情页用实体标题）> Page.seo* > 站点默认值，
 * 三层都缺失时不改写，保留 index.html 里的静态标签，避免爬虫抓到空标题。
 */
interface MetaInput {
  title?: string | null
  description?: string | null
  keywords?: string | null
}

function upsertMeta(key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

export function usePageMeta(page?: PageRecord | null, extra?: MetaInput): void {
  const { site, lang } = useSite()
  // 依赖一律用原始值：调用方常传字面量对象，引用比较会导致每次渲染都写一遍 DOM
  const brandName = site.brand.name
  const companyName = site.brand.companyName || site.name
  const siteName = site.name
  const siteDesc = site.description
  const siteKeywords = site.keywords
  const pageKey = page?.key ?? ''
  const pageName = page?.name ?? ''
  const heroTitle = page?.heroTitle ?? ''
  const seoTitle = page?.seoTitle ?? ''
  const seoDesc = page?.seoDescription ?? ''
  const seoKeywords = page?.seoKeywords ?? ''
  const extraTitle = extra?.title ?? ''
  const extraDesc = extra?.description ?? ''
  const extraKeywords = extra?.keywords ?? ''

  useEffect(() => {
    // 首页沿用站点名（与现网 index.html 的 title 一致），内页用「栏目名 — 公司全称」
    const fallbackTitle = pageKey
      ? pageKey === 'home'
        ? siteName || companyName
        : `${pageName || heroTitle || brandName} — ${companyName}`
      : siteName || companyName
    const title = extraTitle || seoTitle || fallbackTitle
    if (title) document.title = title

    const description = extraDesc || seoDesc || siteDesc
    if (description) upsertMeta('description', description)

    const keywords = extraKeywords || seoKeywords || siteKeywords
    if (keywords) upsertMeta('keywords', keywords)
  }, [
    pageKey,
    pageName,
    heroTitle,
    seoTitle,
    seoDesc,
    seoKeywords,
    extraTitle,
    extraDesc,
    extraKeywords,
    siteName,
    siteDesc,
    siteKeywords,
    brandName,
    companyName,
  ])

  // 语言切换后同步 html lang，供屏幕阅读器与爬虫识别
  useEffect(() => {
    if (lang) document.documentElement.lang = lang
  }, [lang])
}
