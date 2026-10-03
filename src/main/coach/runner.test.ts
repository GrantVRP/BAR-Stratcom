import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { BuildPlan } from '../../core/schemas/plans';
import { UnitSnapshotSchema } from '../../core/schemas/units';
import { createRegistry } from '../../core/registry';
import syntheticSnapshotData from '../../core/registry/__test__/test-snapshot.json';
import { CoachRunner } from './runner';
import type { BridgeEventMap, BridgeEventName, BridgeSource } from '../game/source';
import type { StateDoc, WidgetEvent } from '../../core/schemas/protocol';
import { CoachDocSchema } from '../../core/schemas/protocol';

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

const snapshot = UnitSnapshotSchema.parse(syntheticSnapshotData);
const factions = {
  schemaVersion: 1 as const,
  factions: [
    {
      id: 'armada',
      displayName: 'Armada',
      unitPrefix: 'arm',
      enabled: true,
      accent: '#449bed',
      commanderIds: ['armcom']
    }
  ]
};
const aliases = {
  schemaVersion: 1 as const,
  aliases: []
};
const registry = createRegistry(snapshot, factions, aliases);

const validPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'test-valid-plan',
  title: 'Valid Plan',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason test-fixture',
  modes: ['1v1'],
  role: 'any',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'solar',
  source: { kind: 'manual', createdAt: '2026-10-02T00:00:00.000Z' },
  steps: [
    { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 1, targetTime: 0 },
    { id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'armlab', count: 1, targetTime: 20 },
    {
      id: 's3',
      actor: { kind: 'factory', unitId: 'armlab', index: 1 },
      action: 'build',
      unitId: 'armpw',
      count: 1
    }
  ]
};

describe('CoachRunner (02 §4.1, 04 §3.1)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-runner-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('rejects an invalid plan with validation errors', async () => {
    const invalidPlan: BuildPlan = {
      ...validPlan,
      factionId: 'invalid_faction'
    };
    const runner = new CoachRunner();
    await expect(
      runner.start({
        plan: invalidPlan,
        mode: 'live',
        registry,
        stratcomDir: tmpDir
      })
    ).rejects.toThrow('Plan validation failed');
  });

  it('writes coach.json in live mode with incrementing seq numbers', async () => {
    vi.useFakeTimers();
    try {
      const runner = new CoachRunner();
      const fakeSource = new FakeBridgeSource();

      let updateCount = 0;
      await runner.start({
        plan: validPlan,
        mode: 'live',
        source: fakeSource,
        registry,
        stratcomDir: tmpDir,
        onUpdate: () => {
          updateCount++;
        }
      });

      expect(runner.isRunning()).toBe(true);
      expect(updateCount).toBeGreaterThanOrEqual(1);

      const coachFile = path.join(tmpDir, 'coach.json');
      expect(fs.existsSync(coachFile)).toBe(true);

      const content1 = JSON.parse(fs.readFileSync(coachFile, 'utf8'));
      const parsed1 = CoachDocSchema.parse(content1);
      expect(parsed1.mode).toBe('live');
      expect(parsed1.seq).toBe(1);

      // Advance tick
      await runner.tick();

      const content2 = JSON.parse(fs.readFileSync(coachFile, 'utf8'));
      const parsed2 = CoachDocSchema.parse(content2);
      expect(parsed2.seq).toBe(2);

      await runner.stop();
      expect(runner.isRunning()).toBe(false);

      // On stop in live mode, writes mode 'off'
      const contentStop = JSON.parse(fs.readFileSync(coachFile, 'utf8'));
      const parsedStop = CoachDocSchema.parse(contentStop);
      expect(parsedStop.mode).toBe('off');
      expect(parsedStop.hud.visible).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not write coach.json in demo or manual mode', async () => {
    const runner = new CoachRunner();
    await runner.start({
      plan: validPlan,
      mode: 'demo',
      registry,
      stratcomDir: tmpDir
    });

    const coachFile = path.join(tmpDir, 'coach.json');
    expect(fs.existsSync(coachFile)).toBe(false);

    await runner.stop();
    expect(fs.existsSync(coachFile)).toBe(false);
  });

  it('processes incoming state and events from source', async () => {
    vi.useFakeTimers();
    try {
      const runner = new CoachRunner();
      const fakeSource = new FakeBridgeSource();

      let lastState: unknown = null;
      await runner.start({
        plan: validPlan,
        mode: 'live',
        source: fakeSource,
        registry,
        stratcomDir: tmpDir,
        onUpdate: (state) => {
          lastState = state;
        }
      });

      const stateDoc: StateDoc = {
        protocol: 1,
        sessionId: 'session-123',
        seq: 1,
        frame: 300,
        gameSeconds: 10,
        me: {
          teamId: 0,
          allyTeamId: 0,
          factionId: 'armada',
          startUnitId: 'armcom',
          playerName: 'Player'
        },
        wind: { current: 12 },
        res: {
          metal: {
            current: 500,
            storage: 1000,
            pull: 0,
            income: 10,
            expense: 0,
            share: 1,
            sent: 0,
            received: 0
          },
          energy: {
            current: 500,
            storage: 1000,
            pull: 0,
            income: 20,
            expense: 0,
            share: 1,
            sent: 0,
            received: 0
          }
        },
        counts: {},
        builders: { total: 1, idle: 0 },
        factories: { total: 0, idle: 0 },
        commander: { alive: true, idle: false },
        bp: { total: 300, active: 300 },
        enemies: {}
      };

      fakeSource.emit('state', stateDoc);

      const events: WidgetEvent[] = [{ f: 300, e: 'finished', u: 100, d: 'armsolar', tm: 0 }];
      fakeSource.emit('events', events);

      await vi.advanceTimersByTimeAsync(500);

      expect(lastState).toBeDefined();
      await runner.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
