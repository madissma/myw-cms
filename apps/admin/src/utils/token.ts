const ACCESS_KEY = 'szb.admin.accessToken'
const REFRESH_KEY = 'szb.admin.refreshToken'

/**
 * token 放在 localStorage 而非 pinia 持久化插件：
 * request.ts 与路由守卫都要读它，抽成独立模块可避免 store 与 axios 互相 import。
 */
export function getAccessToken(): string {
  return localStorage.getItem(ACCESS_KEY) || ''
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_KEY) || ''
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
