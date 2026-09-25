import fs from 'fs';
import { resolve, sep } from 'path';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

const ASSETS = resolve('assets');

// index.html points at ../../assets. The build resolves that on disk, but in development the
// browser asks the dev server for /assets/..., outside the renderer root, so serve it here.
const devAssets: Plugin = {
  name: 'termi-dev-assets',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/assets', (req, res, next) => {
      const file = resolve(ASSETS, `.${decodeURIComponent((req.url ?? '').split('?')[0] ?? '')}`);
      if (!file.startsWith(ASSETS + sep) || !fs.existsSync(file)) return next();
      if (file.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      fs.createReadStream(file).pipe(res);
    });
  },
};

// The file names inside out/ match the sources, so the paths main.ts builds with __dirname
// (../preload/preload.js, ../renderer/index.html, ../../assets) work the same in development
// and in a packaged app.
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve('src/main/main.ts'),
          // Run with plain Node, outside Electron. It may import shared code, never electron.
          mcpServer: resolve('src/mcp/server.ts'),
        },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { preload: resolve('src/preload/preload.ts') },
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [devAssets],
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') },
      },
    },
  },
});
