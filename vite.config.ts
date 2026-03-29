import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite config used by Vitest for running tests.
 *
 * The actual extension build uses scripts/build-extension.mjs which
 * runs 3 separate Vite builds (content script IIFE, background IIFE,
 * popup ES module). This config only provides path aliases and test
 * settings for `pnpm test`.
 */
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
});
