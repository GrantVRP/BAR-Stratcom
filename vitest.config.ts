import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'src/core/**/*.test.ts',
            'src/shared/**/*.test.ts',
            'src/main/**/*.test.ts',
            'tools/**/*.test.ts',
            'widget/test/**/*.test.ts'
          ]
        },
        resolve: {
          alias: {
            '@core': resolve(__dirname, 'src/core'),
            '@shared': resolve(__dirname, 'src/shared'),
            '@renderer': resolve(__dirname, 'src/renderer/src')
          }
        }
      },
      {
        test: {
          name: 'web',
          environment: 'happy-dom',
          include: ['src/renderer/**/*.test.{ts,tsx}']
        },
        resolve: {
          alias: {
            '@core': resolve(__dirname, 'src/core'),
            '@shared': resolve(__dirname, 'src/shared'),
            '@renderer': resolve(__dirname, 'src/renderer/src')
          }
        }
      }
    ],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      exclude: ['src/core/**/*.test.ts']
    }
  }
});
