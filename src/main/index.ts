import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { broadcast, handle } from './ipc/register';

import { defaultSettingsStore } from './settings/store';
import { locateGame } from './game/locator';
import { defaultWidgetInstaller } from './game/installer';
import { FileBridge } from './game/file-bridge';
import { HealthManager } from './game/health';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'BAR StratCom',
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
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

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Deny window.open requests
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Deny in-app navigation
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Forward renderer console logs
  mainWindow.webContents.on('console-message', (event) => {
    console.log(`[Renderer level ${event.level}] ${event.message} (${event.sourceId}:${event.lineNumber})`);
  });

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Single-instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Register IPC handlers
    handle('app:getInfo', () => {
      const settings = defaultSettingsStore.getSettings();
      return {
        version: app.getVersion(),
        platform: process.platform,
        dataPaths: {
          userData: app.getPath('userData'),
          barData: settings.bar.dataDir
        }
      };
    });

    handle('settings:get', () => {
      return defaultSettingsStore.getSettings();
    });

    handle('settings:set', (req) => {
      return defaultSettingsStore.updateSettings(req ?? {});
    });

    const syncBridgeState = (): void => {
      const currentSettings = defaultSettingsStore.getSettings();
      const status = defaultWidgetInstaller.status(currentSettings.bar.dataDir ?? undefined);
      fileBridge.setDataDir(currentSettings.bar.dataDir);
      fileBridge.setWidgetInfo(status.installed, status.installedVersion, status.bundledVersion);
      healthManager.checkHealth();
    };

    const initialSettings = defaultSettingsStore.getSettings();
    const initialWidgetStatus = defaultWidgetInstaller.status(
      initialSettings.bar.dataDir ?? undefined
    );

    const fileBridge = new FileBridge({
      dataDir: initialSettings.bar.dataDir,
      widgetInstalled: initialWidgetStatus.installed,
      installedVersion: initialWidgetStatus.installedVersion,
      bundledVersion: initialWidgetStatus.bundledVersion
    });

    const healthManager = new HealthManager(() => fileBridge.getHealthInputs());

    fileBridge.on('state', (stateDoc) => {
      broadcast('live:state', {
        frame: stateDoc.frame,
        gameSeconds: stateDoc.gameSeconds,
        me: stateDoc.me,
        wind: stateDoc.wind,
        res: stateDoc.res,
        counts: stateDoc.counts,
        builders: stateDoc.builders,
        factories: stateDoc.factories,
        commander: stateDoc.commander,
        bp: stateDoc.bp,
        enemies: stateDoc.enemies,
        teams: stateDoc.teams
      });
    });

    healthManager.on('health', (health) => {
      broadcast('live:health', health);
    });

    fileBridge.start();
    healthManager.start();

    handle('game:locate', async (req) => {
      const res = await locateGame(req?.manualPath ? { manualPath: req.manualPath } : {});
      syncBridgeState();
      return res;
    });

    handle('game:widgetStatus', () => {
      return defaultWidgetInstaller.status();
    });

    handle('game:installWidget', () => {
      const res = defaultWidgetInstaller.install();
      syncBridgeState();
      return res;
    });

    handle('game:uninstallWidget', () => {
      const res = defaultWidgetInstaller.uninstall();
      syncBridgeState();
      return res;
    });

    handle('game:removeLegacyWidget', (req) => {
      const res = defaultWidgetInstaller.removeLegacy(req.confirm);
      syncBridgeState();
      return res;
    });

    createWindow();

    if (mainWindow) {
      mainWindow.on('ready-to-show', () => {
        broadcast('live:health', healthManager.getHealth());
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
