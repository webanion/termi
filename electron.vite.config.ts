import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// The file names inside out/ match the sources, so the paths the main process builds with
// __dirname (../preload/preload.js, ../renderer/index.html, ../../assets) work the same in
// development and in a packaged app.
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
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') },
      },
    },
  },
});
