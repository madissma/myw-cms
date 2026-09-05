import { http } from '../request'
import type { ListQuery, PageResult } from '@/types/api'

/** Setting.type 决定控件，与 server 的 SETTING_TYPES 保持一致 */
export type SettingType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'color'
  | 'image'
  | 'url'
  | 'email'
  | 'select'
  | 'tags'
  | 'pairs'
  | 'json'
  | 'richtext'
  | 'date'

export interface SettingItem {
  id: string
  group: string
  key: string
  value: any
  type: SettingType
  label: string
  remark: string | null
  options: { label: string; value: string }[]
  sortOrder: number
}

export interface ThemeItem {
  id: string
  code: string
  name: string
  tokens: Record<string, any>
  isDefault: boolean
  active: boolean
  preview: string | null
  remark: string | null
  updatedAt?: string
}

export interface LocaleItem {
  id: string
  code: string
  name: string
  nativeName: string
  isDefault: boolean
  active: boolean
  sortOrder: number
}

export interface TranslationItem {
  id: string
  locale: string
  entity: string
  entityId: string
  field: string
  value: string
}

/** 站点配置的分组顺序，也是左侧 tab 的顺序 */
export const SETTING_GROUPS = [
  { value: 'brand', label: '品牌标识' },
  { value: 'site', label: '站点属性' },
  { value: 'contact', label: '联系方式' },
  { value: 'footer', label: '页脚与备案' },
  { value: 'seo', label: 'SEO' },
  { value: 'social', label: '社交账号' },
  { value: 'analytics', label: '统计代码' },
  { value: 'form', label: '留言表单' },
  { value: 'ui', label: '前台文案' },
  { value: 'theme', label: '外观' },
  { value: 'other', label: '其它' },
]

// ---------- Setting ----------

export function settings(query: ListQuery & { group?: string } = {}): Promise<SettingItem[]> {
  return http.get<SettingItem[]>('/admin/settings', query as Record<string, unknown>)
}

export function settingsByGroup(group: string): Promise<SettingItem[]> {
  return http.get<SettingItem[]>(`/admin/settings/group/${group}`)
}

export function saveSettingsBulk(items: { key: string; value: any }[]): Promise<{ updated: number; skipped: number }> {
  return http.put<{ updated: number; skipped: number }>('/admin/settings/bulk', { items })
}

export function createSetting(data: Partial<SettingItem> & { key: string; value: any; type: string; label: string; group: string }) {
  return http.post<SettingItem>('/admin/settings', data)
}

export function updateSetting(id: string, data: Partial<SettingItem>): Promise<SettingItem> {
  return http.put<SettingItem>(`/admin/settings/${id}`, data)
}

export function deleteSetting(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/settings/${id}`)
}

// ---------- Theme ----------

export function themes(): Promise<ThemeItem[]> {
  return http.get<ThemeItem[]>('/admin/themes')
}

export function activeTheme(): Promise<ThemeItem | null> {
  return http.get<ThemeItem | null>('/admin/themes/active')
}

export function createTheme(data: Partial<ThemeItem> & { code: string; name: string; tokens: Record<string, any> }) {
  return http.post<ThemeItem>('/admin/themes', data)
}

export function updateTheme(id: string, data: Partial<ThemeItem>): Promise<ThemeItem> {
  return http.put<ThemeItem>(`/admin/themes/${id}`, data)
}

export function activateTheme(id: string): Promise<ThemeItem> {
  return http.post<ThemeItem>(`/admin/themes/${id}/activate`)
}

export function setThemeDefault(id: string): Promise<ThemeItem> {
  return http.post<ThemeItem>(`/admin/themes/${id}/default`)
}

export function deleteTheme(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/themes/${id}`)
}

// ---------- Locale / Translation ----------

export function locales(): Promise<LocaleItem[]> {
  return http.get<LocaleItem[]>('/admin/locales')
}

export function createLocale(data: Partial<LocaleItem> & { code: string; name: string; nativeName: string }) {
  return http.post<LocaleItem>('/admin/locales', data)
}

export function updateLocale(id: string, data: Partial<LocaleItem>): Promise<LocaleItem> {
  return http.put<LocaleItem>(`/admin/locales/${id}`, data)
}

export function setLocaleDefault(id: string): Promise<LocaleItem> {
  return http.post<LocaleItem>(`/admin/locales/${id}/default`)
}

export function deleteLocale(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/locales/${id}`)
}

export function translations(
  query: ListQuery & { locale?: string; entity?: string; entityId?: string } = {},
): Promise<PageResult<TranslationItem>> {
  return http.get<PageResult<TranslationItem>>('/admin/translations', query as Record<string, unknown>)
}

export function upsertTranslations(
  items: { locale: string; entity: string; entityId: string; field: string; value: string }[],
): Promise<{ saved: number }> {
  return http.post<{ saved: number }>('/admin/translations/upsert', { items })
}

export function deleteTranslation(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/translations/${id}`)
}
