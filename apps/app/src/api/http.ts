/**
 * 前台请求层：原生 fetch + 统一信封解包 + 超时 + 失败降级。
 *
 * 不用 axios 是因为 app 现有依赖里没有它，为几个只读接口新增依赖不划算；
 * 超时用 AbortController 实现，失败一律抛 ApiError，由调用方决定是否回落静态兜底。
 */

export const API_PREFIX = '/api/v1'

/** 开发期靠 vite proxy 转发，构建产物同源部署；跨域部署时用 VITE_API_BASE 覆盖 */
const RAW_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
export const API_BASE = `${RAW_BASE}${API_PREFIX}`

/** 只读接口 8s 足够，留言提交给更长的窗口 */
const DEFAULT_TIMEOUT = 8000
const MUTATE_TIMEOUT = 15000

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T | null
  traceId: string
}

export class ApiError extends Error {
  status: number
  code: number
  traceId: string

  constructor(message: string, options: { status?: number; code?: number; traceId?: string } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? 0
    this.code = options.code ?? -1
    this.traceId = options.traceId ?? ''
  }
}

export type QueryValue = string | number | boolean | null | undefined

export function buildQuery(query: Record<string, QueryValue> = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function apiUrl(path: string, query: Record<string, QueryValue> = {}): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}${buildQuery(query)}`
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  timeout?: number
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, timeout, signal } = options
  const controller = new AbortController()
  const ms = timeout ?? (method === 'GET' ? DEFAULT_TIMEOUT : MUTATE_TIMEOUT)
  const timer = setTimeout(() => controller.abort(), ms)
  // 调用方也传了 signal 时，任一取消即中止
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  let response: Response
  try {
    response = await fetch(apiUrl(path, query), {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
    })
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    throw new ApiError(aborted ? '请求超时' : '网络不可用', { status: aborted ? 408 : 0 })
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  let payload: ApiEnvelope<T> | null = null
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>
    } catch {
      payload = null
    }
  }

  if (!response.ok || !payload || payload.code !== 0) {
    const message = payload?.message || `请求失败（${response.status}）`
    throw new ApiError(message, { status: response.status, code: payload?.code, traceId: payload?.traceId })
  }
  return payload.data as T
}

export function getJson<T>(path: string, query?: Record<string, QueryValue>, options: { signal?: AbortSignal; timeout?: number } = {}) {
  return request<T>(path, { method: 'GET', query, ...options })
}

export function postJson<T>(path: string, body?: unknown, query?: Record<string, QueryValue>) {
  return request<T>(path, { method: 'POST', body, query })
}

/**
 * 兜底回落：接口不可用时用静态快照，把「后端故障」降级为「内容不是最新」（规划 §13）。
 * 回退项允许是异步的（快照文件单独分包，只在失败时才拉），
 * 404 不回落，交给页面渲染空态。
 */
export async function withFallback<T>(
  task: () => Promise<T>,
  fallback: () => T | null | Promise<T | null>,
): Promise<{ data: T | null; offline: boolean }> {
  try {
    return { data: await task(), offline: false }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw err
    let data: T | null = null
    try {
      data = await fallback()
    } catch {
      data = null
    }
    if (data === null || data === undefined) throw err
    if (import.meta.env.DEV) console.warn('[api] 回落静态兜底数据：', err instanceof Error ? err.message : err)
    return { data, offline: true }
  }
}
