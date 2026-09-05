import { getJson, withFallback } from './http'
import { EMPTY_BOOTSTRAP, fallbackOf } from './fallback'
import type { Bootstrap } from './types'

/**
 * 站点骨架：一次拿齐 site / theme / nav / taxonomies / locales / settings。
 * 失败时回落快照；连快照也拿不到则返回最小骨架，因此调用方拿到的 data 永远非空。
 */
export async function fetchBootstrap(lang?: string): Promise<{ data: Bootstrap; offline: boolean }> {
  try {
    const { data, offline } = await withFallback<Bootstrap>(
      () => getJson<Bootstrap>('/public/bootstrap', lang ? { lang } : {}),
      () => fallbackOf((snapshot) => snapshot.bootstrap),
    )
    return { data: data ?? EMPTY_BOOTSTRAP, offline }
  } catch {
    return { data: EMPTY_BOOTSTRAP, offline: true }
  }
}
