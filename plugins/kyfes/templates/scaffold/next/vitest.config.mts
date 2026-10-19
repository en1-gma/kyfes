import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // No persistent module cache on disk: stale transforms must never hide a change.
    fsModuleCache: false,
    // next-intl ships ESM that imports 'next/navigation' without extension
    server: { deps: { inline: ['next-intl'] } },
  },
});
