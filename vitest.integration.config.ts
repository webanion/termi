import { defineConfig } from 'vitest/config';

// Integration tests: the built MCP server over stdio, and real shells through node-pty. They run
// one file at a time in separate processes, because they start real child processes.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
