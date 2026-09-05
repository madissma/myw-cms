import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import { SectionView } from '../blocks/BlocksRenderer'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData } from '../store/site'

/**
 * 官方商城：渠道卡片读 Term(shop_channel).url，热销读 Product.isHot，
 * 原页面里写死的四个产品 id 与 tmall.com 均已下沉到数据（规划 §2）。
 */
export default function Mall() {
  const { data, loading, sections } = usePageData('mall')
  usePageMeta(data?.page)

  if (!sections.length) return loading ? <PageLoading /> : null

  return (
    <div>
      <PageHeader page={data?.page} image="/images/hero-lingzhi.jpg" />
      {sections.map((section) => (
        <SectionView key={section.id || section.anchor} page="mall" section={section} />
      ))}
    </div>
  )
}
