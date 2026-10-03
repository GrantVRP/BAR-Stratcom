import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import {
  defaultSettings,
  SettingsSchema,
  type Settings
} from '../../core/schemas/settings';

export class SettingsStore {
  private customUserDataDir?: string;
  private cachedSettings: Settings | null = null;

  constructor(customUserDataDir?: string) {
    this.customUserDataDir = customUserDataDir;
  }

  getUserDataDir(): string {
    if (this.customUserDataDir) {
      return this.customUserDataDir;
    }
    try {
      if (app && typeof app.getPath === 'function') {
        return app.getPath('userData');
      }
    } catch {
      // Not running within Electron app lifecycle
    }
    return process.env.STRATCOM_USER_DATA || path.join(process.cwd(), '.stratcom');
  }

  getSettingsPath(): string {
    return path.join(this.getUserDataDir(), 'settings.json');
  }

  getSettings(): Settings {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    const settingsPath = this.getSettingsPath();
    try {
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const result = SettingsSchema.safeParse(parsed);
        if (result.success) {
          this.cachedSettings = result.data;
          return this.cachedSettings;
        }
      }
    } catch {
      // In case of read or JSON parse errors, fall back to defaultSettings
    }

    this.cachedSettings = defaultSettings();
    return this.cachedSettings;
  }

  saveSettings(settings: Settings): void {
    const validated = SettingsSchema.parse(settings);
    const dir = this.getUserDataDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.getSettingsPath(), JSON.stringify(validated, null, 2), 'utf-8');
    this.cachedSettings = validated;
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const current = this.getSettings();
    const merged: Settings = {
      ...current,
      ...patch,
      bar: patch.bar ? { ...current.bar, ...patch.bar } : current.bar,
      alerts: patch.alerts ? { ...current.alerts, ...patch.alerts } : current.alerts,
      sound: patch.sound ? { ...current.sound, ...patch.sound } : current.sound,
      hud: patch.hud ? { ...current.hud, ...patch.hud } : current.hud,
      coachWindow: patch.coachWindow
        ? { ...current.coachWindow, ...patch.coachWindow }
        : current.coachWindow,
      assist: patch.assist ? { ...current.assist, ...patch.assist } : current.assist,
      ai: patch.ai ? { ...current.ai, ...patch.ai } : current.ai,
      updates: patch.updates ? { ...current.updates, ...patch.updates } : current.updates,
      launcher: patch.launcher ? { ...current.launcher, ...patch.launcher } : current.launcher
    };

    this.saveSettings(merged);
    return merged;
  }
}

export const defaultSettingsStore = new SettingsStore();
