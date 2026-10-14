import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

if (process.argv.includes('--coverage')) {
  process.env.VITEST_COVERAGE = 'true';
}

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          globalSetup: ['tools/vitest-electron-setup.ts'],
          include: [
            'src/core/**/*.test.ts',
            'src/shared/**/*.test.ts',
            'src/preload/**/*.test.ts',
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
      include: ['src/core/**', 'src/main/ai/**'],
      exclude: ['src/core/**/*.test.ts', 'src/main/ai/**/*.test.ts', 'src/main/ai/__test__/**'],
      thresholds: {
        'src/core/**': { lines: 85 },
        'src/main/ai/**': { lines: 85 },
        'src/core/{sim,coach,analysis,registry,sharecode}/**': { lines: 90 }
      }
    }
  }
});
