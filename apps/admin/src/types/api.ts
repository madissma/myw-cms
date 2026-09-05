/** 与 server 统一信封 { code, message, data, traceId } 对齐 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  traceId: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 所有列表接口共用的查询参数 */
export interface ListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
  sort?: string
  [key: string]: unknown
}

export interface AuthUser {
  id: string
  username: string
  name: string
  roles: string[]
  permissions: string[]
}

export interface UserProfile extends AuthUser {
  email: string | null
  phone: string | null
  avatar: string | null
  status: number
  orgId: string | null
  orgName: string | null
  roleNames: string[]
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/** 后台菜单树节点，来源 GET /admin/menus */
export interface MenuNode {
  key: string
  label: string
  icon?: string
  path?: string
  perm?: string
  children?: MenuNode[]
}

export interface TermOption {
  id: string
  slug: string
  name: string
  anchor?: string | null
  url?: string | null
}

/** 内容状态字典：与 server 约定 0 草稿 / 1 已发布 / 2 下架 */
export const STATUS_OPTIONS = [
  { value: 0, label: '草稿', tag: 'info' },
  { value: 1, label: '已发布', tag: 'success' },
  { value: 2, label: '下架', tag: 'warning' },
] as const

export function statusMeta(status: number) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? { value: status, label: '未知', tag: 'info' }
}
