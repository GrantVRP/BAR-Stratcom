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
  /** Extra environment for the app (e.g. STRATCOM_FAKE_AI=1, honoured only in non-packaged builds). */
  env?: Record<string, string>;
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
    args: ['.', `--user-data-dir=${tmpDir}`, ...extraArgs],
    ...(options.env ? { env: { ...process.env, ...options.env } as Record<string, string> } : {})
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

