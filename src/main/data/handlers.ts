import { app, dialog, shell, type BrowserWindow } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { defaultPlanStore } from '../plans/store';

export async function openUserDataFolder(): Promise<{ ok: boolean; path: string }> {
  const userPath = app.getPath('userData');
  await shell.openPath(userPath);
  return { ok: true, path: userPath };
}

export async function exportAllPlansWithDialog(
  parentWindow: BrowserWindow | null
): Promise<{ count: number; filePath: string | null }> {
  const allPlans = defaultPlanStore.list();
  if (!parentWindow) return { count: allPlans.length, filePath: null };

  const res = await dialog.showSaveDialog(parentWindow, {
    title: 'Export All Build Plans',
    defaultPath: 'stratcom-plans-backup.json',
    filters: [{ name: 'JSON (*.json)', extensions: ['json'] }]
  });

  if (res.canceled || !res.filePath) {
    return { count: allPlans.length, filePath: null };
  }

  fs.writeFileSync(res.filePath, JSON.stringify(allPlans, null, 2), 'utf-8');
  return { count: allPlans.length, filePath: res.filePath };
}

export async function clearUserSessions(): Promise<{ cleared: boolean }> {
  const sessionsDir = path.join(app.getPath('userData'), 'sessions');
  if (fs.existsSync(sessionsDir)) {
    fs.rmSync(sessionsDir, { recursive: true, force: true });
    fs.mkdirSync(sessionsDir, { recursive: true });
  }
  return { cleared: true };
}
