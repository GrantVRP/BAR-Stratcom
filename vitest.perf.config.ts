import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/perf/**/*.perf.test.ts'],
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  }
});
