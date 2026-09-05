import { http } from '../request'
import type { ListQuery, PageResult } from '@/types/api'

export interface TaxonomyItem {
  id: string
  key: string
  name: string
  remark: string | null
  sortOrder: number
  termCount?: number
  _count?: { terms: number }
}

export interface TermItem {
  id: string
  taxonomyId: string
  slug: string
  name: string
  nameEn: string | null
  anchor: string | null
  url: string | null
  image: string | null
  remark: string | null
  sortOrder: number
  status: number
  taxonomy?: TaxonomyItem
}

export function taxonomies(): Promise<TaxonomyItem[]> {
  return http.get<TaxonomyItem[]>('/admin/taxonomies')
}

export function terms(query: ListQuery & { taxonomyKey?: string; taxonomyId?: string } = {}): Promise<PageResult<TermItem>> {
  return http.get<PageResult<TermItem>>('/admin/terms', query as Record<string, unknown>)
}

// ---------- 写入 ----------

/** 术语表里已登记的分类组，新增术语时必须从中选一个 */
export const TAXONOMY_HINTS: Record<string, string> = {
  product_category: '产品分类（产品列表的分类下拉）',
  news_category: '新闻分类（媒体中心的筛选条）',
  dosage_form: '剂型（科技强企页的全剂型覆盖）',
  shop_channel: '商城渠道（卡片跳转地址存在 url 字段）',
  tag: '标签（通用打标）',
}

export function createTaxonomy(data: { key: string; name: string; remark?: string; sortOrder?: number }): Promise<TaxonomyItem> {
  return http.post<TaxonomyItem>('/admin/taxonomies', data)
}

export function updateTaxonomy(id: string, data: { name?: string; remark?: string; sortOrder?: number }): Promise<TaxonomyItem> {
  return http.put<TaxonomyItem>(`/admin/taxonomies/${id}`, data)
}

export function deleteTaxonomy(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/taxonomies/${id}`)
}

export interface TermPayload {
  taxonomyKey: string
  slug?: string
  name: string
  nameEn?: string
  anchor?: string
  url?: string
  image?: string
  remark?: string
  sortOrder?: number
  status?: number
}

export function createTerm(data: TermPayload): Promise<TermItem> {
  return http.post<TermItem>('/admin/terms', data)
}

export function updateTerm(id: string, data: Partial<TermPayload>): Promise<TermItem> {
  return http.put<TermItem>(`/admin/terms/${id}`, data)
}

export function setTermStatus(id: string, status: number): Promise<TermItem> {
  return http.patch<TermItem>(`/admin/terms/${id}/status`, { status })
}

export function sortTerms(ids: string[]): Promise<{ updated: number }> {
  return http.put<{ updated: number }>('/admin/terms/sort/index', { ids })
}

export function deleteTerm(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/terms/${id}`)
}
