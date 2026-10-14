import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeIpcHandler } from '../ipc/register';
import { SettingsStore } from '../settings/store';
import {
  assertPathInsideDataDir,
  LEGACY_WIDGET_FILE_NAME,
  parseWidgetVersion,
  WIDGET_BACKUP_NAME,
  WIDGET_FILE_NAME,
  WidgetInstaller
} from './installer';

describe('WidgetInstaller', () => {
  let tempBaseDir: string;
  let dataDir: string;
  let bundledWidgetPath: string;
  let installer: WidgetInstaller;

  const sampleBundledContent = `
-- License: GPL-2.0-or-later
-- STRATCOM_WIDGET_VERSION 3.0.1
-- STRATCOM_PROTOCOL 1

function widget:GetInfo()
  return { name = "BAR StratCom", version = "3.0.1" }
end
`.trim();

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-installer-test-'));
    dataDir = path.join(tempBaseDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    bundledWidgetPath = path.join(tempBaseDir, 'bundled_stratcom.lua');
    fs.writeFileSync(bundledWidgetPath, sampleBundledContent, 'utf-8');

    installer = new WidgetInstaller({
      bundledWidgetPath,
      settingsStore: new SettingsStore(path.join(tempBaseDir, 'userdata'))
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  describe('parseWidgetVersion', () => {
    it('parses valid STRATCOM_WIDGET_VERSION header', () => {
      expect(parseWidgetVersion('-- STRATCOM_WIDGET_VERSION 3.0.1')).toBe('3.0.1');
      expect(parseWidgetVersion('--   STRATCOM_WIDGET_VERSION   3.1.0-alpha.1\r\n')).toBe(
        '3.1.0-alpha.1'
      );
    });

    it('returns null if header is missing or malformed', () => {
      expect(parseWidgetVersion('-- Just a comment')).toBeNull();
      expect(parseWidgetVersion('')).toBeNull();
    });
  });

  describe('path guard', () => {
    it('allows paths inside LuaUI/Widgets and stratcom', () => {
      expect(() => {
        assertPathInsideDataDir(path.join(dataDir, 'LuaUI', 'Widgets', 'gui_stratcom.lua'), dataDir);
      }).not.toThrow();

      expect(() => {
        assertPathInsideDataDir(path.join(dataDir, 'stratcom', 'state.json'), dataDir);
      }).not.toThrow();
    });

    it('rejects paths outside allowed folders', () => {
      expect(() => {
        assertPathInsideDataDir(path.join(dataDir, 'springsettings.cfg'), dataDir);
      }).toThrow(/Path guard violation/);

      expect(() => {
        assertPathInsideDataDir(path.join(dataDir, 'LuaUI', 'Widgets', '..', '..', 'evil.lua'), dataDir);
      }).toThrow(/Path guard violation/);

      expect(() => {
        assertPathInsideDataDir(path.join(tempBaseDir, 'outside.txt'), dataDir);
      }).toThrow(/Path guard violation/);
    });
  });

  describe('status()', () => {
    it('reports not installed when widget file is absent', () => {
      const status = installer.status(dataDir);
      expect(status.installed).toBe(false);
      expect(status.installedVersion).toBeNull();
      expect(status.bundledVersion).toBe('3.0.1');
      expect(status.legacyPresent).toBe(false);
    });

    it('reports installed version and legacy widget presence', () => {
      const widgetsDir = path.join(dataDir, 'LuaUI', 'Widgets');
      fs.mkdirSync(widgetsDir, { recursive: true });

      fs.writeFileSync(
        path.join(widgetsDir, WIDGET_FILE_NAME),
        '-- STRATCOM_WIDGET_VERSION 2.9.0',
        'utf-8'
      );
      fs.writeFileSync(path.join(widgetsDir, LEGACY_WIDGET_FILE_NAME), 'legacy', 'utf-8');

      const status = installer.status(dataDir);
      expect(status.installed).toBe(true);
      expect(status.installedVersion).toBe('2.9.0');
      expect(status.bundledVersion).toBe('3.0.1');
      expect(status.legacyPresent).toBe(true);
    });
  });

  describe('install() and update()', () => {
    it('performs fresh install: creates directories, writes widget, and verifies', () => {
      const result = installer.install(dataDir);
      expect(result.success).toBe(true);
      expect(result.message).toContain('3.0.1');

      const installedFile = path.join(dataDir, 'LuaUI', 'Widgets', WIDGET_FILE_NAME);
      expect(fs.existsSync(installedFile)).toBe(true);
      expect(fs.readFileSync(installedFile, 'utf-8')).toBe(sampleBundledContent);

      const stratcomDir = path.join(dataDir, 'stratcom');
      expect(fs.existsSync(stratcomDir)).toBe(true);

      const backupFile = path.join(dataDir, 'LuaUI', 'Widgets', WIDGET_BACKUP_NAME);
      expect(fs.existsSync(backupFile)).toBe(false);
    });

    it('updates from older version and creates .bak backup', () => {
      const widgetsDir = path.join(dataDir, 'LuaUI', 'Widgets');
      fs.mkdirSync(widgetsDir, { recursive: true });

      const oldContent = '-- STRATCOM_WIDGET_VERSION 3.0.0\n-- Old implementation';
      fs.writeFileSync(path.join(widgetsDir, WIDGET_FILE_NAME), oldContent, 'utf-8');

      const result = installer.install(dataDir);
      expect(result.success).toBe(true);

      const installedFile = path.join(widgetsDir, WIDGET_FILE_NAME);
      expect(fs.readFileSync(installedFile, 'utf-8')).toBe(sampleBundledContent);

      const backupFile = path.join(widgetsDir, WIDGET_BACKUP_NAME);
      expect(fs.existsSync(backupFile)).toBe(true);
      expect(fs.readFileSync(backupFile, 'utf-8')).toBe(oldContent);
    });
  });

  describe('uninstall()', () => {
    it('removes installed widget file', () => {
      installer.install(dataDir);
      const installedFile = path.join(dataDir, 'LuaUI', 'Widgets', WIDGET_FILE_NAME);
      expect(fs.existsSync(installedFile)).toBe(true);

      const result = installer.uninstall(dataDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(installedFile)).toBe(false);
    });

    it('returns success gracefully when widget is already not installed', () => {
      const result = installer.uninstall(dataDir);
      expect(result.success).toBe(true);
      expect(result.message).toContain('not installed');
    });
  });

  describe('removeLegacy()', () => {
    it('requires confirmation to remove legacy widget', () => {
      const result = installer.removeLegacy(false, dataDir);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Confirmation required');
    });

    it('deletes legacy widget when confirmed', () => {
      const widgetsDir = path.join(dataDir, 'LuaUI', 'Widgets');
      fs.mkdirSync(widgetsDir, { recursive: true });
      const legacyFile = path.join(widgetsDir, LEGACY_WIDGET_FILE_NAME);
      fs.writeFileSync(legacyFile, '-- old widget', 'utf-8');

      const result = installer.removeLegacy(true, dataDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(legacyFile)).toBe(false);

      // Calling again reports not found
      const result2 = installer.removeLegacy(true, dataDir);
      expect(result2.success).toBe(true);
      expect(result2.message).toContain('not found');
    });
  });

  describe('IPC contracts execution', () => {
    it('handles game:widgetStatus', async () => {
      const res = await executeIpcHandler('game:widgetStatus', undefined, () =>
        installer.status(dataDir)
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.bundledVersion).toBe('3.0.1');
        expect(res.data.installed).toBe(false);
      }
    });

    it('handles game:installWidget', async () => {
      const res = await executeIpcHandler('game:installWidget', undefined, () =>
        installer.install(dataDir)
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.success).toBe(true);
      }
    });

    it('handles game:uninstallWidget', async () => {
      const res = await executeIpcHandler('game:uninstallWidget', undefined, () =>
        installer.uninstall(dataDir)
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.success).toBe(true);
      }
    });

    it('handles game:removeLegacyWidget with confirmation', async () => {
      const res = await executeIpcHandler(
        'game:removeLegacyWidget',
        { confirm: true },
        (req) => installer.removeLegacy(req.confirm, dataDir)
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.success).toBe(true);
      }
    });
  });
});
