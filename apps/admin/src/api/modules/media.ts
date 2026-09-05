import { http } from '../request'
import type { ListQuery, PageResult } from '@/types/api'

export interface MediaItem {
  id: string
  url: string
  name: string
  mime: string | null
  size: number | null
  width: number | null
  height: number | null
  alt: string | null
  folder: string | null
  usedBy: number
  createdAt: string
  references?: number
}

/**
 * 上传走统一的 axios 实例而不是 el-upload 的直传：
 * 请求拦截器负责注入 Bearer（含 401 后刷新重试），响应拦截器负责拆信封与弹错，
 * 组件里只关心拿到 url 之后怎么摆。
 */
export function uploadMedia(file: File, alt?: string): Promise<MediaItem> {
  const form = new FormData()
  form.append('file', file)
  if (alt) form.append('alt', alt)
  return http.post<MediaItem>('/admin/media/upload', form)
}

/** 服务端单次最多 10 个文件 */
export function uploadMediaBatch(files: File[]): Promise<MediaItem[]> {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  return http.post<MediaItem[]>('/admin/media/upload/batch', form)
}

export function listMedia(
  query: ListQuery & { folder?: string; type?: string } = {},
): Promise<PageResult<MediaItem>> {
  return http.get<PageResult<MediaItem>>('/admin/media', query as Record<string, unknown>)
}

export function mediaFolders(): Promise<string[]> {
  return http.get<string[]>('/admin/media/folders')
}

export function mediaReferences(url: string): Promise<{ url: string; count: number }> {
  return http.get<{ url: string; count: number }>('/admin/media/references', { url })
}

export function getMedia(id: string): Promise<MediaItem> {
  return http.get<MediaItem>(`/admin/media/${id}`)
}

export function updateMedia(id: string, data: Partial<MediaItem>): Promise<MediaItem> {
  return http.put<MediaItem>(`/admin/media/${id}`, data)
}

/** 有引用时后端会拒绝删除，除非 force；回传的 references 是删除前实测的引用数 */
export function deleteMedia(id: string, force = false): Promise<{ ok: boolean; references: number }> {
  return http.delete<{ ok: boolean; references: number }>(`/admin/media/${id}${force ? '?force=1' : ''}`)
}
