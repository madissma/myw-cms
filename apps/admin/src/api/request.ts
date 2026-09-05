import axios from 'axios'
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/utils/token'
import type { ApiEnvelope, TokenPair } from '@/types/api'

export const API_PREFIX = '/api/v1'

/** 拦截器已解包信封，这里补一个「重试标记 + 静默开关」的扩展类型 */
interface RetriableConfig extends InternalAxiosRequestConfig {
  /** 401 后是否已经用新 token 重试过 */
  _retried?: boolean
  /** 业务层自行提示时置 true，拦截器不再弹 toast */
  silent?: boolean
}

const service: AxiosInstance = axios.create({
  baseURL: API_PREFIX,
  timeout: 20000,
  withCredentials: false,
})

/** 登录失效后的跳转由 main.ts 注入，避免 axios 反向 import router 造成循环依赖 */
let unauthorizedHandler: ((message: string) => void) | null = null

export function setUnauthorizedHandler(fn: (message: string) => void): void {
  unauthorizedHandler = fn
}

service.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

/** 同一时刻只允许一次刷新，其余 401 请求排队等它 */
let refreshing: Promise<string> | null = null

function refreshOnce(): Promise<string> {
  if (!refreshing) {
    refreshing = axios
      // 后端契约字段名为 refreshToken（见 server 的 RefreshDto）
      .post<ApiEnvelope<TokenPair>>(`${API_PREFIX}/auth/refresh`, { refreshToken: getRefreshToken() }, { timeout: 15000 })
      .then((res) => {
        const pair = res.data?.data
        if (!pair?.accessToken) throw new Error('刷新凭证失效')
        setTokens(pair.accessToken, pair.refreshToken)
        return pair.accessToken
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

function notify(config: AxiosRequestConfig | undefined, message: string): void {
  if ((config as RetriableConfig | undefined)?.silent) return
  ElMessage.closeAll()
  ElMessage.error(message)
}

function reject(message: string, traceId?: string): Promise<never> {
  const err = new Error(traceId ? `${message}（${traceId}）` : message) as Error & { traceId?: string }
  err.traceId = traceId
  return Promise.reject(err)
}

service.interceptors.response.use(
  (response) => {
    const config = response.config as RetriableConfig
    // 文件下载等二进制响应不做解包，交由调用方处理
    if (config.responseType === 'blob' || config.responseType === 'arraybuffer') return response

    const body = response.data as ApiEnvelope<unknown> | undefined
    if (!body || typeof body !== 'object' || typeof body.code !== 'number') {
      return response.data
    }
    if (body.code === 0) return body.data

    notify(config, body.message || '请求失败')
    return reject(body.message || '请求失败', body.traceId)
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status ?? 0
    const url = config?.url || ''

    if (!error.response) {
      const timeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')
      notify(config, timeout ? '请求超时，请稍后重试' : '无法连接服务器，请确认后端已启动')
      return reject(timeout ? '请求超时' : '网络异常')
    }

    // 登录与刷新接口自身的 401 不能再走刷新逻辑
    const isAuthEntry = url.includes('/auth/login') || url.includes('/auth/refresh')

    if (status === 401 && config && !config._retried && !isAuthEntry && getRefreshToken()) {
      try {
        config._retried = true
        const token = await refreshOnce()
        config.headers?.set?.('Authorization', `Bearer ${token}`)
        return service.request(config)
      } catch {
        // 刷新失败，落到下面的登出分支
      }
    }

    if (status === 401) {
      clearTokens()
      const message = error.response.data?.message || '登录状态已失效，请重新登录'
      if (isAuthEntry) notify(config, message)
      unauthorizedHandler?.(message)
      return reject(message)
    }

    const body = error.response.data as { message?: unknown; traceId?: string } | undefined
    const raw = body?.message
    const message =
      (typeof raw === 'string' && raw) ||
      (Array.isArray(raw) ? (raw as string[]).join('；') : '') ||
      `${status} 请求失败`
    notify(config, status === 403 ? `无权操作：${message}` : message)
    return reject(message, body?.traceId)
  },
)

/** 统一出口：调用方拿到的是已解包的 data */
export const http = {
  get: <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) =>
    service.get(url, { ...config, method: 'GET', params }) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    service.post(url, data, { ...config, method: 'POST' }) as unknown as Promise<T>,
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    service.put(url, data, { ...config, method: 'PUT' }) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    service.patch(url, data, { ...config, method: 'PATCH' }) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    service.delete(url, { ...config, method: 'DELETE' }) as unknown as Promise<T>,
}

/** CSV / 素材导出：走同一个实例以带上 Authorization，返回浏览器对象 URL */
export async function download(url: string, params: Record<string, unknown>, fallbackName: string): Promise<void> {
  const res = await service.get(url, { params, responseType: 'blob' })
  const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? ''
  const matched = /filename="?([^";]+)"?/i.exec(disposition)
  const blob = new Blob([res.data as unknown as BlobPart])
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = decodeURIComponent(matched?.[1] || fallbackName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}

export { clearTokens, getAccessToken }
export default service
