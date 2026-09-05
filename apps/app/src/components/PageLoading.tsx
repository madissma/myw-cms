import { useSite } from '../store/site'

/**
 * 数据未到位时的占位（规划 §7.2 静态兜底的最后一道）。
 *
 * 正常情况下接口失败会回落到 data/fallback.ts 快照，走不到这里；
 * 只有快照也拿不到（如基础路径配错）才会出现，保留品牌视觉以免白屏。
 */
export default function PageLoading({ label = '内容加载中' }: { label?: string }) {
  const { site } = useSite()
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-forest-deep px-5 text-center">
      <div>
        <div className="gold-rule text-sm tracking-[0.4em] text-gold-light">
          <span>{site.brand.nameEn}</span>
        </div>
        <p className="mt-5 font-serif-sc text-xl tracking-[0.3em] text-cream/70">{label}</p>
      </div>
    </section>
  )
}
