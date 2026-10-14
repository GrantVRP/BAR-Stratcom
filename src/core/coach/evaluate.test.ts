import { describe, it, expect } from 'vitest';
import type { BuildPlan } from '../schemas/plans';
import type { SimResult } from '../sim/types';
import type { LiveSnapshot } from '../schemas/live';
import type { Registry } from '../registry';
import { CoachStateSchema, CueSchema } from '../schemas/coach';
import { CoachHudSchema } from '../schemas/protocol';
import { createFinishedLedger } from './ledger';
import { createInitialCoachMemory } from './rules';
import { INTERMEDIATE_PROFILE } from './profiles';
import { evaluate } from './evaluate';

const plan: BuildPlan = {
  schemaVersion: 1,
  id: 'plan-1',
  title: 'Test Plan',
  factionId: 'armada',
  gameVersion: '1.0.0',
  modes: ['1v1'],
  role: 'any',
  skill: 'intermediate',
  opening: 'bot',
  energyStyle: 'solar',
  source: { kind: 'manual', createdAt: '2026-10-02' },
  steps: [
    {
      id: 's0',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armmex',
      count: 1,
      targetTime: 10
    },
    {
      id: 's1',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armsolar',
      count: 1,
      targetTime: 25
    }
  ]
};

const planSim: SimResult = {
  samples: [],
  steps: [
    { stepId: 's0', start: 0, finish: 10 },
    { stepId: 's1', start: 10, finish: 25 }
  ],
  intervals: { energyStall: [], metalStall: [], metalFloat: [], energyFloat: [] },
  totals: { energyStallSec: 0, metalStallSec: 0, idleBpSec: 0 },
  flags: []
};

const mockRegistry = {
  get: (id: string) => ({ id, name: id === 'armmex' ? 'Metal Extractor' : 'Solar Collector' }),
  classify: () => 'assault'
} as unknown as Registry;

function makeSnapshot(overrides: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    frame: 300,
    gameSeconds: 10,
    me: { teamId: 0, allyTeamId: 0, factionId: 'armada', startUnitId: null, playerName: 'Player' },
    wind: { current: 10 },
    res: {
      metal: { current: 500, storage: 1000, pull: 5, income: 10, expense: 5, share: 0, sent: 0, received: 0 },
      energy: {
        current: 500,
        storage: 1000,
        pull: 10,
        income: 20,
        expense: 10,
        share: 0,
        sent: 0,
        received: 0
      }
    },
    counts: {},
    builders: { total: 1, idle: 0 },
    factories: { total: 1, idle: 0 },
    commander: { alive: true, idle: false },
    bp: { total: 300, active: 300 },
    enemies: {},
    ...overrides
  };
}

describe('Coach Engine: evaluate()', () => {
  it('evaluates live snapshot and returns valid CoachState, cues, and display model', () => {
    const memory = createInitialCoachMemory();
    const now = makeSnapshot({ gameSeconds: 5 });

    const result = evaluate({
      plan,
      planSim,
      registry: mockRegistry,
      now,
      history: [],
      finished: createFinishedLedger(),
      benchmark: null,
      profile: INTERMEDIATE_PROFILE,
      memory,
      mode: 'live'
    });

    expect(CoachStateSchema.safeParse(result.state).success).toBe(true);
    expect(CoachHudSchema.safeParse(result.display.hud).success).toBe(true);
    for (const cue of result.cues) {
      expect(CueSchema.safeParse(cue).success).toBe(true);
    }

    expect(result.state.mode).toBe('live');
    expect(result.state.steps).toHaveLength(2);
    expect(result.display.hud.visible).toBe(true);
  });

  it('remembers when each enemy type was first seen and gives the radar its contacts', () => {
    const tick = (gameSeconds: number, enemies: Record<string, number>, memory = createInitialCoachMemory()) =>
      evaluate({
        plan,
        planSim,
        registry: mockRegistry,
        now: makeSnapshot({ gameSeconds, enemies }),
        history: [],
        finished: createFinishedLedger(),
        benchmark: null,
        profile: INTERMEDIATE_PROFILE,
        memory,
        mode: 'live'
      });
    const first = tick(10, { armmex: 2 });
    const second = tick(40, { armmex: 3 }, first.memory);
    expect(second.memory.enemySeenAt).toEqual({ armmex: 10 });
    expect(second.state.enemySeenAt).toEqual({ armmex: 10 });
    expect(CoachStateSchema.safeParse(second.state).success).toBe(true);
    expect(second.display.hud.radar).toEqual({ range: 2400, lines: [{ text: '3× Metal Extractor', tone: 'info', right: '0:30 ago' }] });
    expect(tick(50, {}, second.memory).memory.enemySeenAt).toEqual({});
  });

  it('runs manual mode with HUD hidden and no sensor alerts', () => {
    const memory = createInitialCoachMemory();
    // Snapshot with critical energy stall that would normally trigger danger alert
    const stallingSnapshot = makeSnapshot({
      gameSeconds: 5,
      res: {
        metal: {
          current: 500,
          storage: 1000,
          pull: 5,
          income: 10,
          expense: 5,
          share: 0,
          sent: 0,
          received: 0
        },
        energy: {
          current: 2,
          storage: 1000,
          pull: 50,
          income: 10,
          expense: 10,
          share: 0,
          sent: 0,
          received: 0
        }
      }
    });

    const result = evaluate({
      plan,
      planSim,
      registry: mockRegistry,
      now: stallingSnapshot,
      history: [],
      finished: createFinishedLedger(),
      benchmark: null,
      profile: INTERMEDIATE_PROFILE,
      memory,
      mode: 'manual'
    });

    // In manual mode: HUD is not visible, no live sensor alerts
    expect(result.display.hud.visible).toBe(false);
    expect(result.state.alerts).toHaveLength(0);
    expect(result.display.mode).toBe('manual');
  });

  it('triggers chat echo on danger alert and honors 10s cooldown', () => {
    const memory = createInitialCoachMemory();
    const stallingRes = {
      metal: { current: 500, storage: 1000, pull: 5, income: 10, expense: 5, share: 0, sent: 0, received: 0 },
      energy: { current: 2, storage: 1000, pull: 50, income: 10, expense: 10, share: 0, sent: 0, received: 0 }
    };
    const now = makeSnapshot({ gameSeconds: 20, res: stallingRes });
    const history = [
      makeSnapshot({ gameSeconds: 18, res: stallingRes }),
      makeSnapshot({ gameSeconds: 19, res: stallingRes })
    ];

    // Tick 1 at 20s: danger alert fires with chat echo enabled
    const res1 = evaluate({
      plan,
      planSim,
      registry: mockRegistry,
      now,
      history,
      finished: createFinishedLedger(),
      benchmark: null,
      profile: INTERMEDIATE_PROFILE,
      memory,
      mode: 'live',
      chatEchoEnabled: true
    });

    expect(res1.display.echo).toHaveLength(1);
    expect(res1.display.echo[0]!.text).toBe('ENERGY STALL');

    // Tick 2 at 25s (5s elapsed < 10s cooldown) => echo is suppressed
    const res2 = evaluate({
      plan,
      planSim,
      registry: mockRegistry,
      now: makeSnapshot({ gameSeconds: 25, res: stallingRes }),
      history,
      finished: createFinishedLedger(),
      benchmark: null,
      profile: INTERMEDIATE_PROFILE,
      memory: res1.memory,
      mode: 'live',
      chatEchoEnabled: true
    });

    expect(res2.display.echo).toHaveLength(0);

    // Tick 3 at 31s (11s elapsed >= 10s) => echo can fire again
    const res3 = evaluate({
      plan,
      planSim,
      registry: mockRegistry,
      now: makeSnapshot({ gameSeconds: 31, res: stallingRes }),
      history,
      finished: createFinishedLedger(),
      benchmark: null,
      profile: INTERMEDIATE_PROFILE,
      memory: res2.memory,
      mode: 'live',
      chatEchoEnabled: true
    });

    expect(res3.display.echo).toHaveLength(1);
  });
});
