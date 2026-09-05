import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import { SectionView } from '../blocks/BlocksRenderer'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData } from '../store/site'

/** 顾客口碑：好评率数据条 + 口碑列表（数据源为 Review 表，后台增删即时生效） */
export default function Voice() {
  const { data, loading, sections } = usePageData('voice')
  usePageMeta(data?.page)

  if (!sections.length) return loading ? <PageLoading /> : null

  return (
    <div>
      <PageHeader page={data?.page} image="/images/base-cultivation.jpg" />
      {sections.map((section) => (
        <SectionView key={section.id || section.anchor} page="voice" section={section} />
      ))}
    </div>
  )
}
