import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings } from '../../core/schemas/settings';
import { SettingsStore } from './store';

describe('SettingsStore (T05.1)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-settings-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns defaultSettings when settings.json does not exist', () => {
    const store = new SettingsStore(tempDir);
    const settings = store.getSettings();
    expect(settings).toEqual(defaultSettings());
    expect(settings.bar.dataDir).toBeNull();
    expect(settings.bar.source).toBeNull();
  });

  it('persists and loads settings from disk', () => {
    const store = new SettingsStore(tempDir);
    const defaults = defaultSettings();
    defaults.sound.volume = 0.5;
    defaults.bar.dataDir = 'C:\\BAR\\data';
    defaults.bar.source = 'registry';

    store.saveSettings(defaults);

    // Create a new store instance pointing to same tempDir
    const store2 = new SettingsStore(tempDir);
    const loaded = store2.getSettings();
    expect(loaded.sound.volume).toBe(0.5);
    expect(loaded.bar.dataDir).toBe('C:\\BAR\\data');
    expect(loaded.bar.source).toBe('registry');
  });

  it('updates partial settings preserving existing fields', () => {
    const store = new SettingsStore(tempDir);
    store.updateSettings({
      bar: {
        dataDir: 'D:\\Games\\BAR\\data',
        source: 'manual'
      }
    });

    const updated = store.getSettings();
    expect(updated.bar.dataDir).toBe('D:\\Games\\BAR\\data');
    expect(updated.bar.source).toBe('manual');
    expect(updated.sound.enabled).toBe(true);
    expect(updated.hud.enabled).toBe(true);
  });

  it('falls back to defaultSettings when file content is invalid JSON', () => {
    const store = new SettingsStore(tempDir);
    fs.writeFileSync(store.getSettingsPath(), '{ not valid json', 'utf-8');

    const settings = store.getSettings();
    expect(settings).toEqual(defaultSettings());
  });

  it('falls back to defaultSettings when schema validation fails', () => {
    const store = new SettingsStore(tempDir);
    fs.writeFileSync(store.getSettingsPath(), JSON.stringify({ schemaVersion: 999 }), 'utf-8');

    const settings = store.getSettings();
    expect(settings).toEqual(defaultSettings());
  });

  it('falls back to os.tmpdir/stratcom-dev when outside Electron and no env is set', () => {
    const originalEnv = process.env.STRATCOM_USER_DATA;
    delete process.env.STRATCOM_USER_DATA;
    try {
      const store = new SettingsStore();
      expect(store.getUserDataDir()).toBe(path.join(os.tmpdir(), 'stratcom-dev'));
    } finally {
      if (originalEnv !== undefined) {
        process.env.STRATCOM_USER_DATA = originalEnv;
      }
    }
  });
});
