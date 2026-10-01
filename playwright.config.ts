import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (!fs.existsSync('out/main/index.js')) {
  execSync('npm run build', { stdio: 'inherit' });
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  workers: 1,
  reporter: 'list'
});
