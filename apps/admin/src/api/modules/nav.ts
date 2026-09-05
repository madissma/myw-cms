import { http } from '../request'
import type { ListQuery } from '@/types/api'

export interface NavItem {
  id: string
  parentId: string | null
  position: string
  navKey: string | null
  label: string
  labelEn: string | null
  path: string
  icon: string | null
  target: string
  sortOrder: number
  status: number
  children?: NavItem[]
}

export const NAV_POSITIONS = [
  { value: 'header', label: '顶部主导航' },
  { value: 'footer', label: '页脚快速导航' },
  { value: 'side', label: '侧边导航' },
]

export const NAV_TARGETS = [
  { value: '_self', label: '当前窗口' },
  { value: '_blank', label: '新窗口' },
]

/** 平铺列表，后台按 parentId 组树渲染 */
export function navList(query: ListQuery & { position?: string } = {}): Promise<NavItem[]> {
  return http.get<NavItem[]>('/admin/nav-menus', query as Record<string, unknown>)
}

export function navTree(position?: string): Promise<NavItem[]> {
  return http.get<NavItem[]>('/admin/nav-menus/tree', position ? { position } : {})
}

export function createNav(data: Partial<NavItem>): Promise<NavItem> {
  return http.post<NavItem>('/admin/nav-menus', data)
}

export function updateNav(id: string, data: Partial<NavItem>): Promise<NavItem> {
  return http.put<NavItem>(`/admin/nav-menus/${id}`, data)
}

export function setNavStatus(id: string, status: number): Promise<NavItem> {
  return http.patch<NavItem>(`/admin/nav-menus/${id}/status`, { status })
}

export function sortNav(ids: string[]): Promise<{ updated: number }> {
  return http.put<{ updated: number }>('/admin/nav-menus/sort/index', { ids })
}

/** 有子项时服务端会拒删，force=true 表示连同子项一起删除 */
export function deleteNav(id: string, force = false): Promise<{ ok: boolean; children?: number }> {
  return http.delete<{ ok: boolean; children?: number }>(`/admin/nav-menus/${id}`, force ? { params: { force: 1 } } : undefined)
}
