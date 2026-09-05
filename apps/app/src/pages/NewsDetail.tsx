import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import PageLoading from '../components/PageLoading'
import { bumpView, fetchDetail } from '../api/content'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAsyncData, useSite } from '../store/site'
import { formatDate } from '../lib/format'
import type { News } from '../api/types'

/**
 * 新闻详情：/news/n1 这类旧地址由服务端按 legacyId 命中并回 relocated，
 * 前台 replace 到语义 slug（规划 10.6：旧链接不失效且统一到 slug）。
 */
export default function NewsDetail() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { lang, setting, termName } = useSite()

  const { data: item, loading } = useAsyncData(
    () => fetchDetail('news', slug, lang) as Promise<{ data: News | null; offline: boolean }>,
    [slug, lang],
  )

  useEffect(() => {
    if (!item) return
    if (item.relocated && item.canonicalSlug) {
      navigate(`/news/${item.canonicalSlug}`, { replace: true })
      return
    }
    if (item.id) void bumpView('news', item.id)
  }, [item, navigate])

  usePageMeta(null, {
    title: item?.title ?? '',
    description: item?.summary ?? '',
    keywords: item?.title ?? '',
  })

  if (loading && !item) return <PageLoading />

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 text-center">
        <p className="font-serif-sc text-3xl tracking-widest text-forest">
          {setting('ui.newsNotFound', '未找到该新闻')}
        </p>
        <p className="mt-4 text-sm text-ink-soft">
          {setting('ui.newsNotFoundDesc', '您访问的资讯不存在或已下线')}
        </p>
        <Link
          to="/media"
          className="mt-10 inline-flex items-center gap-2 bg-forest px-8 py-3 text-sm tracking-widest text-cream transition-colors hover:bg-forest-light"
        >
          <ChevronLeft className="h-4 w-4" />
          {setting('ui.newsBack', '返回媒体中心')}
        </Link>
      </div>
    )
  }

  const paragraphs = item.paragraphs ?? []
  const related = item.related ?? []
  const category = termName('news_category', item.categorySlug)
  const date = formatDate(item.publishedAt)

  return (
    <div>
      {/* hero */}
      <section className="grain relative overflow-hidden bg-forest-deep pb-16 pt-32 text-cream lg:pb-20 lg:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgb(var(--c-gold)/0.2),transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl px-5 lg:px-8">
          <Link
            to="/media"
            className="inline-flex items-center gap-1 text-sm tracking-widest text-cream/60 transition-colors hover:text-gold-light"
          >
            <ChevronLeft className="h-4 w-4" />
            {setting('ui.newsCrumb', '媒体中心')}
          </Link>
          <p className="mt-10 flex items-center gap-4 text-xs">
            {category ? (
              <span className="border border-gold/50 px-3 py-1 tracking-[0.25em] text-gold-light">
                {category}
              </span>
            ) : null}
            {date ? <span className="font-latin text-cream/60">{date}</span> : null}
          </p>
          <h1 className="mt-5 font-serif-sc text-3xl font-semibold leading-snug tracking-wider lg:text-4xl">
            {item.title}
          </h1>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </section>

      {/* content */}
      <article className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
        {item.summary ? (
          <p className="border-l-2 border-gold/50 pl-5 font-serif-sc text-lg leading-8 text-ink">
            {item.summary}
          </p>
        ) : null}
        {paragraphs.length ? (
          <div className="mt-10 space-y-6">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-8 text-ink-soft lg:text-base">
                {p}
              </p>
            ))}
          </div>
        ) : item.bodyHtml ? (
          // 富文本正文已由服务端 sanitize-html 白名单过滤（规划 §3）
          <div
            className="rich-text mt-10 text-sm leading-8 text-ink-soft lg:text-base"
            dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
          />
        ) : null}
      </article>

      {/* related news */}
      {related.length ? (
        <section className="bg-cream-deep/60 py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
              <span>{setting('ui.newsRelated', '相关资讯')}</span>
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {related.map((n) => (
                <Link
                  key={n.id || n.slug}
                  to={`/news/${n.slug || n.id}`}
                  className="group block border border-forest/10 bg-white p-7 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="tracking-[0.25em] text-gold">
                      {termName('news_category', n.categorySlug)}
                    </span>
                    <span className="font-latin text-ink-soft/70">{formatDate(n.publishedAt)}</span>
                  </div>
                  <h3 className="mt-4 font-serif-sc text-lg leading-7 tracking-wider text-forest transition-colors group-hover:text-gold">
                    {n.title}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-ink-soft">{n.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
