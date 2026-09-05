import { http } from '../request'
import type { LoginResult, UserProfile } from '@/types/api'

export function login(username: string, password: string): Promise<LoginResult> {
  return http.post<LoginResult>('/auth/login', { username, password })
}

export function profile(): Promise<UserProfile> {
  return http.get<UserProfile>('/auth/profile')
}

/** 后端返回的是裸 user 行（不含权限点），调用方更新后再 fetchProfile 刷新快照 */
export function updateProfile(data: { name: string; email?: string; phone?: string; avatar?: string }): Promise<Partial<UserProfile>> {
  return http.patch<Partial<UserProfile>>('/auth/profile', data)
}

export function changePassword(oldPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return http.patch<{ ok: boolean }>('/auth/password', { oldPassword, newPassword })
}
