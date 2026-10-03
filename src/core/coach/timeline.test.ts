import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '../schemas/plans';
import type { LiveSnapshot } from '../schemas/live';
import type { WidgetEvent } from '../schemas/protocol';
import { UnitSnapshotSchema } from '../schemas/units';
import { createRegistry } from '../registry';
import syntheticSnapshotData from '../registry/__test__/test-snapshot.json';
import { simulate } from '../sim/simulate';
import { computeScenarioTimeline, makeBehindPlan } from './timeline';
import { BEGINNER_PROFILE } from './profiles';

describe('timeline (04 §3, T05.9)', () => {
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
  const aliases = { schemaVersion: 1 as const, aliases: [] };
  const registry = createRegistry(snapshot, factions, aliases);

  const basePlan: BuildPlan = {
    schemaVersion: 1,
    id: 'test-plan',
    title: 'Test Plan',
    factionId: 'armada',
    gameVersion: 'test',
    modes: ['1v1'],
    role: 'any',
    skill: 'beginner',
    opening: 'bot',
    energyStyle: 'mixed',
    source: { kind: 'manual', createdAt: '2026-10-02T00:00:00Z' },
    steps: [
      {
        id: 's1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armmex',
        count: 1,
        targetTime: 35
      },
      {
        id: 's2',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armsolar',
        count: 1,
        targetTime: 65
      }
    ]
  };

  it('makeBehindPlan shifts targetTime earlier by deltaSec and clamps to 0', () => {
    const behind = makeBehindPlan(basePlan, 30);
    expect(behind.steps[0]!.targetTime).toBe(5);
    expect(behind.steps[1]!.targetTime).toBe(35);

    const behindLarge = makeBehindPlan(basePlan, 50);
    expect(behindLarge.steps[0]!.targetTime).toBe(0); // clamped at 0
    expect(behindLarge.steps[1]!.targetTime).toBe(15);
  });

  it('computes scenario timeline tracking alert intervals and cues', () => {
    const map = {
      windAvg: 10,
      windMin: 5,
      windMax: 15,
      tidalStrength: 0,
      mexYield: 1.5,
      mexYieldProvenance: 'estimated' as const
    };
    const planSim = simulate({
      plan: basePlan,
      registry,
      map,
      options: { schedule: 'respect-targets' }
    });

    const states: LiveSnapshot[] = [
      {
        frame: 0,
        gameSeconds: 0,
        me: { teamId: 0, allyTeamId: 0, playerName: 'P', factionId: 'armada', startUnitId: 'armcom' },
        wind: { current: 10 },
        res: {
          energy: {
            current: 1000,
            storage: 1000,
            pull: 0,
            expense: 0,
            income: 10,
            received: 0,
            sent: 0,
            share: 1
          },
          metal: {
            current: 1000,
            storage: 1000,
            pull: 0,
            expense: 0,
            income: 1.5,
            received: 0,
            sent: 0,
            share: 1
          }
        },
        counts: { armcom: { alive: 1, building: 0 } },
        builders: { idle: 0, total: 0 },
        factories: { idle: 0, total: 0 },
        commander: { alive: true, idle: false },
        bp: { active: 300, total: 300 },
        enemies: {}
      },
      {
        frame: 300,
        gameSeconds: 10,
        me: { teamId: 0, allyTeamId: 0, playerName: 'P', factionId: 'armada', startUnitId: 'armcom' },
        wind: { current: 10 },
        res: {
          energy: {
            current: 1000,
            storage: 1000,
            pull: 0,
            expense: 0,
            income: 10,
            received: 0,
            sent: 0,
            share: 1
          },
          metal: {
            current: 1000,
            storage: 1000,
            pull: 0,
            expense: 0,
            income: 1.5,
            received: 0,
            sent: 0,
            share: 1
          }
        },
        counts: { armcom: { alive: 1, building: 0 } },
        builders: { idle: 0, total: 0 },
        factories: { idle: 0, total: 0 },
        commander: { alive: true, idle: false },
        bp: { active: 300, total: 300 },
        enemies: {}
      }
    ];

    const events: WidgetEvent[] = [
      { tm: 0, e: 'finished', d: 'armcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'armmex', u: 2, f: 150 }
    ];

    const result = computeScenarioTimeline({
      plan: basePlan,
      planSim,
      registry,
      states,
      events,
      teamId: 0,
      profile: BEGINNER_PROFILE
    });

    expect(result).toBeDefined();
    expect(result.finalAheadBehindSec).toBeDefined();
    expect(Array.isArray(result.alertIntervals)).toBe(true);
    expect(Array.isArray(result.cues)).toBe(true);
  });
});
