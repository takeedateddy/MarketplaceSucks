import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';

const browser = process.env.BROWSER || 'chrome';

function copyExtensionAssetsPlugin() {
  return {
    name: 'copy-extension-assets',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      // Copy manifest
      const manifestSrc = resolve(__dirname, `public/manifest.${browser}.json`);
      const manifestDest = resolve(distDir, 'manifest.json');
      if (existsSync(manifestSrc)) {
        copyFileSync(manifestSrc, manifestDest);
      }

      // Copy icons
      const iconsSrc = resolve(__dirname, 'src/assets/icons');
      const iconsDest = resolve(distDir, 'assets/icons');
      if (existsSync(iconsSrc)) {
        mkdirSync(iconsDest, { recursive: true });
        for (const file of readdirSync(iconsSrc)) {
          copyFileSync(resolve(iconsSrc, file), resolve(iconsDest, file));
        }
      }

      // Copy popup.html to root (Vite outputs it nested under src/ui/popup/)
      const popupSrc = resolve(distDir, 'src/ui/popup/index.html');
      const popupDest = resolve(distDir, 'popup.html');
      if (existsSync(popupSrc)) {
        copyFileSync(popupSrc, popupDest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionAssetsPlugin()],
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
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  define: {
    'process.env.BROWSER': JSON.stringify(browser),
  },
});
