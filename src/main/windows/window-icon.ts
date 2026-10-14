import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import type { WindowFaction } from '../../shared/ipc';

/**
 * The window icon: "BS" in the logo's font with the S in the faction's
 * colour, one.ico per faction made by `npm run make:icon`. The renderer names the faction it shows
 * (the launcher's choice, then the active plan's); every open window follows.
 */
let current: WindowFaction = 'armada';

/** In dev `<repo>/build/icons/…`; packaged `resources/icons/…` (electron-builder extraResources). */
export function windowIconPath(faction: WindowFaction): string {
  const file = `stratcom-${faction}.ico`;
  try {
    if (app?.isPackaged && process.resourcesPath) return path.join(process.resourcesPath, 'icons', file);
  } catch {
    // outside the Electron app lifecycle (tests)
  }
  const dev = path.join(process.cwd(), 'build', 'icons', file);
  return fs.existsSync(dev) ? dev : path.resolve(__dirname, '../../build/icons', file);
}

/** The icon for a window being created now, or undefined (Electron's own) when the file is missing. */
export function currentWindowIcon(): string | undefined {
  const file = windowIconPath(current);
  return fs.existsSync(file) ? file : undefined;
}

export function getWindowFaction(): WindowFaction {
  return current;
}

/** Switch every open window's icon to this faction's. */
export function setWindowFaction(faction: WindowFaction, windows: BrowserWindow[] = BrowserWindow.getAllWindows()): void {
  current = faction;
  const icon = currentWindowIcon();
  if (!icon) return;
  for (const win of windows) if (!win.isDestroyed()) win.setIcon(icon);
}
