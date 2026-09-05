import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import { SectionView } from '../blocks/BlocksRenderer'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData, useSite } from '../store/site'

/**
 * 媒体中心：视频区读 Video，动态区读 News。
 * 标题行右侧的「N CATEGORIES · M ARTICLES」为运行时派生
 * （原页面把分类数写死为 5，规划 §2 要求按 news_category 实际数量渲染）。
 */
export default function Media() {
  const { data, loading, sections } = usePageData('media')
  const { terms } = useSite()
  usePageMeta(data?.page)

  if (!sections.length) return loading ? <PageLoading /> : null

  const newsSection = sections.find((section) => section.anchor === 'news')
  const articles = (newsSection?.blocks ?? []).reduce(
    (total, block) => total + (Array.isArray(block.props?.items) ? block.props.items.length : 0),
    0,
  )
  const categories = terms('news_category').length
  const counter =
    newsSection && articles > 0 ? (
      <p className="text-xs tracking-[0.2em] text-ink-soft">
        {categories} CATEGORIES · {articles} ARTICLES
      </p>
    ) : undefined

  return (
    <div>
      <PageHeader page={data?.page} image="/images/base-aerial.jpg" />
      {sections.map((section) => (
        <SectionView
          key={section.id || section.anchor}
          page="media"
          section={section}
          more={section.anchor === 'news' ? counter : undefined}
        />
      ))}
    </div>
  )
}
