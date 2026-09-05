import type { BlockPayload } from '../api/types'

/** 区块所在栏目的明暗基调，由 Section.variant 推导 */
export type Tone = 'light' | 'dark'

/** 所有区块组件的统一入参 */
export interface BlockComponentProps {
  block: BlockPayload
  tone: Tone
  /** 版式微调，取值见 layouts.ts 的 BLOCK_APPEARANCE */
  appearance?: string
}

/** entity_list 解析后的通用条目，字段随 source 变化，取值处一律做空值兜底 */
export interface BlockItem {
  id?: string
  slug?: string
  code?: string
  title?: string
  name?: string
  image?: string | null
  date?: string | null
  url?: string | null
  [key: string]: unknown
}

export function toItems(value: unknown): BlockItem[] {
  return Array.isArray(value) ? (value as BlockItem[]) : []
}

export function toTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

/** 文本里的 \n 渲染为换行，保持 seed 从 JSX 中继承的断行 */
export function splitLines(text: string | null | undefined): string[] {
  if (!text) return []
  return text.split('\n')
}

/** 外链判定：商城地址、社交账号等以 http(s) 或协议相对地址出现，需走 a 标签而非 router */
export function isExternal(url: string): boolean {
  return /^https?:\/\//.test(url) || url.startsWith('//')
}

/** 从条目上按候选键取第一个非空字符串，条目形态不明时一律安全降级为空串 */
export function itemText(item: unknown, ...keys: string[]): string {
  if (!item || typeof item !== 'object') return ''
  const record = item as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value) return value
  }
  return ''
}
