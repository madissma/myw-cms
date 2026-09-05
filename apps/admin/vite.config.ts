import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3001'
  // 存量图片由前台 app 的 public 目录提供（url 仍为 /images/...），素材库要能预览就得代理过去
  const appTarget = env.VITE_APP_TARGET || 'http://localhost:3000'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3002,
      strictPort: true,
      // 后台只与 server 通信：/api 走接口，/uploads 走上传件预览，/images 走存量素材
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/uploads': { target: apiTarget, changeOrigin: true },
        '/images': { target: appTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 1600,
    },
  }
})
