import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        perf: resolve(import.meta.dirname, 'perf.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
