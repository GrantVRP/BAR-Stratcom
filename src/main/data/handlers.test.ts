import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { dialog, shell, type BrowserWindow } from 'electron';
import { openUserDataFolder, exportAllPlansWithDialog, clearUserSessions } from './handlers';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('C:\\mock\\userData')
  },
  dialog: {
    showSaveDialog: vi.fn()
  },
  shell: {
    openPath: vi.fn().mockResolvedValue('')
  }
}));

vi.mock('../plans/store', () => ({
  defaultPlanStore: {
    list: vi.fn().mockReturnValue([])
  }
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    rmSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  };
});

describe('data handlers (T06.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('openUserDataFolder opens userData path via shell', async () => {
    const res = await openUserDataFolder();
    expect(res.ok).toBe(true);
    expect(res.path).toBe('C:\\mock\\userData');
    expect(shell.openPath).toHaveBeenCalledWith('C:\\mock\\userData');
  });

  it('exportAllPlansWithDialog handles save dialog cancellation and write', async () => {
    const mockWindow = {} as unknown as BrowserWindow;
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ canceled: true, filePath: '' });

    const cancelRes = await exportAllPlansWithDialog(mockWindow);
    expect(cancelRes.filePath).toBeNull();

    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({
      canceled: false,
      filePath: 'C:\\backup.json'
    });

    const successRes = await exportAllPlansWithDialog(mockWindow);
    expect(successRes.filePath).toBe('C:\\backup.json');
    expect(fs.writeFileSync).toHaveBeenCalledWith('C:\\backup.json', expect.any(String), 'utf-8');
  });

  it('clearUserSessions cleans up sessions directory', async () => {
    const res = await clearUserSessions();
    expect(res.cleared).toBe(true);
    expect(fs.rmSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
  });
});
