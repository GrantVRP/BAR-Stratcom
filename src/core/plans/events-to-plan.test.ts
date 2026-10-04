import { describe, it, expect } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import defaultSnapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../registry';
import { validatePlan } from './validate';
import {
  eventsToPlan,
  deriveOpening,
  deriveEnergyStyle,
  deriveModes
} from './events-to-plan';
import type { WidgetEvent } from '../schemas/protocol';
import type { BuildPlan } from '../schemas/plans';
import {
  AliasesFileSchema,
  FactionsFileSchema,
  UnitSnapshotSchema,
  type UnitSnapshot
} from '../schemas';
import goldenSyntheticPlan from './__golden__/synthetic-plan.json';

describe('eventsToPlan (04 §5.3, T04.4)', () => {
  const snapshot: UnitSnapshot = UnitSnapshotSchema.parse(defaultSnapshotData);
  const factions = FactionsFileSchema.parse(factionsData);
  const aliases = AliasesFileSchema.parse(aliasesData);
  const registry = createRegistry(snapshot, factions, aliases);

  it('derives opening based on first factory def', () => {
    expect(deriveOpening('armlab')).toBe('bot');
    expect(deriveOpening('corlab')).toBe('bot');
    expect(deriveOpening('armvp')).toBe('vehicle');
    expect(deriveOpening('corvp')).toBe('vehicle');
    expect(deriveOpening('armap')).toBe('air');
    expect(deriveOpening('corap')).toBe('air');
    expect(deriveOpening('armsy')).toBe('sea');
    expect(deriveOpening('corsy')).toBe('sea');
    expect(deriveOpening('armhp')).toBe('hover');
    expect(deriveOpening('corhp')).toBe('hover');
    expect(deriveOpening(undefined)).toBe('mixed');
    expect(deriveOpening('unknown')).toBe('mixed');
  });

  it('derives energyStyle based on wind, solar, and tidal structures in first 300s', () => {
    // 5 wind, 0 solar
    const windEvents = Array.from({ length: 5 }, (_, i) => ({ d: 'armwin', f: i * 300 }));
    expect(deriveEnergyStyle(windEvents, registry)).toBe('wind');

    // 5 solar, 1 wind
    const solarEvents = [
      ...Array.from({ length: 5 }, (_, i) => ({ d: 'armsolar', f: i * 300 })),
      { d: 'armwin', f: 1800 }
    ];
    expect(deriveEnergyStyle(solarEvents, registry)).toBe('solar');

    // 5 tidal
    const tidalEvents = Array.from({ length: 5 }, (_, i) => ({ d: 'armtide', f: i * 300 }));
    expect(deriveEnergyStyle(tidalEvents, registry)).toBe('tidal');

    // Mixed 3 wind, 3 solar
    const mixedEvents = [
      ...Array.from({ length: 3 }, (_, i) => ({ d: 'armwin', f: i * 300 })),
      ...Array.from({ length: 3 }, (_, i) => ({ d: 'armsolar', f: (i + 3) * 300 }))
    ];
    expect(deriveEnergyStyle(mixedEvents, registry)).toBe('mixed');

    // Empty events defaults to solar
    expect(deriveEnergyStyle([], registry)).toBe('solar');
  });

  it('derives modes based on team configuration', () => {
    expect(deriveModes()).toEqual(['1v1']);
    expect(
      deriveModes([
        { teamId: 0, allyTeamId: 0 },
        { teamId: 1, allyTeamId: 1 }
      ])
    ).toEqual(['1v1']);
    expect(
      deriveModes([
        { teamId: 0, allyTeamId: 0 },
        { teamId: 1, allyTeamId: 0 },
        { teamId: 2, allyTeamId: 1 },
        { teamId: 3, allyTeamId: 1 }
      ])
    ).toEqual(['small-team']);
    expect(
      deriveModes(
        Array.from({ length: 16 }, (_, i) => ({
          teamId: i,
          allyTeamId: i < 8 ? 0 : 1
        }))
      )
    ).toEqual(['large-team']);
  });

  it('converts synthetic event stream into exact expected golden plan with 0 validation errors', () => {
    const syntheticEvents: WidgetEvent[] = [
      // Commander at start
      { tm: 0, e: 'created', d: 'armcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'armcom', u: 1, f: 0 },
      { e: 'gamestart', f: 0 },

      // Commander builds mex, mex
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armmex', u: 10, f: 180 },
      { tm: 0, e: 'finished', d: 'armmex', u: 10, f: 360 },
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armmex', u: 11, f: 480 },
      { tm: 0, e: 'finished', d: 'armmex', u: 11, f: 660 },

      // Commander builds solar
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armsolar', u: 12, f: 720 },
      { tm: 0, e: 'finished', d: 'armsolar', u: 12, f: 1000 },

      // Commander builds lab
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armlab', u: 13, f: 1080 },
      { tm: 0, e: 'finished', d: 'armlab', u: 13, f: 1800 },

      // Lab builds 3 armpw
      { tm: 0, bd: 'armlab', b: 13, e: 'created', d: 'armpw', u: 20, f: 1860 },
      { tm: 0, e: 'finished', d: 'armpw', u: 20, f: 2000 },
      { tm: 0, bd: 'armlab', b: 13, e: 'created', d: 'armpw', u: 21, f: 2040 },
      { tm: 0, e: 'finished', d: 'armpw', u: 21, f: 2180 },
      { tm: 0, bd: 'armlab', b: 13, e: 'created', d: 'armpw', u: 22, f: 2220 },
      { tm: 0, e: 'finished', d: 'armpw', u: 22, f: 2360 },

      // Lab builds 1 armck
      { tm: 0, bd: 'armlab', b: 13, e: 'created', d: 'armck', u: 23, f: 2400 },
      { tm: 0, e: 'finished', d: 'armck', u: 23, f: 2700 },

      // Con builds 2 armmex
      { tm: 0, bd: 'armck', b: 23, e: 'created', d: 'armmex', u: 30, f: 2800 },
      { tm: 0, e: 'finished', d: 'armmex', u: 30, f: 3100 },
      { tm: 0, bd: 'armck', b: 23, e: 'created', d: 'armmex', u: 31, f: 3200 },
      { tm: 0, e: 'finished', d: 'armmex', u: 31, f: 3500 },

      // Cancelled build: commander starts solar, destroyed without finishing
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armsolar', u: 40, f: 3600 },
      { tm: 0, e: 'destroyed', d: 'armsolar', u: 40, f: 3700 }
    ];

    const plan: BuildPlan = eventsToPlan({
      registry,
      events: syntheticEvents,
      teamId: 0,
      meta: {
        player: 'Player',
        map: 'Archsims Canyon',
        source: {
          kind: 'replay-capture',
          sessionId: 'synth-01',
          player: 'Player',
          map: 'Archsims Canyon',
          capturedAt: '2026-10-02T12:00:00Z'
        }
      }
    });

    // Matches golden exactly
    expect(plan).toEqual(goldenSyntheticPlan);

    // Validates against registry with 0 errors and 0 warnings
    const validation = validatePlan(plan, registry);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);
  });

  it('drops resurrected units with no build options from actor list', () => {
    const eventsWithResurrect: WidgetEvent[] = [
      { tm: 0, e: 'created', d: 'armcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'armcom', u: 1, f: 0 },
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armlab', u: 10, f: 180 },
      { tm: 0, e: 'finished', d: 'armlab', u: 10, f: 800 },
      { tm: 0, bd: 'armlab', b: 10, e: 'created', d: 'armrectr', u: 20, f: 850 },
      { tm: 0, e: 'finished', d: 'armrectr', u: 20, f: 1200 },
      // Resurrect bot resurrects a wrecked enemy corstorm
      { tm: 0, bd: 'armrectr', b: 20, e: 'created', d: 'corstorm', u: 30, f: 1300 },
      { tm: 0, e: 'finished', d: 'corstorm', u: 30, f: 1300 }
    ];

    const plan = eventsToPlan({
      registry,
      events: eventsWithResurrect,
      teamId: 0,
      meta: {
        player: 'Player',
        map: 'Onyx',
        source: {
          kind: 'replay-capture',
          sessionId: 's-res',
          player: 'Player',
          map: 'Onyx',
          capturedAt: '2026-10-02T12:00:00Z'
        }
      }
    });

    // corstorm must not appear as a build step
    expect(plan.steps.some((s) => s.unitId === 'corstorm')).toBe(false);
  });
const captureMeta = (sessionId: string): Parameters<typeof eventsToPlan>[0]['meta'] => ({
    player: 'Player',
    map: 'Ptaq',
    source: {
      kind: 'replay-capture',
      sessionId,
      player: 'Player',
      map: 'Ptaq',
      capturedAt: '2026-10-03T12:00:00Z'
    }
  });

  it('credits builds of a resurrected constructor to a constructor the plan did build', () => {
    // Mirrors the ptaq fixture, team 15: a necro bot resurrects a second constructor, which then builds.
    const events: WidgetEvent[] = [
      { tm: 0, e: 'created', d: 'corcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'corcom', u: 1, f: 0 },
      { tm: 0, bd: 'corcom', b: 1, e: 'created', d: 'corlab', u: 10, f: 300 },
      { tm: 0, e: 'finished', d: 'corlab', u: 10, f: 900 },
      { tm: 0, bd: 'corlab', b: 10, e: 'created', d: 'corck', u: 20, f: 950 },
      { tm: 0, e: 'finished', d: 'corck', u: 20, f: 1400 },
      { tm: 0, bd: 'corlab', b: 10, e: 'created', d: 'cornecro', u: 21, f: 1500 },
      { tm: 0, e: 'finished', d: 'cornecro', u: 21, f: 1800 },
      { tm: 0, bd: 'corck', b: 20, e: 'created', d: 'cormex', u: 30, f: 1900 },
      { tm: 0, e: 'finished', d: 'cormex', u: 30, f: 2200 },
      { tm: 0, bd: 'cornecro', b: 21, e: 'created', d: 'corck', u: 22, f: 2400 },
      { tm: 0, e: 'finished', d: 'corck', u: 22, f: 2400 },
      { tm: 0, bd: 'corck', b: 22, e: 'created', d: 'corsolar', u: 31, f: 2700 },
      { tm: 0, e: 'finished', d: 'corsolar', u: 31, f: 3000 }
    ];

    const plan = eventsToPlan({ registry, events, teamId: 0, meta: captureMeta('s-resurrected-con') });

    const solar = plan.steps.find((s) => s.unitId === 'corsolar');
    expect(solar?.actor).toEqual({ kind: 'builder', unitId: 'corck', index: 1 });
    expect(plan.steps.filter((s) => s.unitId === 'corck')).toHaveLength(1);
    expect(validatePlan(plan, registry).errors).toEqual([]);
  });

  it('skips builds by a constructor type the plan never built (e.g. one given by an ally)', () => {
    const events: WidgetEvent[] = [
      { tm: 0, e: 'created', d: 'corcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'corcom', u: 1, f: 0 },
      { tm: 0, bd: 'corcom', b: 1, e: 'created', d: 'corlab', u: 10, f: 300 },
      { tm: 0, e: 'finished', d: 'corlab', u: 10, f: 900 },
      // u50 is a constructor this team never built
      { tm: 0, bd: 'corck', b: 50, e: 'created', d: 'cormex', u: 30, f: 1000 },
      { tm: 0, e: 'finished', d: 'cormex', u: 30, f: 1300 }
    ];

    const plan = eventsToPlan({ registry, events, teamId: 0, meta: captureMeta('s-given-con') });

    expect(plan.steps.map((s) => s.unitId)).toEqual(['corlab']);
    expect(validatePlan(plan, registry).errors).toEqual([]);
  });
});
