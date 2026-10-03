import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Platform } from '../platform/types';
import { SettingsStore } from '../settings/store';
import { isValidBarDataDir, locateGame } from './locator';

describe('BAR Game Locator (T05.1)', () => {
  let tempBaseDir: string;
  let settingsDir: string;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-locator-test-'));
    settingsDir = path.join(tempBaseDir, 'user-data');
    fs.mkdirSync(settingsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  function createMockBarDir(
    name: string,
    options: { engine?: boolean; luaUi?: boolean; springSettings?: boolean } = {}
  ): string {
    const dir = path.join(tempBaseDir, name);
    fs.mkdirSync(dir, { recursive: true });

    if (options.engine) {
      fs.mkdirSync(path.join(dir, 'engine'), { recursive: true });
    }
    if (options.luaUi) {
      fs.mkdirSync(path.join(dir, 'LuaUI'), { recursive: true });
    }
    if (options.springSettings) {
      fs.writeFileSync(path.join(dir, 'springsettings.cfg'), 'snd_volmaster = 80', 'utf-8');
    }
    return dir;
  }

  describe('isValidBarDataDir', () => {
    it('returns false for non-existent path or empty string', () => {
      expect(isValidBarDataDir('')).toBe(false);
      expect(isValidBarDataDir(path.join(tempBaseDir, 'nonexistent'))).toBe(false);
    });

    it('returns false for a file rather than directory', () => {
      const filePath = path.join(tempBaseDir, 'file.txt');
      fs.writeFileSync(filePath, 'test');
      expect(isValidBarDataDir(filePath)).toBe(false);
    });

    it('returns false for directory without engine folder', () => {
      const dir = createMockBarDir('no-engine', { luaUi: true, springSettings: true });
      expect(isValidBarDataDir(dir)).toBe(false);
    });

    it('returns false for directory with engine folder but neither LuaUI nor springsettings.cfg', () => {
      const dir = createMockBarDir('only-engine', { engine: true });
      expect(isValidBarDataDir(dir)).toBe(false);
    });

    it('returns true when engine and LuaUI are present', () => {
      const dir = createMockBarDir('engine-luaui', { engine: true, luaUi: true });
      expect(isValidBarDataDir(dir)).toBe(true);
    });

    it('returns true when engine and springsettings.cfg are present', () => {
      const dir = createMockBarDir('engine-cfg', { engine: true, springSettings: true });
      expect(isValidBarDataDir(dir)).toBe(true);
    });

    it('returns true when engine, LuaUI, and springsettings.cfg are all present', () => {
      const dir = createMockBarDir('engine-both', {
        engine: true,
        luaUi: true,
        springSettings: true
      });
      expect(isValidBarDataDir(dir)).toBe(true);
    });
  });

  describe('locateGame precedence and persistence', () => {
    it('accepts explicit valid manualPath and stores source=manual', async () => {
      const manualDir = createMockBarDir('manual-dir', { engine: true, luaUi: true });
      const store = new SettingsStore(settingsDir);

      const loc = await locateGame({
        manualPath: manualDir,
        settingsStore: store
      });

      expect(loc).not.toBeNull();
      expect(loc?.dataDir).toBe(path.resolve(manualDir));
      expect(loc?.source).toBe('manual');

      const saved = store.getSettings();
      expect(saved.bar.dataDir).toBe(path.resolve(manualDir));
      expect(saved.bar.source).toBe('manual');
    });

    it('returns null and does not overwrite valid settings when explicit manualPath is invalid', async () => {
      const initialDir = createMockBarDir('initial-dir', { engine: true, luaUi: true });
      const store = new SettingsStore(settingsDir);
      store.updateSettings({ bar: { dataDir: initialDir, source: 'registry' } });

      const loc = await locateGame({
        manualPath: path.join(tempBaseDir, 'invalid-manual'),
        settingsStore: store
      });

      expect(loc).toBeNull();
      // Original settings remain untouched
      const current = store.getSettings();
      expect(current.bar.dataDir).toBe(initialDir);
      expect(current.bar.source).toBe('registry');
    });

    it('prefers existing valid manual setting over registry, process, and candidates', async () => {
      const manualDir = createMockBarDir('saved-manual', { engine: true, springSettings: true });
      const regDir = createMockBarDir('reg-dir', { engine: true, luaUi: true });

      const store = new SettingsStore(settingsDir);
      store.updateSettings({ bar: { dataDir: manualDir, source: 'manual' } });

      const mockPlatform: Platform = {
        candidateDataDirs: () => [createMockBarDir('cand', { engine: true, luaUi: true })],
        registeredInstallDataDir: async () => regDir,
        runningEngineDataDir: async () =>
          createMockBarDir('proc', { engine: true, luaUi: true })
      };

      const loc = await locateGame({
        platform: mockPlatform,
        settingsStore: store
      });

      expect(loc?.dataDir).toBe(path.resolve(manualDir));
      expect(loc?.source).toBe('manual');
    });

    it('prefers registry over running engine and candidates', async () => {
      const regDir = createMockBarDir('reg-dir', { engine: true, luaUi: true });
      const procDir = createMockBarDir('proc-dir', { engine: true, luaUi: true });
      const candDir = createMockBarDir('cand-dir', { engine: true, luaUi: true });

      const store = new SettingsStore(settingsDir);

      const mockPlatform: Platform = {
        candidateDataDirs: () => [candDir],
        registeredInstallDataDir: async () => regDir,
        runningEngineDataDir: async () => procDir
      };

      const loc = await locateGame({
        platform: mockPlatform,
        settingsStore: store
      });

      expect(loc?.dataDir).toBe(path.resolve(regDir));
      expect(loc?.source).toBe('registry');
      expect(store.getSettings().bar.source).toBe('registry');
    });

    it('prefers running engine when registry is absent or invalid', async () => {
      const procDir = createMockBarDir('proc-dir', { engine: true, luaUi: true });
      const candDir = createMockBarDir('cand-dir', { engine: true, luaUi: true });

      const store = new SettingsStore(settingsDir);

      const mockPlatform: Platform = {
        candidateDataDirs: () => [candDir],
        registeredInstallDataDir: async () => null,
        runningEngineDataDir: async () => procDir
      };

      const loc = await locateGame({
        platform: mockPlatform,
        settingsStore: store
      });

      expect(loc?.dataDir).toBe(path.resolve(procDir));
      expect(loc?.source).toBe('process');
      expect(store.getSettings().bar.source).toBe('process');
    });

    it('prefers candidates when registry and running engine are absent', async () => {
      const candDir = createMockBarDir('cand-dir', { engine: true, springSettings: true });

      const store = new SettingsStore(settingsDir);

      const mockPlatform: Platform = {
        candidateDataDirs: () => [candDir],
        registeredInstallDataDir: async () => null,
        runningEngineDataDir: async () => null
      };

      const loc = await locateGame({
        platform: mockPlatform,
        settingsStore: store
      });

      expect(loc?.dataDir).toBe(path.resolve(candDir));
      expect(loc?.source).toBe('default');
      expect(store.getSettings().bar.source).toBe('default');
    });

    it('returns null and saves null in settings when no valid folder is found', async () => {
      const store = new SettingsStore(settingsDir);

      const mockPlatform: Platform = {
        candidateDataDirs: () => [path.join(tempBaseDir, 'invalid-candidate')],
        registeredInstallDataDir: async () => path.join(tempBaseDir, 'invalid-reg'),
        runningEngineDataDir: async () => path.join(tempBaseDir, 'invalid-proc')
      };

      const loc = await locateGame({
        platform: mockPlatform,
        settingsStore: store
      });

      expect(loc).toBeNull();
      expect(store.getSettings().bar.dataDir).toBeNull();
      expect(store.getSettings().bar.source).toBeNull();
    });
  });
});
