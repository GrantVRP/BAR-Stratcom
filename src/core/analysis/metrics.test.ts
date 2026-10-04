import { describe, it, expect } from 'vitest';
import { computeMetrics } from './metrics';
import type { SessionMeta } from '../schemas/session';
import type { StateDoc, WidgetEvent } from '../schemas/protocol';

describe('computeMetrics (04 §4.1, T07.2)', () => {
  it('computes exact hand-calculated metrics on a synthetic session', () => {
    const meta: SessionMeta = {
      schemaVersion: 1,
      sessionId: 'test-synthetic-01',
      mode: 'player',
      gameVersion: 'test-version',
      engineVersion: '105.1.1',
      mapScriptName: 'Test_Map_v1',
      durationSec: 100,
      startedAt: '2026-10-01T12:00:00.000Z',
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true },
        { teamId: 1, allyTeamId: 1, playerName: 'Enemy', factionId: 'armada', isMe: false }
      ],
      start: { metal: 1000, energy: 1000, metalStorage: 1000, energyStorage: 1000 },
      source: 'live',
      anonymized: false
    };

    const states: StateDoc[] = [];

    for (let s = 0; s <= 100; s++) {
      // Energy stall for 10 seconds (s: 10..19): current=5 <= max(1, 10), pull=50 > income=20
      const isEStall = s >= 10 && s <= 19;
      // Metal stall for 5 seconds (s: 20..24): current=5 <= max(1, 10), pull=20 > income=10
      const isMStall = s >= 20 && s <= 24;
      // Metal float for 15 seconds (s: 30..44): current=950 >= 0.9 * 1000
      const isMFloat = s >= 30 && s <= 44;
      // Energy float for 20 seconds (s: 50..69): current=960 >= 0.95 * 1000
      const isEFloat = s >= 50 && s <= 69;

      // Idle factories: 2 idle for 10 seconds (s: 70..79) = 20 factory-seconds
      const idleFactories = s >= 70 && s <= 79 ? 2 : 0;
      // Idle builders: 3 idle for 15 seconds (s: 80..94) = 45 builder-seconds
      const idleBuilders = s >= 80 && s <= 94 ? 3 : 0;
      // Idle commander: idle for 8 seconds (s: 1..8)
      const idleCommander = s >= 1 && s <= 8;

      states.push({
        protocol: 1,
        sessionId: 'test-synthetic-01',
        seq: s + 1,
        frame: s * 30,
        gameSeconds: s,
        wind: { current: 12 },
        me: { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', startUnitId: 'corcom' },
        res: {
          metal: {
            current: isMStall ? 5 : isMFloat ? 950 : 500,
            storage: 1000,
            pull: isMStall ? 20 : 10,
            income: 10,
            expense: 10,
            share: 0.9,
            sent: 0,
            received: 0
          },
          energy: {
            current: isEStall ? 5 : isEFloat ? 960 : 500,
            storage: 1000,
            pull: isEStall ? 50 : 20,
            income: 20,
            expense: 20,
            share: 0.9,
            sent: 0,
            received: 0
          }
        },
        counts: {},
        builders: { total: 5, idle: idleBuilders },
        factories: { total: 2, idle: idleFactories },
        commander: { alive: true, idle: idleCommander },
        bp: { total: 300, active: 150 }, // 50% bp utilisation
        enemies: {}
      });
    }

    const events: WidgetEvent[] = [
      { f: 0, e: 'gamestart' },
      { f: 1350, e: 'finished', u: 100, d: 'corvp', tm: 0 }, // 45s factory
      { f: 2400, e: 'finished', u: 101, d: 'coravp', tm: 0 } // 80s T2 factory
    ];

    const metrics = computeMetrics({ meta, states, events });

    expect(metrics.durationSec).toBe(100);
    expect(metrics.energyStallSec).toBe(10);
    expect(metrics.metalStallSec).toBe(5);
    expect(metrics.metalFloatSec).toBe(15);
    expect(metrics.energyFloatSec).toBe(20);
    expect(metrics.idleFactorySec).toBe(20);
    expect(metrics.idleBuilderSec).toBe(45);
    expect(metrics.idleCommanderSec).toBe(8);
    expect(metrics.bpUtilisation).toBe(0.5);
    expect(metrics.timeToFirstFactory).toBe(45);
    expect(metrics.timeToT2).toBe(80);
    expect(metrics.incomeAt['180']).toBeNull();
    expect(metrics.incomeAt['300']).toBeNull();
    expect(metrics.incomeAt['480']).toBeNull();
    expect(metrics.incomeAt['600']).toBeNull();
  });

  it('correctly samples checkpoints at 180s, 300s, 480s, 600s in longer games', () => {
    const meta: SessionMeta = {
      schemaVersion: 1,
      sessionId: 'test-checkpoints-02',
      mode: 'player',
      gameVersion: 'test-version',
      engineVersion: '105.1.1',
      mapScriptName: 'Test_Map_v1',
      durationSec: 650,
      startedAt: '2026-10-01T12:00:00.000Z',
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'armada', isMe: true }
      ],
      start: null,
      source: 'live',
      anonymized: false
    };

    const states: StateDoc[] = [180, 300, 480, 600].map((t, idx) => ({
      protocol: 1,
      sessionId: 'test-checkpoints-02',
      seq: idx + 1,
      frame: t * 30,
      gameSeconds: t,
      wind: { current: 15 },
      me: { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'armada', startUnitId: 'armcom' },
      res: {
        metal: { current: 500, storage: 1000, pull: 10, income: 10 + idx * 5, expense: 10, share: 0.9, sent: 0, received: 0 },
        energy: { current: 500, storage: 1000, pull: 50, income: 100 + idx * 50, expense: 50, share: 0.9, sent: 0, received: 0 }
      },
      counts: {},
      builders: { total: 2, idle: 0 },
      factories: { total: 1, idle: 0 },
      commander: { alive: true, idle: false },
      bp: { total: 300, active: 300 },
      enemies: {}
    }));

    const metrics = computeMetrics({ meta, states, events: [] });

    expect(metrics.incomeAt['180']).toEqual({ metal: 10, energy: 100 });
    expect(metrics.incomeAt['300']).toEqual({ metal: 15, energy: 150 });
    expect(metrics.incomeAt['480']).toEqual({ metal: 20, energy: 200 });
    expect(metrics.incomeAt['600']).toEqual({ metal: 25, energy: 250 });
  });

  it('extracts resources from snap.teams for spectator mode and detects T2 fallback', () => {
    const meta: SessionMeta = {
      schemaVersion: 1,
      sessionId: 'test-spectator-01',
      mode: 'spectator',
      gameVersion: 'test-version',
      engineVersion: '105.1.1',
      mapScriptName: 'Test_Map_v1',
      durationSec: 1,
      startedAt: '2026-10-01T12:00:00.000Z',
      teams: [
        { teamId: 2, allyTeamId: 0, playerName: 'SpecTarget', factionId: 'cortex', isMe: true }
      ],
      start: null,
      source: 'live',
      anonymized: false
    };

    const states: StateDoc[] = [
      {
        protocol: 1,
        sessionId: 'test-spectator-01',
        seq: 1,
        frame: 30,
        gameSeconds: 1,
        wind: { current: 10 },
        me: null,
        res: null,
        counts: {},
        builders: { total: 0, idle: 0 },
        factories: { total: 0, idle: 0 },
        commander: { alive: true, idle: false },
        bp: { total: 0, active: 0 },
        enemies: {},
        teams: [
          {
            teamId: 2,
            allyTeamId: 0,
            playerName: 'SpecTarget',
            factionId: 'cortex',
            res: {
              metal: { current: 5, storage: 1000, pull: 20, income: 10, expense: 10, share: 0, sent: 0, received: 0 },
              energy: { current: 500, storage: 1000, pull: 10, income: 10, expense: 10, share: 0, sent: 0, received: 0 }
            },
            counts: {},
            bp: { total: 300, active: 100 }
          }
        ]
      }
    ];

    const events: WidgetEvent[] = [
      { f: 30, e: 'finished', u: 99, d: 'coralab', tm: 2 }
    ];

    const metrics = computeMetrics({ meta, states, events });
    expect(metrics.metalStallSec).toBe(1);
    expect(metrics.timeToFirstFactory).toBe(1);
    expect(metrics.timeToT2).toBe(1);
  });
});
