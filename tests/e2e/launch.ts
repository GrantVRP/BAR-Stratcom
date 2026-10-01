import { _electron as electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface LaunchedApp {
  app: ElectronApplication;
  tmpDir: string;
  close: () => Promise<void>;
}

export async function launchApp(extraArgs: string[] = []): Promise<LaunchedApp> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-e2e-'));
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${tmpDir}`, ...extraArgs]
  });

  const close = async () => {
    try {
      await app.close();
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Failed to clean up temp user data dir ${tmpDir}:`, err);
      }
    }
  };

  return { app, tmpDir, close };
}
