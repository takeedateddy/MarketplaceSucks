import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const browser = process.env.BROWSER || 'chrome';

function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }
      const manifestSrc = resolve(__dirname, `public/manifest.${browser}.json`);
      const manifestDest = resolve(distDir, 'manifest.json');
      if (existsSync(manifestSrc)) {
        copyFileSync(manifestSrc, manifestDest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        popup: resolve(__dirname, 'src/ui/popup/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    'process.env.BROWSER': JSON.stringify(browser),
  },
});
