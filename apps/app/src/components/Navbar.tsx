import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { Menu, X, ChevronDown, Globe } from 'lucide-react'
import { useSite } from '../store/site'
import type { NavNode } from '../api/types'

/**
 * 导航完全由 bootstrap.nav.header 驱动（后台「导航栏目」维护）。
 * FALLBACK_NAV 只在既无接口也无快照的极端场景兜底，保证菜单不为空。
 */
const FALLBACK_NAV: NavNode[] = [
  { id: 'f-home', label: '网站首页', path: '/' },
  {
    id: 'f-about',
    label: '走进森芝宝',
    path: '/about',
    children: [
      { id: 'f-about-intro', label: '企业简介', path: '/about#intro' },
      { id: 'f-about-history', label: '发展历程', path: '/about#history' },
      { id: 'f-about-culture', label: '企业文化', path: '/about#culture' },
      { id: 'f-about-honors', label: '企业荣誉', path: '/about#honors' },
      { id: 'f-about-base', label: '绿色基地', path: '/about#base' },
    ],
  },
  {
    id: 'f-products',
    label: '产品中心',
    path: '/products',
    children: [
      { id: 'f-products-baojian', label: '保健食品', path: '/products#baojian' },
      { id: 'f-products-yaoshi', label: '药食同源', path: '/products#yaoshi' },
      { id: 'f-products-qita', label: '原料与服务', path: '/products#qita' },
    ],
  },
  {
    id: 'f-tech',
    label: '科技强企',
    path: '/tech',
    children: [
      { id: 'f-tech-rd', label: '研发中心', path: '/tech#rd' },
      { id: 'f-tech-lines', label: '产线介绍', path: '/tech#lines' },
      { id: 'f-tech-coop', label: '校企合作', path: '/tech#coop' },
    ],
  },
  {
    id: 'f-media',
    label: '媒体中心',
    path: '/media',
    children: [
      { id: 'f-media-videos', label: '企业视频', path: '/media#videos' },
      { id: 'f-media-news', label: '企业动态', path: '/media#news' },
    ],
  },
  { id: 'f-voice', label: '顾客口碑', path: '/voice' },
  { id: 'f-mall', label: '官方商城', path: '/mall' },
  { id: 'f-contact', label: '联系我们', path: '/contact' },
]

/** 内链走 Link，外链（后台可配 http(s) 或新窗口）走 a */
function NavItemLink({
  node,
  className,
  children,
}: {
  node: NavNode
  className: string
  children: ReactNode
}) {
  const external = /^https?:\/\//.test(node.path)
  if (external) {
    return (
      <a href={node.path} target={node.target || '_blank'} rel="noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={node.path} className={className}>
      {children}
    </Link>
  )
}

function LangSwitcher({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { locales, lang, setLang } = useSite()
  if (locales.length < 2) return null
  return (
    <div className="flex items-center gap-1">
      <Globe className={`h-3.5 w-3.5 ${tone === 'dark' ? 'text-gold-light/70' : 'text-gold'}`} />
      {locales.map((item) => {
        const active = item.code === lang
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(active ? '' : item.code)}
            aria-pressed={active}
            className={`px-1.5 text-[11px] tracking-[0.15em] transition-colors ${
              tone === 'dark'
                ? active
                  ? 'text-gold-light'
                  : 'text-cream/50 hover:text-gold-light'
                : active
                  ? 'text-gold'
                  : 'text-cream/60 hover:text-gold-light'
            }`}
          >
            {item.code === 'zh-CN' ? '中文' : item.nativeName || item.code}
          </button>
        )
      })}
    </div>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { nav, site } = useSite()

  const items = useMemo(() => (nav.header.length ? nav.header : FALLBACK_NAV), [nav.header])
  const brand = site.brand

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-forest-deep transition-all duration-500 ${
        scrolled ? 'shadow-[0_1px_0_rgb(var(--c-gold)/0.25)] backdrop-blur-sm' : ''
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:h-20 lg:px-8">
        {/* logo */}
        <Link to="/" className="flex items-center gap-3">
          {brand.logoImage ? (
            <img
              src={brand.logoImage}
              alt={brand.name}
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-gold text-lg font-bold text-forest">
              {brand.logo}
            </span>
          )}
          <span className="flex flex-col leading-none">
            <span className="font-serif-sc text-xl font-semibold tracking-widest text-cream">
              {brand.name}
            </span>
            <span className="mt-1 text-[10px] tracking-[0.35em] text-gold-light">{brand.nameEn}</span>
          </span>
        </Link>

        {/* desktop nav */}
        <div className="hidden items-center gap-6 lg:flex xl:gap-7">
          <nav className="flex items-center gap-6 xl:gap-7">
            {items.map((item) =>
              item.children?.length ? (
                <div key={item.path} className="group relative">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `link-line flex items-center gap-1 text-[15px] tracking-[0.12em] transition-colors ${
                        isActive ? 'active font-medium text-gold-light' : 'text-cream hover:text-gold-light'
                      }`
                    }
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
                  </NavLink>
                  {/* dropdown */}
                  <div className="invisible absolute left-1/2 top-full -translate-x-1/2 pt-4 opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100">
                    <div className="min-w-[150px] border border-forest/10 bg-cream py-2 shadow-[0_18px_40px_-18px_rgb(var(--c-forest-deep)/0.4)]">
                      {item.children.map((c) => (
                        <NavItemLink
                          key={`${c.path}-${c.label}`}
                          node={c}
                          className="block whitespace-nowrap px-5 py-2.5 text-[14px] tracking-[0.1em] text-ink-soft transition-colors hover:bg-secondary hover:text-forest"
                        >
                          {c.label}
                        </NavItemLink>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `link-line text-[15px] tracking-[0.12em] transition-colors ${
                      isActive ? 'active font-medium text-gold-light' : 'text-cream hover:text-gold-light'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className="border-l border-cream/15 pl-4">
            <LangSwitcher />
          </div>
        </div>

        {/* mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="切换菜单"
          className="rounded-sm p-2 text-cream lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-cream/10 bg-forest-deep px-5 pb-6 pt-2 lg:hidden">
          {items.map((item) => (
            <div key={item.path} onClick={() => setOpen(false)}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between border-b border-cream/10 py-3.5 font-serif-sc text-base tracking-wider ${
                    isActive ? 'text-gold-light' : 'text-cream'
                  }`
                }
              >
                {item.label}
                {item.children?.length ? <ChevronDown className="h-4 w-4 opacity-60" /> : null}
              </NavLink>
              {item.children?.length ? (
                <div className="border-b border-cream/10 pb-2">
                  {item.children.map((c) => (
                    <NavItemLink
                      key={`${c.path}-${c.label}`}
                      node={c}
                      className="block py-2.5 pl-5 text-sm tracking-wider text-cream/70 transition-colors hover:text-gold-light"
                    >
                      {c.label}
                    </NavItemLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <div className="flex justify-end border-t border-cream/10 pt-4">
            <LangSwitcher />
          </div>
        </nav>
      )}
    </header>
  )
}
