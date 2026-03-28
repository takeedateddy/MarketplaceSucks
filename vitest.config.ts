import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/platform': resolve(__dirname, 'src/platform'),
      '@/content': resolve(__dirname, 'src/content'),
      '@/data': resolve(__dirname, 'src/data'),
      '@/design-system': resolve(__dirname, 'src/design-system'),
      '@/ui': resolve(__dirname, 'src/ui'),
      '@/plugins': resolve(__dirname, 'src/plugins'),
      '@/workers': resolve(__dirname, 'src/workers'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts', 'src/core/test-helpers.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
