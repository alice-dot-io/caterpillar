import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['core/tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@cli': resolve(__dirname, 'core/src'),
    },
  },
});
