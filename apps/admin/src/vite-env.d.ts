/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 仅 dev 代理使用，见 vite.config.ts */
  readonly VITE_API_TARGET?: string
  /** 官网前台地址，顶栏「打开前台」使用 */
  readonly VITE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
