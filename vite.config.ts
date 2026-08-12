import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// JS ミドルウェア（型定義は後続で整備可）
// @ts-expect-error Vite プラグインは .mjs のため宣言ファイルなし
import { scheduleProposeMiddleware } from './scripts/vite-schedule-propose-middleware.mjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), scheduleProposeMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
