import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import { BlockView, SectionView } from '../blocks/BlocksRenderer'
import { itemText, toItems, type BlockItem } from '../blocks/types'
import { fetchList } from '../api/content'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAsyncData, usePageData, useSite } from '../store/site'
import type { Product } from '../api/types'

/**
 * 产品中心：列表模板取自 Page(key=products) 的 entity_list 区块（已解析出全量产品），
 * 分类 tab 由 Term(product_category) 驱动、深链沿用 Term.anchor（规划 10.6：/products#baojian 不失效）；
 * 关键词非空时改走接口检索，兼顾产品数超过区块上限的情况。
 */
const ALL = 'all'

export default function Products() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data, loading, sections } = usePageData('products')
  const { terms, setting, lang } = useSite()
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  usePageMeta(data?.page)

  const categories = terms('product_category')

  // 300ms 去抖，避免每敲一个字打一次接口
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), 300)
    return () => clearTimeout(timer)
  }, [keyword])

  const active = useMemo(() => {
    const hash = location.hash.replace('#', '')
    if (!hash) return ALL
    const hit = categories.find((term) => term.anchor === hash || term.slug === hash)
    return hit?.slug ?? ALL
  }, [location.hash, categories])

  const listSection = sections.find((section) => section.anchor === 'list')
  const template = listSection?.blocks.find((block) => block.type === 'entity_list')
  const baseItems = useMemo(() => toItems(template?.props?.items), [template])

  const { data: searched } = useAsyncData(
    () =>
      debounced
        ? fetchList<Product>('products', { keyword: debounced, pageSize: 60, lang })
        : Promise.resolve({ data: null, offline: false }),
    [debounced, lang],
  )
  const remoteItems = searched?.list?.length ? (searched.list as unknown as BlockItem[]) : null

  const items = useMemo(() => {
    const source = remoteItems ?? baseItems
    const kw = debounced.toLowerCase()
    return source.filter((item) => {
      if (active !== ALL && itemText(item, 'categorySlug') !== active) return false
      // 接口已按关键词命中，不再本地二次过滤，以免漏掉服务端匹配的字段
      if (!kw || remoteItems) return true
      const hay = [
        itemText(item, 'name', 'title'),
        itemText(item, 'nameEn'),
        itemText(item, 'tagline', 'summary'),
        itemText(item, 'tag'),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(kw)
    })
  }, [remoteItems, baseItems, active, debounced])

  const selectFilter = (slug: string) => {
    if (slug === ALL) {
      navigate('/products', { replace: true })
      return
    }
    const term = categories.find((item) => item.slug === slug)
    navigate(`/products#${term?.anchor || term?.slug || slug}`, { replace: true })
  }

  if (!sections.length) return loading ? <PageLoading /> : null

  const tabs = [
    { slug: ALL, label: setting('ui.productsFilterAll', '全部') },
    ...categories.map((term) => ({ slug: term.slug, label: term.name })),
  ]

  return (
    <div>
      <PageHeader page={data?.page} image="/images/hero-lingzhi.jpg" />

      {/* filter & search */}
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.slug}
              onClick={() => selectFilter(tab.slug)}
              className={`border px-5 py-2.5 text-sm tracking-widest transition-colors ${
                active === tab.slug
                  ? 'border-forest bg-forest text-cream'
                  : 'border-forest/20 text-ink-soft hover:border-gold hover:text-gold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={setting('ui.productsSearchPlaceholder', '搜索产品名称 / 关键词')}
            className="w-full border border-forest/20 bg-white py-2.5 pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft/50 focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* product grid：沿用区块的 catalog 版式，仅把 items 换成过滤后的结果 */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        {items.length === 0 ? (
          <div className="border border-forest/10 bg-white py-20 text-center">
            <p className="font-serif-sc text-xl tracking-widest text-forest">
              {setting('ui.productsEmptyTitle', '未找到相关产品')}
            </p>
            <p className="mt-3 text-sm text-ink-soft">{setting('ui.productsEmptyDesc', '换个关键词试试吧')}</p>
          </div>
        ) : template ? (
          <BlockView
            block={{ ...template, props: { ...template.props, items } }}
            page="products"
            section="list"
          />
        ) : null}
      </section>

      {sections
        .filter((section) => section.anchor !== 'list')
        .map((section) => (
          <SectionView key={section.id || section.anchor} page="products" section={section} />
        ))}
    </div>
  )
}
