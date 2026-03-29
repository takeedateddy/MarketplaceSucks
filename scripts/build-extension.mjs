#!/usr/bin/env node

/**
 * Extension build script that runs 3 separate Vite builds:
 * 1. Content script → IIFE (Chrome requires classic script)
 * 2. Background service worker → IIFE (consistent, no module needed)
 * 3. Popup → ES module (loaded via HTML <script type="module">)
 *
 * This avoids the "Cannot use import statement outside a module" error
 * that occurs when Vite code-splits shared dependencies into ES module
 * chunks that content scripts can't import.
 */

import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const browser = process.env.BROWSER || 'chrome';

function copyAssets() {
  const distDir = resolve(rootDir, 'dist');
  mkdirSync(distDir, { recursive: true });

  // Copy manifest
  const manifestSrc = resolve(rootDir, `public/manifest.${browser}.json`);
  if (existsSync(manifestSrc)) {
    copyFileSync(manifestSrc, resolve(distDir, 'manifest.json'));
  }

  // Copy icons
  const iconsSrc = resolve(rootDir, 'src/assets/icons');
  const iconsDest = resolve(distDir, 'assets/icons');
  if (existsSync(iconsSrc)) {
    mkdirSync(iconsDest, { recursive: true });
    for (const file of readdirSync(iconsSrc)) {
      copyFileSync(resolve(iconsSrc, file), resolve(iconsDest, file));
    }
  }
}

const sharedAlias = {
  '@': resolve(rootDir, 'src'),
  '@/core': resolve(rootDir, 'src/core'),
  '@/platform': resolve(rootDir, 'src/platform'),
  '@/content': resolve(rootDir, 'src/content'),
  '@/data': resolve(rootDir, 'src/data'),
  '@/design-system': resolve(rootDir, 'src/design-system'),
  '@/ui': resolve(rootDir, 'src/ui'),
  '@/plugins': resolve(rootDir, 'src/plugins'),
  '@/workers': resolve(rootDir, 'src/workers'),
};

async function main() {
  console.log(`Building MarketplaceSucks for ${browser}...`);

  // 1. Content script (IIFE — self-contained, no imports)
  console.log('\n[1/3] Building content script (IIFE)...');
  await build({
    configFile: false,
    resolve: { alias: sharedAlias },
    define: { 'process.env.BROWSER': JSON.stringify(browser) },
    build: {
      outDir: resolve(rootDir, 'dist'),
      emptyOutDir: true,
      sourcemap: process.env.NODE_ENV === 'development',
      lib: {
        entry: resolve(rootDir, 'src/content/index.ts'),
        name: 'MPS',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          // Name CSS as content.css to match manifest expectation
          assetFileNames: (info) => {
            if (info.name && info.name.endsWith('.css')) {
              return 'assets/content.css';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
    },
  });

  // 2. Background service worker (IIFE)
  console.log('\n[2/3] Building background service worker (IIFE)...');
  await build({
    configFile: false,
    resolve: { alias: sharedAlias },
    define: { 'process.env.BROWSER': JSON.stringify(browser) },
    build: {
      outDir: resolve(rootDir, 'dist'),
      emptyOutDir: false,
      sourcemap: process.env.NODE_ENV === 'development',
      lib: {
        entry: resolve(rootDir, 'src/background/service-worker.ts'),
        name: 'MPSBackground',
        formats: ['iife'],
        fileName: () => 'background.js',
      },
    },
  });

  // 3. Popup (ES module — loaded as HTML page)
  console.log('\n[3/3] Building popup (ES module)...');
  await build({
    configFile: false,
    plugins: [react()],
    resolve: { alias: sharedAlias },
    define: { 'process.env.BROWSER': JSON.stringify(browser) },
    build: {
      outDir: resolve(rootDir, 'dist'),
      emptyOutDir: false,
      sourcemap: process.env.NODE_ENV === 'development',
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'src/ui/popup/index.html'),
        },
        output: {
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // 4. Copy manifest, icons, and fix popup path
  console.log('\nCopying assets...');
  copyAssets();

  // Fix popup.html path (Vite nests it under src/ui/popup/)
  const popupSrc = resolve(rootDir, 'dist/src/ui/popup/index.html');
  if (existsSync(popupSrc)) {
    copyFileSync(popupSrc, resolve(rootDir, 'dist/popup.html'));
  }

  console.log('\nBuild complete!');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
