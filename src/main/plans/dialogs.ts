import { BrowserWindow, dialog } from 'electron';
import * as fs from 'node:fs';
import type { BuildPlan } from '../../core/schemas';
import { planFileName, planToFile } from '../../core/plans/files';
import { defaultPlanStore } from './store';

export async function importPlanWithDialog(
  parentWindow: BrowserWindow | null,
  req?: { openFileDialog?: boolean; content?: string; shareCode?: string }
): Promise<BuildPlan | null> {
  if (req?.openFileDialog) {
    if (!parentWindow) return null;
    const res = await dialog.showOpenDialog(parentWindow, {
      title: 'Import Build Plan',
      filters: [{ name: 'StratCom Plan (*.json)', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    const content = fs.readFileSync(res.filePaths[0]!, 'utf-8');
    return defaultPlanStore.importTextOrCode(content);
  }
  if (req?.content) return defaultPlanStore.importTextOrCode(req.content);
  if (req?.shareCode) return defaultPlanStore.import(req.shareCode);
  return null;
}

export async function exportPlanWithDialog(
  parentWindow: BrowserWindow | null,
  req: { id: string; saveDialog?: boolean }
): Promise<{ shareCode: string; discordText?: string; savedPath?: string | null }> {
  const plan = defaultPlanStore.get(req.id);
  if (!plan) throw new Error(`Plan not found: ${req.id}`);
  const exported = defaultPlanStore.export(req.id);
  let savedPath: string | null = null;

  if (req.saveDialog && parentWindow) {
    const res = await dialog.showSaveDialog(parentWindow, {
      title: 'Export Build Plan',
      defaultPath: planFileName(plan),
      filters: [{ name: 'StratCom Plan (*.stratcom.json)', extensions: ['json'] }]
    });
    if (!res.canceled && res.filePath) {
      fs.writeFileSync(res.filePath, planToFile(plan), 'utf-8');
      savedPath = res.filePath;
    }
  }

  return {
    shareCode: exported.shareCode,
    discordText: exported.discordText,
    savedPath
  };
}

export async function browseBarDirectory(parentWindow: BrowserWindow | null): Promise<string | null> {
  if (!parentWindow) return null;
  const res = await dialog.showOpenDialog(parentWindow, {
    title: 'Select Beyond All Reason Data Directory',
    properties: ['openDirectory']
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0] ?? null;
}
