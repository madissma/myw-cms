import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'
import PageLoading from '../components/PageLoading'
import { SectionView } from '../blocks/BlocksRenderer'
import { usePageMeta } from '../hooks/usePageMeta'
import { usePageData, useSite } from '../store/site'

/**
 * 走进森芝宝：左侧子导航由 Section.showInSubNav 汇总（服务端 subNav），
 * 五个栏目在正文栏内以 contained 模式渲染，段间距由版式表控制。
 */
export default function About() {
  const { data, loading, sections, subNav } = usePageData('about')
  const { setting } = useSite()
  const [active, setActive] = useState('')
  usePageMeta(data?.page)

  const aside = {
    title: setting('ui.aboutAsideTitle', '商务合作'),
    desc: setting('ui.aboutAsideDesc', '原料供应 · OEM/ODM · 经销代理'),
    btn: setting('ui.aboutAsideBtn', '联系我们'),
  }

  const anchors = useMemo(() => subNav.map((item) => item.anchor).join(','), [subNav])

  useEffect(() => {
    const list = anchors ? anchors.split(',') : []
    if (!list.length) return
    const onScroll = () => {
      const offset = 180
      let current = list[0]
      for (const id of list) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= offset) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [anchors])

  if (!sections.length) return loading ? <PageLoading /> : null

  return (
    <div>
      <PageHeader page={data?.page} image="/images/hero-lingzhi.jpg" />

      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-16 lg:flex-row lg:px-8">
        {/* ================= side subnav ================= */}
        <aside className="mb-4 shrink-0 lg:mb-0 lg:w-52 lg:self-start lg:sticky lg:top-28">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:border-l lg:border-forest/15">
            {subNav.map((s) => (
              <Link
                key={s.anchor}
                to={`/about#${s.anchor}`}
                className={`whitespace-nowrap px-4 py-2.5 text-[14px] tracking-[0.15em] transition-colors lg:-ml-px lg:border-l-2 lg:py-3.5 ${
                  active === s.anchor
                    ? 'border-gold bg-white/70 font-medium text-forest'
                    : 'border-transparent text-ink-soft hover:text-forest'
                }`}
              >
                {s.label}
              </Link>
            ))}

            {/* business cooperation */}
            <div className="mt-6 whitespace-nowrap px-4 lg:mt-8 lg:border-t lg:border-forest/15 lg:px-0 lg:pt-6">
              <p className="font-serif-sc text-base tracking-wider text-forest">{aside.title}</p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{aside.desc}</p>
              <Link
                to="/contact"
                className="mt-3 inline-block border border-gold px-5 py-2 text-xs tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-cream"
              >
                {aside.btn}
              </Link>
            </div>
          </div>
        </aside>

        {/* ================= content ================= */}
        <div className="min-w-0 flex-1">
          {sections.map((section) => (
            <SectionView key={section.id || section.anchor} page="about" section={section} contained />
          ))}
        </div>
      </div>
    </div>
  )
}
