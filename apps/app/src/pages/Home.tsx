import { SectionView } from '../blocks/BlocksRenderer'
import PageLoading from '../components/PageLoading'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData } from '../store/site'

/**
 * 首页：7 个栏目（轮播 / 数据条 / 关于 / 精选产品 / 绿色基地 / 企业动态 / 商城引导）
 * 全部由 Page(key=home) 的 Section + Block 驱动，后台「页面装修」可直接增删改。
 */
export default function Home() {
  const { data, loading, sections } = usePageData('home')
  usePageMeta(data?.page)

  if (!sections.length) return loading ? <PageLoading /> : null

  return (
    <div>
      {sections.map((section) => (
        <SectionView key={section.id || section.anchor} page="home" section={section} />
      ))}
    </div>
  )
}
