import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import { SectionView } from '../blocks/BlocksRenderer'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData } from '../store/site'

/** 科技强企：研发中心 / 产线介绍 / 全剂型智造 / 校企合作 / 研发团队五个栏目 */
export default function Tech() {
  const { data, loading, sections } = usePageData('tech')
  usePageMeta(data?.page)

  if (!sections.length) return loading ? <PageLoading /> : null

  return (
    <div>
      <PageHeader page={data?.page} image="/images/hero-tech.jpg" />
      {sections.map((section) => (
        <SectionView key={section.id || section.anchor} page="tech" section={section} />
      ))}
    </div>
  )
}
