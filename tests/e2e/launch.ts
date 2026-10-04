import { _electron as electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface LaunchedApp {
  app: ElectronApplication;
  tmpDir: string;
  close: () => Promise<void>;
}

export interface LaunchOptions {
  /** Fixture folders (data/fixtures/sessions/<id>) copied into the temp profile's sessions/ before launch. */
  seedSessions?: string[];
}

export async function launchApp(
  extraArgs: string[] = [],
  customTmpDir?: string,
  options: LaunchOptions = {}
): Promise<LaunchedApp> {
  const tmpDir = customTmpDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-e2e-'));
  for (const id of options.seedSessions ?? []) {
    fs.cpSync(path.join('data', 'fixtures', 'sessions', id), path.join(tmpDir, 'sessions', id), { recursive: true });
  }
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${tmpDir}`, ...extraArgs]
  });

  const close = async () => {
    try {
      await app.close();
    } finally {
      if (!customTmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (err) {
          console.warn(`Failed to clean up temp user data dir ${tmpDir}:`, err);
        }
      }
    }
  };

  return { app, tmpDir, close };
}

