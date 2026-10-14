import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WidgetHeartbeat } from '../../core/schemas/protocol';
import {
  checkInfologForWidgetsDisabled,
  deriveHealth,
  HealthManager,
  isVersionOutdated,
  readInfologTail,
  type HealthDeriveInputs
} from './health';

describe('Health state machine', () => {
  const dummyHeartbeat = (overrides: Partial<WidgetHeartbeat> = {}): WidgetHeartbeat => ({
    protocol: 1,
    widgetVersion: '3.0.1',
    engineVersion: '2026.07.04',
    gameVersion: 'Beyond All Reason test-31479-433a460',
    sessionId: '20261002-120000-abcd',
    mode: 'player',
    canControlUnits: true,
    frame: 100,
    gameStarted: true,
    gameOver: false,
    map: {
      scriptName: 'Supreme Isthmus',
      windMin: 4,
      windMax: 20,
      avgWind: 12,
      windRisk: null,
      tidal: 15
    },
    perf: { frameMs: 0.2, drawMs: 0.1, snapshotMs: 1.0 },
    degraded: false,
    heartbeat: 1700000000,
    ...overrides
  });

  describe('isVersionOutdated', () => {
    it('correctly compares semantic versions', () => {
      expect(isVersionOutdated('3.0.0', '3.0.1')).toBe(true);
      expect(isVersionOutdated('2.9.9', '3.0.1')).toBe(true);
      expect(isVersionOutdated('3.0.1', '3.0.1')).toBe(false);
      expect(isVersionOutdated('3.1.0', '3.0.1')).toBe(false);
      expect(isVersionOutdated(null, '3.0.1')).toBe(false);
    });
  });

  describe('infolog detection', () => {
    it('detects LuaUI: Disallowing User Widgets in infolog text', () => {
      const sample = `
[00:01:05.123] Loading widgets...
[00:01:05.456] LuaUI: Disallowing User Widgets
[00:01:05.789] Game initialized.
`;
      expect(checkInfologForWidgetsDisabled(sample)).toBe(true);
      expect(checkInfologForWidgetsDisabled('Normal log output')).toBe(false);
    });

    it('reads the tail of an infolog file from disk', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'infolog-test-'));
      const filePath = path.join(tempDir, 'infolog.txt');
      fs.writeFileSync(filePath, 'Line 1\nLuaUI: Disallowing User Widgets\nLine 3\n', 'utf-8');

      const tail = readInfologTail(filePath, 10);
      expect(tail).toContain('LuaUI: Disallowing User Widgets');
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('deriveHealth pure table tests', () => {
    const baseNow = 1000000000000;

    it('reaches no-bar when data directory is missing', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: false,
        widgetInstalled: false,
        installedVersion: null,
        bundledVersion: '3.0.1',
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('no-bar');
      expect(health.message).toBe(
        'Beyond All Reason not found. Set the folder in Settings or try Demo.'
      );
    });

    it('reaches widget-missing when widget file is absent', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: false,
        installedVersion: null,
        bundledVersion: '3.0.1',
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('widget-missing');
      expect(health.message).toBe('Install the in-game widget.');
    });

    it('reaches widget-outdated when installed version < bundled version', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.0',
        bundledVersion: '3.0.1',
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('widget-outdated');
      expect(health.message).toBe('Update the widget.');
    });

    it('reaches protocol-mismatch when protocol is not 1', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        protocolMismatch: true,
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('protocol-mismatch');
      expect(health.message).toBe('Widget/app version mismatch. Reinstall the widget.');
    });

    it('reaches widgets-disabled when infolog flag is set', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        widgetsDisabled: true,
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('widgets-disabled');
      expect(health.message).toBe('This lobby disabled user widgets. Use Manual Clock.');
    });

    it('reaches bar-idle when no heartbeat received yet', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('bar-idle');
      expect(health.message).toBe('Start BAR. The coach connects automatically.');
    });

    it('reaches bar-idle when outside game and no heartbeat for > 10 s', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: dummyHeartbeat({ gameStarted: false }),
        lastHeartbeatTime: baseNow - 11000 // 11 s ago
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('bar-idle');
    });

    it('reaches widget-stalled when in active game and heartbeat older than 5 s', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: dummyHeartbeat({ gameStarted: true, gameOver: false }),
        lastHeartbeatTime: baseNow - 6000 // 6 s ago
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('widget-stalled');
      expect(health.message).toBe("Widget stopped responding (check BAR's widget list, F11).");
    });

    it('reaches pregame when heartbeat is fresh and gameStarted=false', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: dummyHeartbeat({ gameStarted: false, mode: 'pregame' }),
        lastHeartbeatTime: baseNow - 1000 // 1 s ago
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('pregame');
      expect(health.message).toBe('In lobby/loading…');
    });

    it('reaches live when heartbeat is fresh, mode=player, gameStarted=true', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: dummyHeartbeat({ gameStarted: true, mode: 'player' }),
        lastHeartbeatTime: baseNow - 500 // 0.5 s ago
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('live');
      expect(health.message).toBe('Live');
    });

    it('reaches spectating when mode=spectator', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: dummyHeartbeat({ gameStarted: true, mode: 'spectator' }),
        lastHeartbeatTime: baseNow - 500,
        spectatorTeamsCount: 16
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('spectating');
      expect(health.message).toBe('Recording 16 teams for capture');
    });

    it('reaches replay when mode=replay', () => {
      const inputs: HealthDeriveInputs = {
        hasDataDir: true,
        widgetInstalled: true,
        installedVersion: '3.0.1',
        bundledVersion: '3.0.1',
        lastHeartbeat: dummyHeartbeat({ gameStarted: true, mode: 'replay' }),
        lastHeartbeatTime: baseNow - 500,
        spectatorTeamsCount: 8
      };

      const health = deriveHealth(inputs, baseNow);
      expect(health.status).toBe('replay');
      expect(health.message).toBe('Recording 8 teams for capture');
    });
  });

  describe('HealthManager stateful wrapper', () => {
    it('emits health events on status change', () => {
      let inputs: HealthDeriveInputs = {
        hasDataDir: false,
        widgetInstalled: false,
        installedVersion: null,
        bundledVersion: '3.0.1',
        lastHeartbeat: null,
        lastHeartbeatTime: null
      };

      const manager = new HealthManager(() => inputs);
      const emitted: string[] = [];

      manager.on('health', (h) => {
        emitted.push(h.status);
      });

      expect(manager.getHealth().status).toBe('no-bar');

      // Change inputs
      inputs = { ...inputs, hasDataDir: true, widgetInstalled: true };
      manager.checkHealth();

      expect(emitted).toContain('bar-idle');
      expect(manager.getHealth().status).toBe('bar-idle');

      manager.stop();
    });
  });
});
