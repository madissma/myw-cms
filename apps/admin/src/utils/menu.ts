import { hasPermission } from './perm'
import type { MenuNode } from '@/types/api'

/**
 * 按权限点裁剪菜单树：父节点只要自身权限通过且仍有可见子节点才保留。
 * 与后端 RolesGuard 判定同构，因此「菜单看不到」与「接口 403」始终一致。
 */
export function filterMenus(tree: MenuNode[], permissions: string[]): MenuNode[] {
  const out: MenuNode[] = []
  for (const node of tree) {
    if (!hasPermission(permissions, node.perm)) continue
    if (node.children?.length) {
      const children = filterMenus(node.children, permissions)
      if (children.length) out.push({ ...node, children })
      continue
    }
    if (node.path) out.push({ ...node, children: undefined })
  }
  return out
}

/** 面包屑：返回根到目标 path 的链路，未命中时返回空数组 */
export function findMenuChain(tree: MenuNode[], path: string): MenuNode[] {
  for (const node of tree) {
    if (node.path === path) return [node]
    if (node.children?.length) {
      const inner = findMenuChain(node.children, path)
      if (inner.length) return [node, ...inner]
    }
  }
  return []
}

/** 展平为「路径 -> 菜单节点」，供路由 meta 与面包屑取标题 */
export function flattenMenus(tree: MenuNode[]): MenuNode[] {
  const out: MenuNode[] = []
  for (const node of tree) {
    if (node.path) out.push(node)
    if (node.children?.length) out.push(...flattenMenus(node.children))
  }
  return out
}
