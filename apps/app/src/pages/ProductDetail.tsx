import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BadgeCheck, ChevronLeft, ShoppingCart, MessageCircle } from 'lucide-react'
import PageLoading from '../components/PageLoading'
import Reveal from '../components/Reveal'
import { fetchDetail } from '../api/content'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAsyncData, useSite } from '../store/site'
import type { Product } from '../api/types'

/**
 * 产品详情：按 slug 取数（旧链接 /product/spore-powder 因 slug 沿用原 id 而不变），
 * 命中 legacyId 时服务端回 relocated + canonicalSlug，前台据此把地址改写成语义 slug（规划 §7.3）。
 */
export default function ProductDetail() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { lang, setting, termName } = useSite()

  const { data: product, loading } = useAsyncData(
    () => fetchDetail('products', slug, lang) as Promise<{ data: Product | null; offline: boolean }>,
    [slug, lang],
  )

  // 地址归一：命中 legacyId 的旧链接改写为语义 slug（产品表无浏览量字段，不上报 view）
  useEffect(() => {
    if (product?.relocated && product.canonicalSlug) navigate(`/product/${product.canonicalSlug}`, { replace: true })
  }, [product, navigate])

  usePageMeta(null, {
    title: product ? `${product.name} — ${termName('product_category', product.categorySlug)}` : '',
    description: product?.summary || product?.tagline || '',
    keywords: product?.name || '',
  })

  if (loading && !product) return <PageLoading />

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-5 text-center">
        <p className="font-serif-sc text-3xl tracking-widest text-forest">
          {setting('ui.productNotFound', '未找到该产品')}
        </p>
        <p className="mt-4 text-sm text-ink-soft">
          {setting('ui.productNotFoundDesc', '您访问的产品不存在或已下架')}
        </p>
        <Link
          to="/products"
          className="mt-10 inline-flex items-center gap-2 bg-forest px-8 py-3 text-sm tracking-widest text-cream transition-colors hover:bg-forest-light"
        >
          <ChevronLeft className="h-4 w-4" />
          {setting('ui.productBack', '返回产品中心')}
        </Link>
      </div>
    )
  }

  const certs = product.certs ?? []
  const params = product.params ?? []
  const features = product.features ?? []
  const audiences = product.audiences ?? []
  const related = product.related ?? []
  const buyUrl = product.shopUrl ?? ''

  return (
    <div>
      {/* hero */}
      <section className="grain relative overflow-hidden bg-forest-deep pb-16 pt-32 text-cream lg:pb-20 lg:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgb(var(--c-gold)/0.2),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm tracking-widest text-cream/60 transition-colors hover:text-gold-light"
          >
            <ChevronLeft className="h-4 w-4" />
            {setting('ui.productCrumb', '产品中心')}
          </Link>

          <div className="mt-10 grid gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <div className="flex h-80 items-center justify-center bg-cream/5 p-10 lg:h-96">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="animate-floaty max-h-full object-contain drop-shadow-2xl"
                  />
                ) : null}
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div>
                <p className="text-[10px] tracking-[0.4em] text-gold-light">{product.nameEn}</p>
                <h1 className="mt-3 font-serif-sc text-4xl font-semibold tracking-wider lg:text-5xl">
                  {product.name}
                </h1>
                <p className="mt-4 border-l-2 border-gold/60 pl-4 font-serif-sc text-lg leading-8 text-gold-light">
                  {product.tagline}
                </p>
                <p className="mt-6 text-sm leading-8 text-cream/75 lg:text-base">{product.description}</p>

                {/* certs */}
                {certs.length ? (
                  <div className="mt-7 flex flex-wrap gap-2.5">
                    {certs.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 border border-gold/40 px-3 py-1.5 text-xs tracking-wider text-gold-light"
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {buyUrl ? (
                    <a
                      href={buyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-gold px-8 py-3.5 text-sm tracking-widest text-forest transition-colors hover:bg-gold-light"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {setting('ui.productBuyBtn', '前往官方商城购买')}
                    </a>
                  ) : null}
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 border border-cream/40 px-8 py-3.5 text-sm tracking-widest text-cream transition-colors hover:border-gold hover:text-gold-light"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {setting('ui.productConsult', '咨询客服')}
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </section>

      {/* details */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
                <span>{setting('ui.productParams', '产品参数')}</span>
              </h2>
              <dl className="mt-8 divide-y divide-forest/8 border-y border-forest/8">
                {params.map((p) => (
                  <div key={p.label} className="grid grid-cols-3 gap-4 py-4">
                    <dt className="text-sm tracking-wider text-ink-soft">{p.label}</dt>
                    <dd className="col-span-2 text-sm leading-7 text-ink">{p.value}</dd>
                  </div>
                ))}
              </dl>
              {product.spec ? (
                <p className="mt-6 text-sm text-ink-soft">
                  {setting('ui.productSpecLabel', '规格：')}
                  <span className="text-ink">{product.spec}</span>
                </p>
              ) : null}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-8">
              <div>
                <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
                  <span>{setting('ui.productUsage', '食用方法')}</span>
                </h2>
                <p className="mt-6 border border-forest/10 bg-white p-6 text-sm leading-8 text-ink">
                  {product.usage}
                </p>
              </div>
              <div>
                <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
                  <span>{setting('ui.productFeatures', '特点与适用')}</span>
                </h2>
                <ul className="mt-6 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-ink">
                      <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
                  <span>{setting('ui.productAudiences', '适用人群')}</span>
                </h2>
                <div className="mt-6 flex flex-wrap gap-3">
                  {audiences.map((a) => (
                    <span
                      key={a}
                      className="border border-gold/40 bg-gold/5 px-5 py-2 text-sm tracking-widest text-forest"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* related products */}
      {related.length ? (
        <section className="bg-cream-deep/60 py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal>
              <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
                <span>{setting('ui.productRelated', '相关推荐')}</span>
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.id || p.slug} delay={i * 80}>
                  <Link
                    to={`/product/${p.slug || p.id}`}
                    className="group block border border-forest/10 bg-white p-6 transition-all duration-500 hover:-translate-y-2 hover:border-gold/50 hover:shadow-lg"
                  >
                    <div className="flex h-28 items-center justify-center bg-cream-deep/50 p-4">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : null}
                    </div>
                    <p className="mt-5 text-[10px] tracking-[0.3em] text-gold">
                      {termName('product_category', p.categorySlug)}
                    </p>
                    <h3 className="mt-2 font-serif-sc text-lg tracking-wider text-forest group-hover:text-gold">
                      {p.name}
                    </h3>
                    <p className="mt-2 text-xs text-ink-soft">{p.spec}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
