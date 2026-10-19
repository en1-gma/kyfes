import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { msw } from 'msw/vite'

// API_ORIGIN is a dev-only, server-side variable (no VITE_ prefix): it never reaches the bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = env.API_ORIGIN ?? 'http://localhost:8080'
  return {
    // MSW only serves its worker in `vite dev`: nothing mock-related reaches the production build.
    plugins: [vue(), { ...msw({ mode: 'worker-only' }), apply: 'serve' }],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy: {
        '/api': { target: apiOrigin, changeOrigin: true, secure: true },
      },
    },
    build: {
      // No public source maps in production.
      sourcemap: false,
      // ECharts (~550 kB) is only in the lazy chart chunk.
      chunkSizeWarningLimit: 600,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/mocks/vitest.setup.ts'],
      include: ['src/**/*.test.ts'],
      css: false,
      // No persistent module cache: every run transforms from source (no stale results across branches).
      fsModuleCache: false,
    },
  }
})
