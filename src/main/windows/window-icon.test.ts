import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';
import { WINDOW_FACTIONS } from '../../shared/ipc';
import { currentWindowIcon, getWindowFaction, setWindowFaction, windowIconPath } from './window-icon';

function fakeWindow(destroyed = false): BrowserWindow {
  return { isDestroyed: () => destroyed, setIcon: vi.fn() } as unknown as BrowserWindow;
}

describe('window icon per faction (owner request 2026-10-13)', () => {
  it('every faction has its icon file in build/icons (dev path; packaged: resources/icons)', () => {
    for (const faction of WINDOW_FACTIONS) {
      const file = windowIconPath(faction);
      expect(path.relative(process.cwd(), file)).toBe(path.join('build', 'icons', `stratcom-${faction}.ico`));
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it('starts on Armada, the launcher\'s first faction', () => {
    expect(getWindowFaction()).toBe('armada');
    expect(currentWindowIcon()).toBe(windowIconPath('armada'));
  });

  it('switches every open window, skips closed ones, and new windows take the new icon', () => {
    const open = fakeWindow();
    const closed = fakeWindow(true);
    setWindowFaction('cortex', [open, closed]);
    expect(open.setIcon).toHaveBeenCalledWith(windowIconPath('cortex'));
    expect(closed.setIcon).not.toHaveBeenCalled();
    expect(getWindowFaction()).toBe('cortex');
    expect(currentWindowIcon()).toBe(windowIconPath('cortex'));
    setWindowFaction('armada', []);
  });
});
