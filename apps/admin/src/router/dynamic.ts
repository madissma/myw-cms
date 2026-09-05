import { flattenMenus } from '@/utils/menu'
import type { RouteRecordRaw } from 'vue-router'
import type { MenuNode } from '@/types/api'

const Placeholder = () => import('@/views/common/Placeholder.vue')

type Loader = () => Promise<unknown>

/** 站点配置拆了四个菜单入口，共用同一个表单视图，页面内按路径取对应的 Setting 分组 */
const siteSettingView: Loader = () => import('@/views/site/setting.vue')

/**
 * 视图注册表：菜单 path -> 页面组件。
 * M0 只登记工作台，M5 逐栏目补入；未登记的 path 落到占位页而不是 404，
 * 这样后端新增一个菜单项时前端不会白屏，只需补一行映射。
 */
const VIEW_LOADERS: Record<string, Loader> = {
  '/dashboard': () => import('@/views/dashboard/index.vue'),
  '/content/product': () => import('@/views/content/product.vue'),
  '/content/news': () => import('@/views/content/news.vue'),
  '/content/video': () => import('@/views/content/video.vue'),
  '/content/review': () => import('@/views/content/review.vue'),
  '/content/honor': () => import('@/views/content/honor.vue'),
  '/content/timeline': () => import('@/views/content/timeline.vue'),
  '/nav': () => import('@/views/nav/index.vue'),
  '/page': () => import('@/views/page/list.vue'),
  '/taxonomy': () => import('@/views/taxonomy/index.vue'),
  '/site/setting/brand': siteSettingView,
  '/site/setting/footer': siteSettingView,
  '/site/setting/seo': siteSettingView,
  '/site/setting/ui': siteSettingView,
  '/site/theme': () => import('@/views/site/theme.vue'),
  '/site/locale': () => import('@/views/site/locale.vue'),
  '/media': () => import('@/views/media/index.vue'),
  '/message': () => import('@/views/message/index.vue'),
  '/system/user': () => import('@/views/system/user.vue'),
  '/system/org': () => import('@/views/system/org.vue'),
  '/system/role': () => import('@/views/system/role.vue'),
  '/system/log': () => import('@/views/system/log.vue'),
}

export function buildMenuRoutes(menus: MenuNode[]): RouteRecordRaw[] {
  return flattenMenus(menus)
    .filter((node): node is MenuNode & { path: string } => !!node.path)
    .map((node) => {
      const loader = VIEW_LOADERS[node.path]
      return {
        path: node.path,
        name: `menu-${node.key}`,
        component: loader ?? Placeholder,
        meta: {
          title: node.label,
          perm: node.perm,
          icon: node.icon,
          // 占位页据此提示「该模块尚未实现」，避免看起来像空数据
          comingSoon: !loader,
        },
      } as RouteRecordRaw
    })
}
