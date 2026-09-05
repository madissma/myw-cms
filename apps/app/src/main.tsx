import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { preloadBootstrap } from './store/site'
import { SiteProvider } from './store/SiteProvider'

/**
 * 先把站点骨架拉回来再渲染（规划 §7.1），避免导航与配色闪一下再跳变。
 * 后端慢或不通时最多等 2.5 秒，未完成的请求交给 Provider 收尾，不会一直白屏。
 *
 * 用函数包一层而不是顶层 await：vite 默认 build.target 不支持 TLA。
 */
const PRELOAD_BUDGET_MS = 2500

async function start() {
  await Promise.race([
    preloadBootstrap(),
    new Promise((resolve) => setTimeout(resolve, PRELOAD_BUDGET_MS)),
  ])

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SiteProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </SiteProvider>
    </StrictMode>,
  )
}

void start()
