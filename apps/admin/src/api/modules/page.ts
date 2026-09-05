import { http } from '../request'
import type { ListQuery, PageResult } from '@/types/api'

export interface BlockNode {
  id: string
  sectionId: string
  code: string
  type: string
  title: string | null
  props: Record<string, any>
  source: string | null
  query: Record<string, any> | null
  columns: number | null
  theme: Record<string, any> | null
  sortOrder: number
  status: number
}

export interface SectionNode {
  id: string
  pageId: string
  anchor: string
  label: string
  eyebrow: string | null
  title: string | null
  subtitle: string | null
  variant: string | null
  showInSubNav: boolean
  sortOrder: number
  status: number
  blocks: BlockNode[]
}

export interface PageItem {
  id: string
  key: string
  name: string
  path: string
  heroTitle: string | null
  heroSubtitle: string | null
  heroEn: string | null
  heroImage: string | null
  body: string | null
  status: number
  seoTitle: string | null
  seoKeywords: string | null
  seoDescription: string | null
  sectionCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface PageDetail extends PageItem {
  sections: SectionNode[]
}

/** 区块字段描述：kind 决定控件，items 型带 itemFields 递归渲染 */
export type BlockFieldKind =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'url'
  | 'color'
  | 'number'
  | 'boolean'
  | 'select'
  | 'pairs'
  | 'tags'
  | 'items'

export interface BlockFieldDef {
  name: string
  label: string
  kind: BlockFieldKind
  required?: boolean
  options?: string[]
  itemFields?: BlockFieldDef[]
  itemLabel?: string
  max?: number
  hint?: string
}

export interface BlockTypeDef {
  type: string
  label: string
  entityDriven?: boolean
  hasColumns?: boolean
  fields: BlockFieldDef[]
}

export interface BlockSchemas {
  types: { type: string; label: string; entityDriven: boolean }[]
  entities: { value: string; label: string }[]
  schemas: BlockTypeDef[]
}

/** 区块组外观：与前台 app 的 section variant -> class 约定一一对应 */
export const SECTION_VARIANTS = [
  { value: '', label: '默认（米白底）' },
  { value: 'cream-deep', label: '深米白底' },
  { value: 'forest-dark', label: '深绿底' },
  { value: 'forest', label: '森林绿底' },
  { value: 'gold-soft', label: '淡金底' },
]

export function listPages(query: ListQuery = {}): Promise<PageResult<PageItem>> {
  return http.get<PageResult<PageItem>>('/admin/pages', query as Record<string, unknown>)
}

export function getPage(id: string): Promise<PageDetail> {
  return http.get<PageDetail>(`/admin/pages/${id}`)
}

export function createPage(data: Partial<PageItem>): Promise<PageDetail> {
  return http.post<PageDetail>('/admin/pages', data)
}

export function updatePage(id: string, data: Partial<PageItem>): Promise<PageDetail> {
  return http.put<PageDetail>(`/admin/pages/${id}`, data)
}

export function setPageStatus(id: string, status: number): Promise<PageDetail> {
  return http.patch<PageDetail>(`/admin/pages/${id}/status`, { status })
}

export function deletePage(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/pages/${id}`)
}

let schemaPromise: Promise<BlockSchemas> | null = null

export function blockSchemas(force = false): Promise<BlockSchemas> {
  if (!schemaPromise || force) {
    schemaPromise = http.get<BlockSchemas>('/admin/pages/block-schemas').catch((err) => {
      schemaPromise = null
      throw err
    })
  }
  return schemaPromise
}

/** 整页保存：sections 按 anchor 匹配、blocks 按 code 匹配，未出现的行会被删除 */
export function savePageTree(
  id: string,
  payload: { page: Partial<PageItem>; sections: Record<string, any>[] },
): Promise<PageDetail> {
  return http.put<PageDetail>(`/admin/pages/tree/${id}`, payload)
}

// ---------- 单条维护（设计器之外的快速入口） ----------

export function createSection(pageId: string, data: Partial<SectionNode>): Promise<SectionNode> {
  return http.post<SectionNode>(`/admin/pages/${pageId}/sections`, data)
}

export function updateSection(id: string, data: Partial<SectionNode>): Promise<SectionNode> {
  return http.put<SectionNode>(`/admin/pages/sections/${id}`, data)
}

export function deleteSection(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/pages/sections/${id}`)
}

export function sortSections(pageId: string, ids: string[]): Promise<{ updated: number }> {
  return http.put<{ updated: number }>('/admin/pages/sections/sort/index', { ids }, { params: { pageId } })
}

export function createBlock(sectionId: string, data: Partial<BlockNode>): Promise<BlockNode> {
  return http.post<BlockNode>(`/admin/pages/${sectionId}/blocks`, data)
}

export function updateBlock(id: string, data: Partial<BlockNode>): Promise<BlockNode> {
  return http.put<BlockNode>(`/admin/pages/blocks/${id}`, data)
}

export function moveBlock(id: string, sectionId: string): Promise<BlockNode> {
  return http.patch<BlockNode>(`/admin/pages/blocks/${id}/move`, { sectionId })
}

export function deleteBlock(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/pages/blocks/${id}`)
}

export function sortBlocks(sectionId: string, ids: string[]): Promise<{ updated: number }> {
  return http.put<{ updated: number }>('/admin/pages/blocks/sort/index', { ids }, { params: { sectionId } })
}
