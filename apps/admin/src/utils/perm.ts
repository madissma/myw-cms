/**
 * 与 server 的 RolesGuard 同构：前端菜单过滤仅为体验，真正的边界在后端。
 * 持有 `*`、`content:product:*` 或精确权限点即视为通过。
 */
export function hasPermission(owned: string[], required?: string): boolean {
  if (!required) return true
  if (!owned?.length) return false
  if (owned.includes('*') || owned.includes(required)) return true
  const parts = required.split(':')
  for (let i = parts.length - 1; i > 0; i--) {
    if (owned.includes(`${parts.slice(0, i).join(':')}:*`)) return true
  }
  return false
}

export function hasAny(owned: string[], required: string[]): boolean {
  return required.some((item) => hasPermission(owned, item))
}
