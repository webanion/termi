import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Unit tests: fast, no Electron, no shell. Renderer tests pick jsdom with a comment at their top.
export default defineConfig({
  resolve: { alias: { '@': resolve('src') } },
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
