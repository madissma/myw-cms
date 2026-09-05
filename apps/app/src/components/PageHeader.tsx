import Reveal from './Reveal'
import { useSite } from '../store/site'
import type { PageRecord } from '../api/types'

/**
 * 内页页头：文案与配图全部来自 Page 的 hero* 字段（规划 §2 末行、§7.3）。
 *
 * page 为空（接口与快照都没拿到）时退化为站点名 + 无底图，不留空白区块。
 */
interface PageHeaderProps {
  page?: PageRecord | null
  /** 页头底图兜底，仅在 heroImage 缺失时使用 */
  image?: string
}

export default function PageHeader({ page, image }: PageHeaderProps) {
  const { site } = useSite()
  const title = page?.heroTitle || page?.name || site.brand.name
  const subtitle = page?.heroSubtitle || site.summary
  const en = page?.heroEn || site.brand.nameEn
  const background = page?.heroImage || image

  return (
    <section className="relative flex min-h-[420px] items-end overflow-hidden bg-forest-deep md:min-h-[520px]">
      {/* 页头照片保持本色：不叠品牌色渐变遮罩，也不压暗（早先 opacity-55 会把照片融进底色的深红） */}
      {background ? (
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

      {/* decorative outline text */}
      <span className="text-outline pointer-events-none absolute -right-6 top-16 hidden select-none font-serif-sc text-[9rem] leading-none lg:block">
        {en}
      </span>

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 lg:px-8">
        <Reveal>
          <div className="gold-rule text-sm tracking-[0.4em] text-gold-light">
            <span>{site.brand.headerEyebrow}</span>
          </div>
          <h1 className="mt-5 font-serif-sc text-4xl font-semibold tracking-widest text-cream lg:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-cream/75 lg:text-base">{subtitle}</p>
          ) : null}
        </Reveal>
      </div>

      {/* bottom gold hairline */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
    </section>
  )
}
