import { app, BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import { join } from 'path';
import { broadcast, handle } from './ipc/register';
import { planFileName, planToFile } from '../core/plans/files';

import { defaultSettingsStore } from './settings/store';
import { locateGame } from './game/locator';
import { defaultWidgetInstaller } from './game/installer';
import { FileBridge } from './game/file-bridge';
import { HealthManager } from './game/health';
import { SessionRecorder } from './sessions/recorder';
import { defaultCoachRunner } from './coach/runner';
import { findDataDir, loadRegistry, loadSnapshot } from './registry/loader';
import { DemoSource, derivePlanFromDemo, listDemos } from './demo/demo-source';
import { defaultPlanStore } from './plans/store';
import { getMap, loadMaps } from './maps/loader';

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

    const initialSettings = defaultSettingsStore.getSettings();
    const initialWidgetStatus = defaultWidgetInstaller.status(initialSettings.bar.dataDir ?? undefined);

    const fileBridge = new FileBridge({
      dataDir: initialSettings.bar.dataDir,
      widgetInstalled: initialWidgetStatus.installed,
      installedVersion: initialWidgetStatus.installedVersion,
      bundledVersion: initialWidgetStatus.bundledVersion
    });

    const healthManager = new HealthManager(() => fileBridge.getHealthInputs());

    const sessionsDir = join(app.getPath('userData'), 'sessions');
    const initialStratcomDir = initialSettings.bar.dataDir
      ? join(initialSettings.bar.dataDir, 'stratcom')
      : null;

    const sessionRecorder = new SessionRecorder({
      sessionsDir,
      stratcomDir: initialStratcomDir,
      activePlanIdProvider: () => defaultSettingsStore.getSettings().activePlanId
    });
    sessionRecorder.attach(fileBridge);

    const syncBridgeState = (): void => {
      const currentSettings = defaultSettingsStore.getSettings();
      const status = defaultWidgetInstaller.status(currentSettings.bar.dataDir ?? undefined);
      fileBridge.setDataDir(currentSettings.bar.dataDir);
      fileBridge.setWidgetInfo(status.installed, status.installedVersion, status.bundledVersion);
      const stratcomDir = currentSettings.bar.dataDir ? join(currentSettings.bar.dataDir, 'stratcom') : null;
      sessionRecorder.setStratcomDir(stratcomDir);
      healthManager.checkHealth();
    };

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

    let activeDemoSource: DemoSource | null = null;

    handle('demo:list', () => {
      return listDemos();
    });

    handle('coach:start', async (req) => {
      const registry = loadRegistry();
      const currentSettings = defaultSettingsStore.getSettings();

      if (req.mode === 'demo') {
        if (!req.demoId) {
          throw new Error('Coach start in demo mode requires a demoId');
        }
        const dataDir = findDataDir();
        const fixtureDir = join(dataDir, 'fixtures', 'sessions', req.demoId);
        if (activeDemoSource) {
          activeDemoSource.stop();
          activeDemoSource = null;
        }
        const demoSource = new DemoSource({
          fixtureDir,
          speed: req.speed ?? 1
        });
        activeDemoSource = demoSource;

        let plan = req.plan;
        if (!plan) {
          plan = derivePlanFromDemo(demoSource, registry);
        }

        await defaultCoachRunner.start({
          plan,
          mode: 'demo',
          source: demoSource,
          registry,
          stratcomDir: null
        });

        demoSource.start();
        return { ok: true };
      }

      let plan = req.plan;
      if (!plan && req.planId) {
        plan = defaultPlanStore.get(req.planId) ?? undefined;
      }
      if (!plan) {
        throw new Error('Coach start requires a plan object or valid planId');
      }
      const stratcomDir = currentSettings.bar.dataDir ? join(currentSettings.bar.dataDir, 'stratcom') : null;
      await defaultCoachRunner.start({
        plan,
        mode: req.mode,
        source: fileBridge,
        registry,
        stratcomDir
      });
      return { ok: true };
    });

    handle('coach:stop', async () => {
      if (activeDemoSource) {
        activeDemoSource.stop();
        activeDemoSource = null;
      }
      await defaultCoachRunner.stop();
      return { ok: true };
    });

    handle('coach:manual', (req) => {
      const clock = defaultCoachRunner.getManualClock();
      if (req.action === 'start') {
        clock.start();
      } else if (req.action === 'pause') {
        clock.pause();
      } else if (req.action === 'reset') {
        clock.reset();
      }
      return {
        ok: true,
        clock: clock.getClock(),
        running: clock.isRunning()
      };
    });

    handle('coach:markDone', (req) => {
      defaultCoachRunner.markStepDone(req.stepId);
      return { ok: true };
    });

    handle('registry:getSnapshot', (req) => {
      return loadSnapshot(req?.gameVersion);
    });

    handle('maps:list', () => {
      return loadMaps();
    });

    handle('maps:get', (req) => {
      return getMap(req.fileName);
    });

    handle('plans:list', () => {
      return defaultPlanStore.list();
    });

    handle('plans:get', (req) => {
      return defaultPlanStore.get(req.id);
    });

    handle('plans:save', (req) => {
      return defaultPlanStore.save(req);
    });

    handle('plans:delete', (req) => {
      return defaultPlanStore.delete(req.id);
    });

    handle('plans:import', async (req) => {
      if (req?.openFileDialog) {
        if (!mainWindow) return null;
        const res = await dialog.showOpenDialog(mainWindow, {
          title: 'Import Build Plan',
          filters: [{ name: 'StratCom Plan (*.json)', extensions: ['json'] }],
          properties: ['openFile']
        });
        if (res.canceled || res.filePaths.length === 0) {
          return null;
        }
        const filePath = res.filePaths[0]!;
        const content = fs.readFileSync(filePath, 'utf-8');
        return defaultPlanStore.importTextOrCode(content);
      }
      if (req?.content) {
        return defaultPlanStore.importTextOrCode(req.content);
      }
      if (req?.shareCode) {
        return defaultPlanStore.import(req.shareCode);
      }
      return null;
    });

    handle('plans:export', async (req) => {
      const plan = defaultPlanStore.get(req.id);
      if (!plan) {
        throw new Error(`Plan not found: ${req.id}`);
      }
      const exported = defaultPlanStore.export(req.id);
      let savedPath: string | null = null;

      if (req.saveDialog) {
        if (mainWindow) {
          const res = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Build Plan',
            defaultPath: planFileName(plan),
            filters: [{ name: 'StratCom Plan (*.stratcom.json)', extensions: ['json'] }]
          });
          if (!res.canceled && res.filePath) {
            fs.writeFileSync(res.filePath, planToFile(plan), 'utf-8');
            savedPath = res.filePath;
          }
        }
      }

      return {
        shareCode: exported.shareCode,
        discordText: exported.discordText,
        savedPath
      };
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
