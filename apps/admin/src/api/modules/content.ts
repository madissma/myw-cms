import { http } from '../request'
import type { ListQuery, PageResult } from '@/types/api'

/** 与 server 的 content.registry.FormFieldMeta 对齐 */
export type ContentControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'switch'
  | 'date'
  | 'datetime'
  | 'richtext'
  | 'image'
  | 'images'
  | 'url'
  | 'tags'
  | 'pairs'
  | 'category'
  | 'status'
  | 'rating'

export type ContentGroup = 'base' | 'media' | 'detail' | 'seo' | 'sys'

export interface ContentField {
  name: string
  label: string
  control: ContentControl
  required: boolean
  group: ContentGroup
  taxonomy?: string
  placeholder?: string
  tip?: string
  width?: number
}

export interface ContentSchema {
  key: string
  delegate: string
  label: string
  perm: string
  required: string[]
  hasSlug: boolean
  hasCode: boolean
  hasLegacyId: boolean
  searchable: string[]
  sortable: string[]
  defaultOrder: Array<Record<string, 'asc' | 'desc'>>
  fields: ContentField[]
  columns: ContentField[]
}

/** 字段由 schema 决定，行数据在这里就是一张弱类型表 */
export type ContentRow = Record<string, any>

const path = (key: string) => `/admin/${key}`

let schemaPromise: Promise<ContentSchema[]> | null = null

/** 表单描述全站稳定，缓存一次即可；切换语言或后端热更新时调 clearContentSchemas() */
export function contentSchemas(force = false): Promise<ContentSchema[]> {
  if (!schemaPromise || force) {
    schemaPromise = http.get<ContentSchema[]>('/admin/content/resources').catch((err) => {
      // 失败不缓存，否则一次网络抖动会让所有编辑页永久空白
      schemaPromise = null
      throw err
    })
  }
  return schemaPromise
}

export function clearContentSchemas(): void {
  schemaPromise = null
}

export function listContent(key: string, query: ListQuery = {}): Promise<PageResult<ContentRow>> {
  return http.get<PageResult<ContentRow>>(path(key), query as Record<string, unknown>)
}

export function getContent(key: string, id: string): Promise<ContentRow> {
  return http.get<ContentRow>(`${path(key)}/${id}`)
}

export function createContent(key: string, data: ContentRow): Promise<ContentRow> {
  return http.post<ContentRow>(path(key), data)
}

export function updateContent(key: string, id: string, data: ContentRow): Promise<ContentRow> {
  return http.put<ContentRow>(`${path(key)}/${id}`, data)
}

export function deleteContent(key: string, id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`${path(key)}/${id}`)
}

export function setContentStatus(key: string, id: string, status: number): Promise<ContentRow> {
  return http.patch<ContentRow>(`${path(key)}/${id}/status`, { status })
}

/** 传入完整顺序，服务端按数组下标重写 sortOrder */
export function sortContent(key: string, ids: string[]): Promise<{ updated: number }> {
  return http.put<{ updated: number }>(`${path(key)}/sort/index`, { ids })
}

export function bulkDeleteContent(key: string, ids: string[]): Promise<{ count: number }> {
  return http.post<{ count: number }>(`${path(key)}/bulk-delete`, { ids })
}
