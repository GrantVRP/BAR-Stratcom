import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { InstallResult, WidgetStatus } from '../../shared/ipc';
import { defaultSettingsStore, SettingsStore } from '../settings/store';

export const WIDGET_FILE_NAME = 'gui_stratcom.lua';
export const WIDGET_BACKUP_NAME = 'gui_stratcom.lua.bak';
export const LEGACY_WIDGET_FILE_NAME = 'gui_bar_theory_live_telemetry.lua';

/**
 * Parses `-- STRATCOM_WIDGET_VERSION x.y.z` from widget source code.
 */
export function parseWidgetVersion(content: string): string | null {
  const match = content.match(/--\s*STRATCOM_WIDGET_VERSION\s+([0-9a-zA-Z.-]+)/);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Checks whether child path is identical to or within parent directory.
 */
function isWithinOrSame(child: string, parent: string): boolean {
  const c = path.resolve(child).toLowerCase();
  const p = path.resolve(parent).toLowerCase();
  const rel = path.relative(p, c);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Path guard ensuring writes only occur inside `<data>/LuaUI/Widgets` or `<data>/stratcom`.
 */
export function assertPathInsideDataDir(targetPath: string, dataDir: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const allowedWidgetsDir = path.resolve(dataDir, 'LuaUI', 'Widgets');
  const allowedStratcomDir = path.resolve(dataDir, 'stratcom');

  const inWidgets = isWithinOrSame(resolvedTarget, allowedWidgetsDir);
  const inStratcom = isWithinOrSame(resolvedTarget, allowedStratcomDir);

  if (!inWidgets && !inStratcom) {
    throw new Error(
      `Path guard violation: "${resolvedTarget}" is not inside allowed BAR directories`
    );
  }
}

/**
 * Returns the path to the bundled widget file.
 * In dev: `<repo>/widget/gui_stratcom.lua`.
 * In prod: `process.resourcesPath/widget/gui_stratcom.lua`.
 */
export function getBundledWidgetPath(): string {
  try {
    if (app && app.isPackaged && process.resourcesPath) {
      const prodPath = path.join(process.resourcesPath, 'widget', WIDGET_FILE_NAME);
      if (fs.existsSync(prodPath)) {
        return prodPath;
      }
    }
  } catch {
    // Not running inside Electron app lifecycle
  }

  const devPath = path.join(process.cwd(), 'widget', WIDGET_FILE_NAME);
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  return path.resolve(__dirname, '../../widget', WIDGET_FILE_NAME);
}

export interface WidgetInstallerOptions {
  bundledWidgetPath?: string;
  settingsStore?: SettingsStore;
}

export class WidgetInstaller {
  private customBundledPath?: string;
  private settingsStore: SettingsStore;

  constructor(options: WidgetInstallerOptions = {}) {
    this.customBundledPath = options.bundledWidgetPath;
    this.settingsStore = options.settingsStore ?? defaultSettingsStore;
  }

  private getDataDir(override?: string): string | null {
    if (override) return override;
    return this.settingsStore.getSettings().bar.dataDir;
  }

  private getBundledPath(): string {
    return this.customBundledPath ?? getBundledWidgetPath();
  }

  /**
   * Returns current installation status of the widget and legacy telemetry widget.
   */
  status(customDataDir?: string): WidgetStatus {
    const bundledPath = this.getBundledPath();
    let bundledVersion = 'unknown';

    if (fs.existsSync(bundledPath)) {
      try {
        const content = fs.readFileSync(bundledPath, 'utf-8');
        bundledVersion = parseWidgetVersion(content) ?? 'unknown';
      } catch {
        bundledVersion = 'unknown';
      }
    }

    const dataDir = this.getDataDir(customDataDir);
    if (!dataDir || !fs.existsSync(dataDir)) {
      return {
        installed: false,
        installedVersion: null,
        bundledVersion,
        legacyPresent: false
      };
    }

    const installedPath = path.join(dataDir, 'LuaUI', 'Widgets', WIDGET_FILE_NAME);
    const legacyPath = path.join(dataDir, 'LuaUI', 'Widgets', LEGACY_WIDGET_FILE_NAME);

    let installed = false;
    let installedVersion: string | null = null;

    if (fs.existsSync(installedPath)) {
      installed = true;
      try {
        const content = fs.readFileSync(installedPath, 'utf-8');
        installedVersion = parseWidgetVersion(content);
      } catch {
        installedVersion = null;
      }
    }

    const legacyPresent = fs.existsSync(legacyPath);

    return {
      installed,
      installedVersion,
      bundledVersion,
      legacyPresent
    };
  }

  /**
   * Installs the bundled widget into BAR's LuaUI/Widgets directory.
   * Creates directories, backs up existing file to.bak, and verifies header.
   */
  install(customDataDir?: string): InstallResult {
    const dataDir = this.getDataDir(customDataDir);
    if (!dataDir) {
      return { success: false, message: 'BAR data directory is not configured' };
    }

    const bundledPath = this.getBundledPath();
    if (!fs.existsSync(bundledPath)) {
      return { success: false, message: `Bundled widget not found at ${bundledPath}` };
    }

    const bundledContent = fs.readFileSync(bundledPath, 'utf-8');
    const bundledVersion = parseWidgetVersion(bundledContent);
    if (!bundledVersion) {
      return {
        success: false,
        message: 'Bundled widget is missing STRATCOM_WIDGET_VERSION header'
      };
    }

    const widgetsDir = path.join(dataDir, 'LuaUI', 'Widgets');
    const stratcomDir = path.join(dataDir, 'stratcom');
    const targetWidgetPath = path.join(widgetsDir, WIDGET_FILE_NAME);
    const backupWidgetPath = path.join(widgetsDir, WIDGET_BACKUP_NAME);

    // Path guards before performing writes
    assertPathInsideDataDir(widgetsDir, dataDir);
    assertPathInsideDataDir(stratcomDir, dataDir);
    assertPathInsideDataDir(targetWidgetPath, dataDir);
    assertPathInsideDataDir(backupWidgetPath, dataDir);

    if (!fs.existsSync(widgetsDir)) {
      fs.mkdirSync(widgetsDir, { recursive: true });
    }
    if (!fs.existsSync(stratcomDir)) {
      fs.mkdirSync(stratcomDir, { recursive: true });
    }

    // Back up existing widget if present
    if (fs.existsSync(targetWidgetPath)) {
      fs.copyFileSync(targetWidgetPath, backupWidgetPath);
    }

    // Write widget file
    fs.writeFileSync(targetWidgetPath, bundledContent, 'utf-8');

    // Re-read and verify header
    const writtenContent = fs.readFileSync(targetWidgetPath, 'utf-8');
    const verifiedVersion = parseWidgetVersion(writtenContent);
    if (verifiedVersion !== bundledVersion) {
      return {
        success: false,
        message: `Widget verification failed: expected v${bundledVersion}, found ${verifiedVersion}`
      };
    }

    return {
      success: true,
      message: `Successfully installed StratCom widget v${bundledVersion}`
    };
  }

  /**
   * Uninstalls the StratCom widget by removing gui_stratcom.lua.
   */
  uninstall(customDataDir?: string): InstallResult {
    const dataDir = this.getDataDir(customDataDir);
    if (!dataDir) {
      return { success: false, message: 'BAR data directory is not configured' };
    }

    const targetWidgetPath = path.join(dataDir, 'LuaUI', 'Widgets', WIDGET_FILE_NAME);
    assertPathInsideDataDir(targetWidgetPath, dataDir);

    if (fs.existsSync(targetWidgetPath)) {
      fs.unlinkSync(targetWidgetPath);
      return { success: true, message: 'Successfully uninstalled StratCom widget' };
    }

    return { success: true, message: 'StratCom widget is not installed' };
  }

  /**
   * Deletes legacy gui_bar_theory_live_telemetry.lua only if confirm is true.
   */
  removeLegacy(confirm: boolean, customDataDir?: string): InstallResult {
    if (!confirm) {
      return { success: false, message: 'Confirmation required to remove legacy widget' };
    }

    const dataDir = this.getDataDir(customDataDir);
    if (!dataDir) {
      return { success: false, message: 'BAR data directory is not configured' };
    }

    const legacyPath = path.join(dataDir, 'LuaUI', 'Widgets', LEGACY_WIDGET_FILE_NAME);
    assertPathInsideDataDir(legacyPath, dataDir);

    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
      return { success: true, message: 'Successfully removed legacy widget' };
    }

    return { success: true, message: 'Legacy widget was not found' };
  }
}

export const defaultWidgetInstaller = new WidgetInstaller();
