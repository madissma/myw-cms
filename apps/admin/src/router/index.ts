import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getAccessToken } from '@/utils/token'
import { useUserStore } from '@/stores/user'
import { buildMenuRoutes } from './dynamic'

const Layout = () => import('@/layouts/AdminLayout.vue')

/**
 * 后台用 hash 路由：部署为静态目录时不需要额外的 rewrite 规则，
 * 避免「刷新子页面 404」这类只与托管配置相关的问题。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    name: 'admin',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人设置', hidden: true },
      },
      {
        // 装修器带页面主键，不在菜单树里，故作为静态子路由登记（vue-router 按特异性排序，不受 catch-all 影响）
        path: 'page/designer/:id',
        name: 'page-designer',
        component: () => import('@/views/page/designer.vue'),
        meta: { title: '页面装修', hidden: true, perm: 'page:view' },
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('@/views/common/Forbidden.vue'),
        meta: { title: '无权访问', hidden: true, public: true },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/common/NotFound.vue'),
        meta: { title: '页面不存在', hidden: true },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/** 注入的菜单路由保留卸载句柄，登出/换账号时必须整体移除 */
let menuRouteRemovers: (() => void)[] = []
let menusInstalled = false

export function resetMenuRoutes(): void {
  menusInstalled = false
  menuRouteRemovers.forEach((remove) => remove())
  menuRouteRemovers = []
}

router.beforeEach(async (to) => {
  const user = useUserStore()

  if (!user.isLogin && getAccessToken()) {
    user.token = getAccessToken()
  }

  if (to.meta.public) {
    // 已登录还去登录页，直接回首页
    if (to.name === 'login' && user.isLogin) return { path: '/dashboard' }
    return true
  }

  if (!user.isLogin) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }

  if (!user.loaded) {
    try {
      await user.loadContext()
    } catch {
      user.logout()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  if (!menusInstalled) {
    menusInstalled = true
    menuRouteRemovers = buildMenuRoutes(user.menus).map((record) => router.addRoute('admin', record))
    // 按 path 重新解析：不能沿用 to.name，此时它还是 catch-all 的 not-found
    return { path: to.path, query: to.query, hash: to.hash, replace: true }
  }

  if (to.meta.perm && !user.has(to.meta.perm as string)) {
    return { name: 'forbidden' }
  }
  return true
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || ''
  document.title = title ? `${title} · 森芝宝内容管理后台` : '森芝宝内容管理后台'
})

export default router
