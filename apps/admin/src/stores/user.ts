import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { changePassword, login as apiLogin, profile as apiProfile, updateProfile } from '@/api/modules/auth'
import { menus as apiMenus } from '@/api/modules/system'
import { filterMenus } from '@/utils/menu'
import { clearTokens, getAccessToken, setTokens } from '@/utils/token'
import { hasPermission } from '@/utils/perm'
import type { AuthUser, MenuNode, UserProfile } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(getAccessToken())
  /** 登录响应里的简版 user，profile() 返回后会被覆盖为完整版 */
  const profile = ref<UserProfile | null>(null)
  const rawMenus = ref<MenuNode[]>([])
  /** profile + menus 是否已就绪，路由守卫据此决定是否加载上下文 */
  const loaded = ref(false)

  const isLogin = computed(() => !!token.value)
  const permissions = computed(() => profile.value?.permissions ?? [])
  const displayName = computed(() => profile.value?.name || profile.value?.username || '')
  const roleText = computed(() => (profile.value?.roleNames ?? []).join('、') || (profile.value?.roles ?? []).join('、'))
  const menus = computed(() => filterMenus(rawMenus.value, permissions.value))

  function has(perm?: string): boolean {
    return hasPermission(permissions.value, perm)
  }

  function applyUser(user: AuthUser): void {
    profile.value = { ...(profile.value ?? {}), ...user } as UserProfile
  }

  async function login(username: string, password: string): Promise<void> {
    const res = await apiLogin(username, password)
    setTokens(res.accessToken, res.refreshToken)
    token.value = res.accessToken
    applyUser(res.user)
    loaded.value = false
    await loadContext()
  }

  /** 菜单与详细权限：登录成功后、以及刷新页面后各拉一次 */
  async function loadContext(): Promise<void> {
    const [data, tree] = await Promise.all([apiProfile(), apiMenus()])
    profile.value = data
    rawMenus.value = tree
    loaded.value = true
  }

  async function saveProfile(data: { name: string; email?: string; phone?: string; avatar?: string }): Promise<void> {
    await updateProfile(data)
    if (profile.value) profile.value = { ...profile.value, ...data }
  }

  async function changePwd(oldPassword: string, newPassword: string): Promise<void> {
    await changePassword(oldPassword, newPassword)
  }

  function logout(): void {
    clearTokens()
    token.value = ''
    profile.value = null
    rawMenus.value = []
    loaded.value = false
  }

  return {
    token,
    profile,
    rawMenus,
    loaded,
    isLogin,
    permissions,
    displayName,
    roleText,
    menus,
    has,
    login,
    loadContext,
    saveProfile,
    changePwd,
    logout,
  }
})
