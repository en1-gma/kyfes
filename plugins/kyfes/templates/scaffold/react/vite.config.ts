import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Backend (BFF) used by the dev proxy: same-origin `/api` in the browser, so the
  // session cookie (`__Host-session`) and the XSRF cookie work exactly as in production.
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false, secure: true },
      },
    },
    preview: { port: 4173, strictPort: true },
    build: {
      // Production source maps are not published (kyfes §3.4).
      sourcemap: false,
      target: 'es2023',
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      css: false,
      unstubEnvs: true,
      // No persistent transform cache: it keeps stale `import.meta.glob` results, so the locales of a
      // new feature would not be found until the cache is cleared.
      fsModuleCache: false,
    },
  };
});
