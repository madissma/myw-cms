import type { Bootstrap, FallbackSnapshot } from './types'

/**
 * 静态兜底快照的惰性入口。
 *
 * 快照（app/src/data/fallback.ts，生成物）体积约 200KB，正常访问一律走接口，
 * 因此用动态 import 让它单独分包，只在接口失败时才发起第二次请求，不给首屏增加负担。
 */
let task: Promise<FallbackSnapshot> | null = null

export function loadFallback(): Promise<FallbackSnapshot> {
  if (!task) {
    task = import('../data/fallback')
      .then((mod) => mod.FALLBACK)
      .catch((err) => {
        // 加载失败要允许下次重试，否则整站永久锁死在 null 上
        task = null
        throw err
      })
  }
  return task
}

export async function fallbackOf<T>(pick: (snapshot: FallbackSnapshot) => T | null): Promise<T | null> {
  try {
    return pick(await loadFallback())
  } catch {
    return null
  }
}

/**
 * 连快照都拿不到时的最小骨架：只保证 Navbar / Footer 不崩，页面渲染各自的空态。
 * 走到这一步说明既没有接口也没有静态资源，属极端环境（如错误的基础路径）。
 */
export const EMPTY_BOOTSTRAP: Bootstrap = {
  site: {
    name: '森芝宝',
    title: '森芝宝',
    description: '',
    keywords: '',
    slogan: '',
    summary: '',
    brand: {
      name: '森芝宝',
      nameEn: 'SENZHIBAO',
      logo: '芝',
      logoImage: '',
      favicon: '',
      companyName: '浙江森芝宝生物科技有限公司',
      headerEyebrow: '森芝宝 SENZHIBAO',
    },
    contact: { address: '', hotline: '', consumerHotline: '', email: '', hours: '' },
    footer: {
      about: '',
      social: '',
      sloganVertical: '',
      tagline: '',
      copyright: '',
      icp: '',
      police: '',
      nameEn: 'SENZHIBAO BIO-TECH',
    },
    social: { wechat: '', weibo: '', douyin: '' },
    analytics: { gaId: '' },
    form: { successTip: '' },
  },
  settings: {},
  theme: null,
  nav: { header: [], footer: [] },
  taxonomies: {},
  locales: { list: [], default: 'zh-CN' },
  lang: 'zh-CN',
}
