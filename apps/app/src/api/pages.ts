import { getJson, withFallback } from './http'
import { fallbackOf } from './fallback'
import type { PagePayload } from './types'

/** 整页装修数据（Section + 已解析的 Block + subNav） */
export async function fetchPage(key: string, lang?: string) {
  return withFallback<PagePayload>(
    () => getJson<PagePayload>(`/public/pages/${key}`, lang ? { lang } : {}),
    () => fallbackOf((snapshot) => snapshot.pages[key] ?? null),
  )
}
