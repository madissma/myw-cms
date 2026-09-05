import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { fetchBootstrap } from '../api/bootstrap'
import { fetchPage } from '../api/pages'
import { EMPTY_BOOTSTRAP } from '../api/fallback'
import { applySiteMeta, applyTheme } from '../theme/applyTheme'
import type {
  Bootstrap,
  LocaleOption,
  NavNode,
  PagePayload,
  SiteConfig,
  TaxonomyDict,
  TermNode,
  ThemePayload,
} from '../api/types'

/**
 * 站点数据层。本文件刻意不含任何组件：
 * 组件（SiteProvider）放在 SiteProvider.tsx，这样这里的 hook 与工具导出
 * 不会破坏 React Fast Refresh 的「一个文件只导出组件」要求。
 */

/** 语言偏好持久化键（规划 §8：切换写入 localStorage，请求带 ?lang=） */
const LANG_KEY = 'szb.lang'

function readStoredLang(): string {
  try {
    return localStorage.getItem(LANG_KEY) ?? ''
  } catch {
    return ''
  }
}

// ==================== bootstrap 外部 store ====================

export interface BootstrapEntry {
  data: Bootstrap
  /** 接口不可用、当前展示的是静态兜底数据 */
  offline: boolean
}

/**
 * bootstrap 存成 React 之外的最小外部 store，而不是 Provider 内部 state：
 * main.tsx 要在 render 之前预取并注入主题色，语言切换也要在异步回调里整体换血，
 * 两边都需要同一个真源，组件侧用 useSyncExternalStore 订阅即可，无需在 effect 里补 setState。
 */
let preloaded: BootstrapEntry | null = null
let inflight: Promise<void> | null = null
let snapshot: BootstrapEntry = { data: EMPTY_BOOTSTRAP, offline: false }
const listeners = new Set<() => void>()

function getSnapshot(): BootstrapEntry {
  return snapshot
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 唯一写入点：更新 store 的同时把配色与站点标题/favicon 同步到 DOM */
function publish(entry: BootstrapEntry): void {
  preloaded = entry
  snapshot = entry
  applyTheme(entry.data.theme)
  applySiteMeta(entry.data.site.name, entry.data.site.brand.favicon)
  for (const listener of listeners) listener()
}

/** main.tsx 首屏预取；并发调用共享同一次请求 */
export function preloadBootstrap(): Promise<void> {
  if (preloaded) return Promise.resolve()
  if (!inflight) {
    inflight = fetchBootstrap(readStoredLang() || undefined).then((entry) => {
      publish(entry)
    })
    void inflight.finally(() => {
      inflight = null
    })
  }
  return inflight
}

/** 预取未赶上首屏（超时抢跑渲染、HMR 后重载）时补一次 */
export function ensureBootstrap(): Promise<void> {
  if (preloaded) return Promise.resolve()
  return preloadBootstrap().catch(() => undefined)
}

/** 在 React 之外（如 main.tsx）读取已预取的站点骨架 */
export function getCachedBootstrap(): Bootstrap | null {
  return preloaded?.data ?? null
}

// ==================== 整页数据缓存 ====================

const pageCache = new Map<string, PagePayload>()

export function invalidatePageCache(): void {
  pageCache.clear()
}

// ==================== Context ====================

export interface SiteContextValue {
  ready: boolean
  offline: boolean
  bootstrap: Bootstrap
  site: SiteConfig
  settings: Record<string, unknown>
  theme: ThemePayload | null
  nav: { header: NavNode[]; footer: NavNode[] }
  taxonomies: TaxonomyDict
  locales: LocaleOption[]
  lang: string
  setLang: (code: string) => void
  /** Setting 取值，缺失时回传入的兜底值 */
  setting: <T = string>(key: string, fallback?: T) => T
  terms: (taxonomyKey: string) => TermNode[]
  termName: (taxonomyKey: string, slug?: string | null) => string
}

export const SiteContext = createContext<SiteContextValue | null>(null)

/** 供 SiteProvider 使用：订阅 bootstrap store + 语言切换 */
export function useSiteValue(): SiteContextValue {
  const entry = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [lang, setLangState] = useState<string>(() => readStoredLang())
  const [pendingLang, setPendingLang] = useState<string>('')
  const bootstrap = entry.data

  useEffect(() => {
    void ensureBootstrap()
  }, [])

  const setLang = useCallback((code: string) => {
    try {
      if (code) localStorage.setItem(LANG_KEY, code)
      else localStorage.removeItem(LANG_KEY)
    } catch {
      /* 隐私模式下忽略 */
    }
    setLangState(code)
    setPendingLang(code)
    invalidatePageCache()
    fetchBootstrap(code || undefined).then(
      (next) => {
        publish(next)
        setPendingLang('')
      },
      () => {
        setPendingLang('')
      },
    )
  }, [])

  return useMemo<SiteContextValue>(() => {
    const site = bootstrap.site ?? EMPTY_BOOTSTRAP.site
    const setting = <T = string,>(key: string, fallback?: T): T => {
      const raw = (bootstrap.settings ?? {})[key]
      return (raw === undefined || raw === null || raw === '' ? (fallback as T) : (raw as T))
    }
    const terms = (taxonomyKey: string) => bootstrap.taxonomies?.[taxonomyKey] ?? []
    return {
      ready: bootstrap !== EMPTY_BOOTSTRAP,
      offline: entry.offline,
      bootstrap,
      site,
      settings: bootstrap.settings ?? {},
      theme: bootstrap.theme ?? null,
      nav: bootstrap.nav ?? { header: [], footer: [] },
      taxonomies: bootstrap.taxonomies ?? {},
      locales: bootstrap.locales?.list ?? [],
      lang: pendingLang || lang || bootstrap.lang || 'zh-CN',
      setLang,
      setting,
      terms,
      termName: (taxonomyKey: string, slug?: string | null) =>
        terms(taxonomyKey).find((term) => term.slug === slug)?.name ?? slug ?? '',
    }
  }, [bootstrap, entry.offline, lang, pendingLang, setLang])
}

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite() 必须在 <SiteProvider> 内使用')
  return ctx
}

// ==================== 数据钩子 ====================

/**
 * 整页装修数据：命中缓存时在渲染期直接取值（不在 effect 里补 setState），
 * 未命中才拉接口，结果落在 settled 里并按 cacheKey 判新旧。
 */
export function usePageData(key: string) {
  const { lang } = useSite()
  const cacheKey = `${key}:${lang}`
  const [settled, setSettled] = useState<{ key: string; data: PagePayload | null; offline: boolean } | null>(
    null,
  )
  const matched = settled?.key === cacheKey ? settled : null
  const cached = matched ? null : pageCache.get(cacheKey) ?? null
  const data = matched ? matched.data : cached
  const offline = matched?.offline ?? false
  const loading = !matched && !cached

  useEffect(() => {
    if (pageCache.has(cacheKey)) return
    let alive = true
    fetchPage(key, lang).then(
      ({ data: payload, offline: degraded }) => {
        if (!alive) return
        if (payload) pageCache.set(cacheKey, payload)
        setSettled({ key: cacheKey, data: payload, offline: degraded })
      },
      () => {
        if (alive) setSettled({ key: cacheKey, data: null, offline: false })
      },
    )
    return () => {
      alive = false
    }
  }, [key, lang, cacheKey])

  return { data, loading, offline, sections: data?.sections ?? [], subNav: data?.subNav ?? [] }
}

/** deps 指纹：本项目的依赖全是原始值，对象按 JSON 归一（新增区块类型不会传到这儿） */
function fingerprint(deps: unknown[]): string {
  return deps.map((dep) => (typeof dep === 'object' ? JSON.stringify(dep) : String(dep))).join('\u0000')
}

/** 通用异步数据：调用方自行组合 fetch + 回落，这里只管 loading / offline */
export function useAsyncData<T>(task: () => Promise<{ data: T | null; offline: boolean }>, deps: unknown[]) {
  const fp = fingerprint(deps)
  const [state, setState] = useState<{ fp: string; data: T | null; offline: boolean } | null>(null)
  const matched = state && state.fp === fp ? state : null

  useEffect(() => {
    let alive = true
    task().then(
      (result) => {
        if (alive) setState({ fp, data: result.data, offline: result.offline })
      },
      () => {
        if (alive) setState({ fp, data: null, offline: false })
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fp])

  return { data: matched?.data ?? null, loading: !matched, offline: matched?.offline ?? false }
}
