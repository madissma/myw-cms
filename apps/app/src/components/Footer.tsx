import { Link } from 'react-router'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import { useSite } from '../store/site'
import type { NavNode } from '../api/types'

/** 接口与快照都拿不到时的最小快速导航，保证页脚不为空 */
const FALLBACK_LINKS: NavNode[] = [
  { id: 'f-about', label: '走进森芝宝', path: '/about' },
  { id: 'f-products', label: '产品中心', path: '/products' },
  { id: 'f-tech', label: '科技强企', path: '/tech' },
  { id: 'f-media', label: '媒体中心', path: '/media' },
  { id: 'f-voice', label: '顾客口碑', path: '/voice' },
  { id: 'f-mall', label: '官方商城', path: '/mall' },
]

function FooterLink({ node }: { node: NavNode }) {
  const className = 'link-line text-sm text-cream/70 transition-colors hover:text-gold-light'
  if (/^https?:\/\//.test(node.path)) {
    return (
      <a href={node.path} target={node.target || '_blank'} rel="noreferrer" className={className}>
        {node.label}
      </a>
    )
  }
  return (
    <Link to={node.path} className={className}>
      {node.label}
    </Link>
  )
}

export default function Footer() {
  const { nav, site, setting } = useSite()
  const brand = site.brand
  const footer = site.footer
  const contact = site.contact
  const links = nav.footer.length ? nav.footer : FALLBACK_LINKS
  const record = [footer.icp, footer.police, footer.nameEn].filter(Boolean).join(' · ')

  return (
    <footer className="bg-forest-deep text-cream">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div>
            <div className="flex items-center gap-3">
              {brand.logoImage ? (
                <img src={brand.logoImage} alt={brand.name} className="h-10 w-10 shrink-0 object-contain" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-gold text-lg font-bold text-forest">
                  {brand.logo}
                </span>
              )}
              <span className="flex flex-col leading-none">
                <span className="font-serif-sc text-2xl font-semibold tracking-widest">{brand.name}</span>
                <span className="mt-1 text-[10px] tracking-[0.35em] text-gold-light">{brand.nameEn}</span>
              </span>
            </div>
            <p className="mt-5 text-sm leading-7 text-cream/70">{footer.about}</p>
            {footer.social ? (
              <p className="mt-4 text-xs leading-6 text-cream/40">{footer.social}</p>
            ) : null}
          </div>

          {/* quick links */}
          <div>
            <h3 className="gold-rule font-serif-sc text-lg tracking-widest">
              <span className="text-gold-light">{setting('ui.footerNavTitle', '快速导航')}</span>
            </h3>
            <ul className="mt-5 space-y-3">
              {links.map((item) => (
                <li key={`${item.path}-${item.label}`}>
                  <FooterLink node={item} />
                </li>
              ))}
            </ul>
          </div>

          {/* contact */}
          <div>
            <h3 className="gold-rule font-serif-sc text-lg tracking-widest">
              <span className="text-gold-light">{setting('ui.footerContactTitle', '联系我们')}</span>
            </h3>
            <ul className="mt-5 space-y-4 text-sm text-cream/70">
              {contact.address ? (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{contact.address}</span>
                </li>
              ) : null}
              {contact.hotline || contact.consumerHotline ? (
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>
                    {contact.hotline}
                    {setting('ui.footerHotlineSuffix', '（商务合作）')}
                    {contact.consumerHotline ? (
                      <>
                        <br />
                        {contact.consumerHotline}
                        {setting('ui.footerConsumerSuffix', '（消费者服务）')}
                      </>
                    ) : null}
                  </span>
                </li>
              ) : null}
              {contact.email ? (
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{contact.email}</span>
                </li>
              ) : null}
              {contact.hours ? (
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{contact.hours}</span>
                </li>
              ) : null}
            </ul>
          </div>

          {/* slogan */}
          <div className="flex flex-col justify-between">
            {footer.sloganVertical ? (
              <div className="v-text mx-auto hidden h-36 font-serif-sc text-sm tracking-[0.5em] text-gold-light/70 lg:block">
                {footer.sloganVertical}
              </div>
            ) : null}
            <p className="text-sm leading-7 text-cream/50">{footer.tagline}</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-8 text-xs text-cream/40 md:flex-row">
          <p>{footer.copyright}</p>
          {record ? <p>{record}</p> : null}
        </div>
      </div>
    </footer>
  )
}
