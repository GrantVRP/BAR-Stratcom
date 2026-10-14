import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { devRendererUrl } from './dev-url';
import { defaultSettingsStore } from '../settings/store';
import type { CoachWindowBounds } from '../../core/schemas';
import { currentWindowIcon } from './window-icon';

let coachWindowInstance: BrowserWindow | null = null;
let currentMode: 'second-monitor' | 'overlay' = 'second-monitor';
let boundsSaveTimeout: NodeJS.Timeout | null = null;

export function getCoachWindow(): BrowserWindow | null {
  return coachWindowInstance;
}

export function isCoachWindowOpen(): boolean {
  return coachWindowInstance !== null && !coachWindowInstance.isDestroyed();
}

function saveWindowBounds(win: BrowserWindow): void {
  if (boundsSaveTimeout) {
    clearTimeout(boundsSaveTimeout);
  }
  boundsSaveTimeout = setTimeout(() => {
    if (win.isDestroyed()) return;
    const b = win.getBounds();
    const current = defaultSettingsStore.getSettings();
    const newBounds: CoachWindowBounds = {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height
    };
    defaultSettingsStore.updateSettings({
      coachWindow: {
        ...current.coachWindow,
        bounds: newBounds
      }
    });
  }, 250);
}

export function openCoachWindow(modeOverride?: 'second-monitor' | 'overlay'): BrowserWindow {
  const settings = defaultSettingsStore.getSettings();
  const targetMode = modeOverride ?? (settings.coachWindow.overlayMode ? 'overlay' : 'second-monitor');

  // If already open in the same mode, bring to front and focus
  if (coachWindowInstance && !coachWindowInstance.isDestroyed()) {
    if (currentMode === targetMode) {
      if (coachWindowInstance.isMinimized()) coachWindowInstance.restore();
      coachWindowInstance.show();
      coachWindowInstance.focus();
      return coachWindowInstance;
    }
    // Mode changed: close existing window to re-create with new frame/transparency settings
    coachWindowInstance.close();
    coachWindowInstance = null;
  }

  currentMode = targetMode;
  const isOverlay = targetMode === 'overlay';
  const bounds = settings.coachWindow.bounds;

  const win = new BrowserWindow({
    title: 'BAR StratCom Coach',
    icon: currentWindowIcon(),
    width: bounds?.width ?? 420,
    height: bounds?.height ?? 720,
    minWidth: 360,
    minHeight: 480,
    x: bounds?.x,
    y: bounds?.y,
    frame: !isOverlay,
    transparent: isOverlay,
    backgroundColor: isOverlay ? '#00000000' : '#0c0e18',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  coachWindowInstance = win;

  // Set always-on-top once (no periodic re-assertion, D-00 / 06 §1)
  if (isOverlay) {
    win.setAlwaysOnTop(true, 'screen-saver');
    if (settings.coachWindow.clickThrough) {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  } else if (settings.coachWindow.alwaysOnTop) {
    win.setAlwaysOnTop(true);
  }

  // Security handlers
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  // Bounds persistence on resize and move
  win.on('resize', () => saveWindowBounds(win));
  win.on('move', () => saveWindowBounds(win));

  win.on('closed', () => {
    coachWindowInstance = null;
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Load coach window route
  const devUrl = devRendererUrl();
  if (devUrl) {
    win.loadURL(`${devUrl}#/coach-window`);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/coach-window' });
  }

  return win;
}

export function closeCoachWindow(): void {
  if (coachWindowInstance && !coachWindowInstance.isDestroyed()) {
    coachWindowInstance.close();
    coachWindowInstance = null;
  }
}

export function toggleCoachWindow(modeOverride?: 'second-monitor' | 'overlay'): boolean {
  if (isCoachWindowOpen()) {
    closeCoachWindow();
    return false;
  }
  openCoachWindow(modeOverride);
  return true;
}

export function setCoachWindowClickThrough(enabled: boolean): void {
  if (coachWindowInstance && !coachWindowInstance.isDestroyed() && currentMode === 'overlay') {
    coachWindowInstance.setIgnoreMouseEvents(enabled, { forward: true });
  }
}
