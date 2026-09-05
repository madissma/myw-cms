import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    // 端口被占时直接报错，不要静默顺延：曾经因为它自动抢走 3001，
    // 导致故障表现为「后端 listen EADDRINUSE」而非「前台 3000 被占」，很难一眼定位。
    // admin 工程已设 strictPort: true，这里保持一致。
    strictPort: true,
    // 接口与上传件都由 server(3001) 提供，生产环境交给反向代理，前台一律用相对路径
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
