import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';

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

/**
 * Post-build plugin that wraps content.js in an IIFE to prevent
 * "Cannot use import statement outside a module" errors.
 *
 * Chrome content scripts run as classic scripts, not ES modules.
 * Vite's ES module output uses `import` statements for shared chunks.
 * This plugin inlines the shared chunk directly into content.js and
 * wraps everything in an IIFE.
 */
function wrapContentScriptPlugin() {
  return {
    name: 'wrap-content-script',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const contentPath = resolve(distDir, 'content.js');
      const bgPath = resolve(distDir, 'background.js');

      // Find the polyfill chunk
      const chunksDir = resolve(distDir, 'chunks');
      let polyfillCode = '';
      let polyfillChunkName = '';

      if (existsSync(chunksDir)) {
        const chunkFiles = readdirSync(chunksDir);
        const polyfillFile = chunkFiles.find((f) => f.startsWith('browser-polyfill'));
        if (polyfillFile) {
          polyfillChunkName = polyfillFile;
          polyfillCode = readFileSync(resolve(chunksDir, polyfillFile), 'utf-8');
        }
      }

      // Process content.js: inline polyfill and wrap in IIFE
      if (existsSync(contentPath) && polyfillCode) {
        let code = readFileSync(contentPath, 'utf-8');

        // Extract the polyfill export variable name
        const exportMatch = polyfillCode.match(/export\s*\{\s*(\w+)\s+as\s+(\w+)\s*\}/);
        const polyfillVarName = exportMatch ? exportMatch[1] : 'browser';
        const exportedAs = exportMatch ? exportMatch[2] : 'b';

        // Remove the export statement from polyfill
        let inlinedPolyfill = polyfillCode.replace(/export\s*\{[^}]+\}\s*;?\s*$/, '');

        // Remove the import statement from content.js
        const importRegex = new RegExp(
          `import\\s*\\{\\s*${exportedAs}\\s+as\\s+(\\w+)\\s*\\}\\s*from\\s*["']\\.\\/chunks\\/${polyfillChunkName.replace(/\./g, '\\.')}["']\\s*;?`
        );
        const importMatch = code.match(importRegex);
        const localAlias = importMatch ? importMatch[1] : exportedAs;

        code = code.replace(importRegex, '');

        // Remove dynamic import preload helper and selector-health-checker import
        code = code.replace(/const __vite__mapDeps[^;]+;/, '');

        // Replace dynamic import calls with inline no-op (selector health checker)
        code = code.replace(
          /import\("\.\/chunks\/selector-health-checker[^"]*"\)/g,
          'Promise.resolve({ runSelectorHealthCheck: () => ({}) })',
        );
        code = code.replace(
          /\w+\(\s*\(\)\s*=>\s*import\("\.\/chunks\/selector-health-checker[^)]*\)\s*,\s*__vite__mapDeps\([^)]*\)\s*\)/g,
          'Promise.resolve({ runSelectorHealthCheck: () => ({}) })',
        );

        // Remove any remaining export statements
        code = code.replace(/export\s*\{[^}]*\}\s*;?\s*$/g, '');

        // Wrap everything in IIFE
        const wrapped = `(function() {\n${inlinedPolyfill}\nvar ${localAlias} = ${polyfillVarName};\n${code}\n})();\n`;
        writeFileSync(contentPath, wrapped);
      }

      // Process background.js: same treatment (service worker can use
      // "type": "module" but we inline anyway for consistency)
      if (existsSync(bgPath) && polyfillCode) {
        let code = readFileSync(bgPath, 'utf-8');

        const exportMatch = polyfillCode.match(/export\s*\{\s*(\w+)\s+as\s+(\w+)\s*\}/);
        const polyfillVarName = exportMatch ? exportMatch[1] : 'browser';
        const exportedAs = exportMatch ? exportMatch[2] : 'b';

        let inlinedPolyfill = polyfillCode.replace(/export\s*\{[^}]+\}\s*;?\s*$/, '');

        const importRegex = new RegExp(
          `import\\s*\\{\\s*${exportedAs}\\s+as\\s+(\\w+)\\s*\\}\\s*from\\s*["']\\.\\/chunks\\/${polyfillChunkName.replace(/\./g, '\\.')}["']\\s*;?`
        );
        const importMatch = code.match(importRegex);
        const localAlias = importMatch ? importMatch[1] : exportedAs;

        code = code.replace(importRegex, '');

        const wrapped = `(function() {\n${inlinedPolyfill}\nvar ${localAlias} = ${polyfillVarName};\n${code}\n})();\n`;
        writeFileSync(bgPath, wrapped);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionAssetsPlugin(), wrapContentScriptPlugin()],
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
