import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

const COLLAPSE_KEY = 'szb.admin.sidebarCollapsed'

export const useAppStore = defineStore('app', () => {
  const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1')

  function toggleSidebar(): void {
    collapsed.value = !collapsed.value
  }

  // 折叠状态跨刷新保留，运营人员排长栏目时不必每次重新展开
  watchEffect(() => localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0'))

  return { collapsed, toggleSidebar }
})
