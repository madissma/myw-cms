import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router, { resetMenuRoutes } from './router'
import { setUnauthorizedHandler } from './api/request'
import { useUserStore } from './stores/user'
import './styles/index.css'

const app = createApp(App)

// 图标全量注册：菜单与表格里的 icon 是后端下发的字符串，无法按需引入
for (const [name, component] of Object.entries(ElementPlusIcons)) {
  app.component(name, component as never)
}

app.use(createPinia())
app.use(ElementPlus, { locale: zhCn, size: 'default', zIndex: 3000 })
app.use(router)

/**
 * 凭证彻底失效（refresh 也换不到新 token）时统一登出并回登录页。
 * 在这里注入而不是在 request.ts 里 import router：避免 axios 与路由互相依赖。
 */
setUnauthorizedHandler(() => {
  useUserStore().logout()
  resetMenuRoutes()
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    void router.replace({
      name: 'login',
      query: current.fullPath === '/' ? {} : { redirect: current.fullPath },
    })
  }
})

// 等首屏导航（含守卫拉取菜单）完成再挂载，避免布局闪烁
void router.isReady().then(() => {
  app.mount('#app')
})
