import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import Reveal from '../components/Reveal'
import { SectionInner, SectionView } from '../blocks/BlocksRenderer'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData } from '../store/site'
import type { SectionPayload } from '../api/types'

/**
 * 联系我们：info / form 两个栏目合成一个 5 栏栅格（2 + 3），
 * 与现网版式一致；表单提交走 POST /public/messages，成功后由后台可配的文案接管。
 */
export default function Contact() {
  const { data, loading, sections } = usePageData('contact')
  usePageMeta(data?.page)

  if (!sections.length) return loading ? <PageLoading /> : null

  const pick = (anchor: string): SectionPayload | undefined =>
    sections.find((section) => section.anchor === anchor)
  const info = pick('info')
  const form = pick('form')
  const rest = sections.filter((section) => section.anchor !== 'info' && section.anchor !== 'form')

  return (
    <div>
      <PageHeader page={data?.page} image="/images/hero-forest.jpg" />

      {info || form ? (
        <section id="info" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-5">
            {info ? (
              <Reveal className="lg:col-span-2">
                <SectionInner page="contact" section={info} />
              </Reveal>
            ) : null}
            {form ? (
              <Reveal delay={150} className="lg:col-span-3">
                <SectionInner page="contact" section={form} />
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {rest.map((section) => (
        <SectionView key={section.id || section.anchor} page="contact" section={section} />
      ))}
    </div>
  )
}
