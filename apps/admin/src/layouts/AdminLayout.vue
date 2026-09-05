<template>
  <el-container class="admin">
    <el-aside class="admin__aside" :width="asideWidth">
      <div class="admin__brand">
        <span class="admin__logo">芝</span>
        <span v-show="!app.collapsed" class="admin__brand-text">
          <b>森芝宝</b>
          <em>CMS</em>
        </span>
      </div>
      <el-scrollbar class="admin__nav">
        <el-menu
          class="admin__menu"
          :default-active="activePath"
          :collapse="app.collapsed"
          :collapse-transition="false"
          unique-opened
          router
        >
          <template v-for="menu in user.menus" :key="menu.key">
            <el-sub-menu v-if="menu.children && menu.children.length" :index="menu.key">
              <template #title>
                <el-icon><component :is="iconOf(menu.icon)" /></el-icon>
                <span>{{ menu.label }}</span>
              </template>
              <el-menu-item v-for="child in menu.children" :key="child.key" :index="child.path">
                <el-icon><component :is="iconOf(child.icon)" /></el-icon>
                <template #title>{{ child.label }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="menu.path">
              <el-icon><component :is="iconOf(menu.icon)" /></el-icon>
              <template #title>{{ menu.label }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container class="admin__body">
      <el-header class="admin__header" height="56px">
        <div class="admin__header-left">
          <el-button text class="admin__collapse" @click="app.toggleSidebar()">
            <el-icon :size="18">
              <component :is="app.collapsed ? 'Expand' : 'Fold'" />
            </el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.key">{{ item.label }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="admin__header-right">
          <el-tooltip content="刷新当前页" placement="bottom">
            <el-button text circle @click="refresh">
              <el-icon :size="16"><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="打开官网前台" placement="bottom">
            <el-button text circle tag="a" :href="siteUrl" target="_blank" rel="noopener">
              <el-icon :size="16"><Link /></el-icon>
            </el-button>
          </el-tooltip>
          <el-dropdown trigger="click" @command="onCommand">
            <span class="admin__user">
              <el-avatar :size="26" :src="user.profile?.avatar || undefined">
                {{ (user.displayName || 'A').slice(0, 1) }}
              </el-avatar>
              <span class="admin__user-name">{{ user.displayName }}</span>
              <el-tag v-if="user.roleText" size="small" type="info" effect="plain">{{ user.roleText }}</el-tag>
              <el-icon :size="12"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="admin__main">
        <router-view v-slot="{ Component }">
          <component :is="Component" :key="viewKey" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { findMenuChain } from '@/utils/menu'
import { resetMenuRoutes } from '@/router'

const app = useAppStore()
const user = useUserStore()
const route = useRoute()
const router = useRouter()

const asideWidth = computed(() => (app.collapsed ? '64px' : '220px'))
const activePath = computed(() => route.path)
const siteUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000'

/** 后端下发的 icon 是字符串，未注册时回落到 Menu 图标，避免 Vue 报「未知组件」 */
function iconOf(name?: string): string {
  return name && name in ElementPlusIcons ? name : 'Menu'
}

const breadcrumbs = computed(() => {
  const chain = findMenuChain(user.menus, route.path)
  if (chain.length) return chain
  const title = (route.meta.title as string) || ''
  return title ? [{ key: 'meta', label: title }] : []
})

// 刷新：换 key 触发重挂载，比 router.replace 可靠（后者同地址会被去重）
const viewKey = ref(0)
function refresh(): void {
  viewKey.value += 1
}

async function onCommand(command: string): Promise<void> {
  if (command === 'profile') {
    void router.push({ name: 'profile' })
    return
  }
  await ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning', confirmButtonText: '退出', cancelButtonText: '取消' })
  user.logout()
  // 换账号后权限集不同，已注入的菜单路由必须整体卸载
  resetMenuRoutes()
  void router.replace({ name: 'login' })
}
</script>

<style scoped>
.admin {
  height: 100%;
}

.admin__aside {
  display: flex;
  flex-direction: column;
  background: #0b3d20;
  transition: width 0.2s ease;
  overflow: hidden;
}

.admin__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 14px;
  color: #f5f2e7;
  border-bottom: 1px solid rgba(245, 242, 231, 0.12);
  white-space: nowrap;
}

.admin__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  font-size: 15px;
  color: #0b3d20;
  background: #d8b25a;
}

.admin__brand-text b {
  font-weight: 600;
  letter-spacing: 1px;
}

.admin__brand-text em {
  margin-left: 6px;
  font-size: 11px;
  font-style: normal;
  color: rgba(245, 242, 231, 0.6);
}

.admin__nav {
  flex: 1;
  min-height: 0;
}

.admin__menu {
  border-right: 0;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: rgba(245, 242, 231, 0.78);
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.06);
  --el-menu-active-color: #f5f2e7;
}

.admin__menu :deep(.el-menu-item.is-active) {
  background: rgba(216, 178, 90, 0.16);
  box-shadow: inset 2px 0 0 #d8b25a;
}

.admin__menu :deep(.el-sub-menu .el-menu) {
  background: rgba(0, 0, 0, 0.16);
}

.admin__body {
  min-width: 0;
}

.admin__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.admin__header-left,
.admin__header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin__collapse {
  padding: 4px;
}

.admin__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: pointer;
  outline: none;
}

.admin__user-name {
  font-size: 13px;
}

.admin__main {
  padding: 16px;
  background: var(--admin-bg);
}
</style>
