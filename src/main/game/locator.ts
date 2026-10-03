import fs from 'node:fs';
import path from 'node:path';
import type { GameLocation } from '../../shared/ipc';
import { getPlatform, type Platform } from '../platform';
import { defaultSettingsStore, SettingsStore } from '../settings/store';

export interface LocateGameOptions {
  manualPath?: string;
  platform?: Platform;
  settingsStore?: SettingsStore;
}

/**
 * Validates whether a directory is a valid Beyond All Reason data directory.
 * A dir is valid if it contains an `engine` folder and (`LuaUI` folder or `springsettings.cfg`).
 */
export function isValidBarDataDir(dirPath: string): boolean {
  if (!dirPath || typeof dirPath !== 'string') return false;
  try {
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) return false;
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return false;

    const engineDir = path.join(resolved, 'engine');
    if (!fs.existsSync(engineDir) || !fs.statSync(engineDir).isDirectory()) {
      return false;
    }

    const luaUiDir = path.join(resolved, 'LuaUI');
    const hasLuaUI = fs.existsSync(luaUiDir) && fs.statSync(luaUiDir).isDirectory();

    const springSettings = path.join(resolved, 'springsettings.cfg');
    const hasSpringSettings =
      fs.existsSync(springSettings) && fs.statSync(springSettings).isFile();

    return hasLuaUI || hasSpringSettings;
  } catch {
    return false;
  }
}

/**
 * Locates the BAR data directory following the order of precedence:
 * manual setting -> registry -> running engine -> candidates.
 * Stores the found result (or null) in settings (`bar.dataDir`, `bar.source`).
 */
export async function locateGame(options: LocateGameOptions = {}): Promise<GameLocation | null> {
  const store = options.settingsStore ?? defaultSettingsStore;
  const platform = options.platform ?? getPlatform();

  // 1a. Explicit manualPath passed into locateGame
  if (options.manualPath !== undefined) {
    if (isValidBarDataDir(options.manualPath)) {
      const location: GameLocation = {
        dataDir: path.resolve(options.manualPath),
        source: 'manual'
      };
      store.updateSettings({ bar: location });
      return location;
    }
    return null;
  }

  // 1b. Existing manual setting already configured in settings
  const current = store.getSettings();
  if (current.bar.source === 'manual' && current.bar.dataDir) {
    if (isValidBarDataDir(current.bar.dataDir)) {
      return {
        dataDir: path.resolve(current.bar.dataDir),
        source: 'manual'
      };
    }
  }

  // 2. Registry
  try {
    const regDir = await platform.registeredInstallDataDir();
    if (regDir && isValidBarDataDir(regDir)) {
      const location: GameLocation = {
        dataDir: path.resolve(regDir),
        source: 'registry'
      };
      store.updateSettings({ bar: location });
      return location;
    }
  } catch {
    // Continue
  }

  // 3. Running engine
  try {
    const engineDir = await platform.runningEngineDataDir();
    if (engineDir && isValidBarDataDir(engineDir)) {
      const location: GameLocation = {
        dataDir: path.resolve(engineDir),
        source: 'process'
      };
      store.updateSettings({ bar: location });
      return location;
    }
  } catch {
    // Continue
  }

  // 4. Candidates
  try {
    const candidates = platform.candidateDataDirs();
    for (const candidate of candidates) {
      if (candidate && isValidBarDataDir(candidate)) {
        const location: GameLocation = {
          dataDir: path.resolve(candidate),
          source: 'default'
        };
        store.updateSettings({ bar: location });
        return location;
      }
    }
  } catch {
    // Continue
  }

  // 5. None found: record null in settings
  store.updateSettings({
    bar: {
      dataDir: null,
      source: null
    }
  });
  return null;
}
