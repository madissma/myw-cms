import { http } from '../request'
import type { ListQuery, MenuNode, PageResult } from '@/types/api'

export interface ContentStatItem {
  key: string
  label: string
  total: number
}

export interface DashboardStats {
  content: ContentStatItem[]
  structure: { page: number; section: number; block: number; navMenu: number; taxonomy: number; term: number }
  message: { total: number; pending: number; handled: number }
  user: number
  log: number
  recentLogins: { id: string; username: string; name: string; lastLoginAt: string | null }[]
  latest: {
    products: { id: string; slug: string; name: string; status: number; updatedAt: string }[]
    news: { id: string; slug: string; title: string; status: number; updatedAt: string }[]
  }
}

export interface OperationLogItem {
  id: string
  userId: string | null
  username: string | null
  action: string
  target: string
  ip: string | null
  payload: unknown
  createdAt: string
}

/** 菜单树：登录即可获取，前端按 permissions 过滤 */
export function menus(): Promise<MenuNode[]> {
  return http.get<MenuNode[]>('/admin/menus')
}

export function dashboardStats(): Promise<DashboardStats> {
  return http.get<DashboardStats>('/admin/dashboard/stats')
}

export function operationLogs(query: ListQuery): Promise<PageResult<OperationLogItem>> {
  return http.get<PageResult<OperationLogItem>>('/admin/operation-logs', query as Record<string, unknown>)
}

export function purgeLogs(days: number): Promise<{ count: number }> {
  return http.post<{ count: number }>('/admin/operation-logs/purge', { days })
}

// ---------- 用户 ----------

export interface RoleBrief {
  id: string
  key: string
  name: string
}

export interface UserItem {
  id: string
  username: string
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  remark: string | null
  status: number
  orgId: string | null
  org?: { id: string; name: string } | null
  roles: RoleBrief[]
  lastLoginAt: string | null
  createdAt: string
}

/** 可清空字段统一用 null 传「清空」：@IsOptional() 对 null 放行，空串会被邮箱校验拦下 */
export interface UserPayload {
  username?: string
  password?: string
  name: string
  email?: string | null
  phone?: string | null
  avatar?: string | null
  remark?: string | null
  status?: number
  orgId?: string | null
  roleIds?: string[]
}

export function users(query: ListQuery & { orgId?: string; roleId?: string } = {}): Promise<PageResult<UserItem>> {
  return http.get<PageResult<UserItem>>('/admin/users', query as Record<string, unknown>)
}

export function createUser(data: UserPayload): Promise<UserItem> {
  return http.post<UserItem>('/admin/users', data)
}

export function updateUser(id: string, data: Partial<UserPayload>): Promise<UserItem> {
  return http.put<UserItem>(`/admin/users/${id}`, data)
}

/** 启停与重置密码后端只回 { ok }，需要新状态请重拉列表 */
export function setUserStatus(id: string, status: number): Promise<{ ok: boolean }> {
  return http.patch<{ ok: boolean }>(`/admin/users/${id}/status`, { status })
}

export function resetUserPassword(id: string, password: string): Promise<{ ok: boolean }> {
  return http.patch<{ ok: boolean }>(`/admin/users/${id}/password`, { password })
}

export function deleteUser(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/users/${id}`)
}

// ---------- 组织 ----------

export interface OrgItem {
  id: string
  parentId: string | null
  name: string
  code: string | null
  leader: string | null
  phone: string | null
  sortOrder: number
  status: number
  userCount: number
  children?: OrgItem[]
}

/** 平铺列表：需要按关键字过滤组织时用（tree 接口不带过滤） */
export function orgs(query: { keyword?: string; status?: number } = {}): Promise<OrgItem[]> {
  return http.get<OrgItem[]>('/admin/orgs', query as Record<string, unknown>)
}

export function orgTree(): Promise<OrgItem[]> {
  return http.get<OrgItem[]>('/admin/orgs/tree')
}

export function createOrg(data: Partial<OrgItem>): Promise<OrgItem> {
  return http.post<OrgItem>('/admin/orgs', data)
}

export function updateOrg(id: string, data: Partial<OrgItem>): Promise<OrgItem> {
  return http.put<OrgItem>(`/admin/orgs/${id}`, data)
}

export function setOrgStatus(id: string, status: number): Promise<{ ok: boolean }> {
  return http.patch<{ ok: boolean }>(`/admin/orgs/${id}/status`, { status })
}

/** 同级重排：按新顺序传 id 数组，服务端回写 (i+1)*10 */
export function sortOrgs(ids: string[]): Promise<{ ok: boolean }> {
  return http.put<{ ok: boolean }>('/admin/orgs/sort/index', { ids })
}

export function deleteOrg(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/orgs/${id}`)
}

// ---------- 角色与权限 ----------

export interface RoleItem {
  id: string
  key: string
  name: string
  remark: string | null
  sortOrder: number
  status: number
  builtin: boolean
  userCount: number
  permissionKeys: string[]
}

export interface PermissionCatalog {
  group: string
  items: { key: string; name: string }[]
}

/** 角色列表不分页，直接返回数组 */
export function roles(query: { keyword?: string } = {}): Promise<RoleItem[]> {
  return http.get<RoleItem[]>('/admin/roles', query as Record<string, unknown>)
}

export function permissionCatalog(): Promise<PermissionCatalog[]> {
  return http.get<PermissionCatalog[]>('/admin/roles/permissions')
}

export function createRole(data: { key: string; name: string; remark?: string; sortOrder?: number; permissionKeys?: string[] }) {
  return http.post<RoleItem>('/admin/roles', data)
}

export function updateRole(
  id: string,
  data: { name?: string; remark?: string; sortOrder?: number; permissionKeys?: string[] },
): Promise<RoleItem> {
  return http.put<RoleItem>(`/admin/roles/${id}`, data)
}

export function setRoleStatus(id: string, status: number): Promise<{ ok: boolean }> {
  return http.patch<{ ok: boolean }>(`/admin/roles/${id}/status`, { status })
}

export function deleteRole(id: string): Promise<{ ok: boolean }> {
  return http.delete<{ ok: boolean }>(`/admin/roles/${id}`)
}
