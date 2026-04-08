import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/skill-hub-react/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 与 src/services/git-provider.ts 中 GITHUB_API_PROXY_PATH 一致；开发时 VITE_DEV_GITHUB_PROXY=1 时走此代理
      '/__skillhub_github': {
        target: 'https://api.github.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__skillhub_github/, ''),
      },
    },
  },
})
