import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// End-to-end: the built app through Playwright's Electron driver. One file, one app, its tests
// in order.
export default defineConfig({
  resolve: { alias: { '@': resolve('src') } },
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
