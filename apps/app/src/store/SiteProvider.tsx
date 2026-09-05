import type { ReactNode } from 'react'
import { SiteContext, useSiteValue } from './site'

/**
 * 只做一件事：把 useSiteValue 的订阅结果挂到 Context 上。
 * 逻辑都在 site.ts（无组件文件），本文件只导出组件，两边都不破坏 Fast Refresh。
 */
export function SiteProvider({ children }: { children: ReactNode }) {
  const value = useSiteValue()
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
