import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BuildPlan } from '../../core/schemas/plans';
import type { CoachState } from '../../core/schemas/coach';
import type { StateDoc } from '../../core/schemas/protocol';
import { CoachDocSchema } from '../../core/schemas/protocol';
import { UnitSnapshotSchema } from '../../core/schemas/units';
import { createRegistry } from '../../core/registry';
import syntheticSnapshotData from '../../core/registry/__test__/test-snapshot.json';
import type { BridgeEventMap, BridgeEventName, BridgeSource } from '../game/source';
import { CoachRunner, type CoachSettings } from './runner';

class FakeBridgeSource extends EventEmitter implements BridgeSource {
  start(): void {}
  stop(): void {}
  override on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
  override off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}

const registry = createRegistry(
  UnitSnapshotSchema.parse(syntheticSnapshotData),
  {
    schemaVersion: 1,
    factions: [{ id: 'armada', displayName: 'Armada', unitPrefix: 'arm', enabled: true, accent: '#449bed', commanderIds: ['armcom'] }]
  },
  { schemaVersion: 1, aliases: [] }
);

const plan: BuildPlan = {
  schemaVersion: 1,
  id: 'settings-plan',
  title: 'Settings Plan',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason test-fixture',
  modes: ['1v1'],
  role: 'any',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'solar',
  source: { kind: 'manual', createdAt: '2026-10-02T00:00:00.000Z' },
  steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 1, targetTime: 0 }]
};

const resource = (current: number, income: number, pull: number) => ({
  current,
  storage: 1000,
  pull,
  income,
  expense: pull,
  share: 1,
  sent: 0,
  received: 0
});

/** One second of a game whose commander stands idle while energy is empty and pulled. */
function idleStalling(gameSeconds: number): StateDoc {
  return {
    protocol: 1,
    sessionId: 'session-settings',
    seq: gameSeconds,
    frame: gameSeconds * 30,
    gameSeconds,
    me: { teamId: 0, allyTeamId: 0, factionId: 'armada', startUnitId: 'armcom', playerName: 'Player' },
    wind: { current: 0 },
    res: { metal: resource(500, 2, 0), energy: resource(0, 20, 50) },
    counts: {},
    builders: { total: 1, idle: 0 },
    factories: { total: 0, idle: 0 },
    commander: { alive: true, idle: true },
    bp: { total: 300, active: 0 },
    enemies: {}
  };
}

// regression: the coach ignored Settings → Coach (always Intermediate, every default alert, echo on)
describe('CoachRunner reads Settings → Coach every tick', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-runner-settings-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs the chosen profile, its alert switches and the chat echo switch', async () => {
    let settings: CoachSettings = { profile: 'advanced', alerts: {}, chatEcho: true };
    let state: CoachState | null = null;
    const source = new FakeBridgeSource();
    const runner = new CoachRunner();
    await runner.start({
      plan,
      mode: 'live',
      source,
      registry,
      stratcomDir: tmpDir,
      coachSettings: () => settings,
      onUpdate: (s) => {
        state = s;
      }
    });
    const alertIds = (): string[] => (state as CoachState | null)?.alerts.map((a) => a.id) ?? [];
    const echo = () => CoachDocSchema.parse(JSON.parse(fs.readFileSync(path.join(tmpDir, 'coach.json'), 'utf8'))).echo;
    try {
      for (let t = 10; t <= 15; t++) source.emit('state', idleStalling(t));
      await runner.tick();
      expect((state as CoachState | null)?.profile).toBe('advanced');
      // Advanced waits 3 s for an idle commander; Intermediate (what the coach always ran) waits 8 s
      expect(alertIds()).toContain('IDLE_COMMANDER');
      expect(echo().map((e) => e.text)).toContain('ENERGY STALL');

      settings = { profile: 'advanced', alerts: { IDLE_COMMANDER: { enabled: false } }, chatEcho: false };
      source.emit('state', idleStalling(16));
      await runner.tick();
      expect(alertIds()).not.toContain('IDLE_COMMANDER');
      expect(alertIds()).toContain('E_STALLING');
      expect(echo()).toEqual([]);

      settings = { profile: 'intermediate', alerts: {}, chatEcho: false };
      source.emit('state', idleStalling(17));
      await runner.tick();
      expect((state as CoachState | null)?.profile).toBe('intermediate');
    } finally {
      await runner.stop();
    }
  });
});
