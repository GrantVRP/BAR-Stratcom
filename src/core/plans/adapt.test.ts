import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import snapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../registry';
import { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema, type BuildPlan, type MapRecord } from '../schemas';
import { adaptPlan, energyOutput, selectBasePlan, windClass, type AdaptTarget } from './adapt';

const registry = createRegistry(
  UnitSnapshotSchema.parse(snapshotData),
  FactionsFileSchema.parse(factionsData),
  AliasesFileSchema.parse(aliasesData)
);

// Synthetic plans and maps (test-only); unit numbers come from the real snapshot:
// armwin windGenerator 25, armsolar +20 E/s (energyUpkeep -20).
function plan(id: string, over: Partial<BuildPlan>, steps: BuildPlan['steps']): BuildPlan {
  return {
    schemaVersion: 1,
    id,
    title: `Plan ${id}`,
    factionId: 'armada',
    gameVersion: 'test-31479-433a460',
    modes: ['1v1'],
    role: 'any',
    skill: 'intermediate',
    opening: 'bot',
    energyStyle: 'wind',
    source: { kind: 'manual', createdAt: '2026-10-05T00:00:00.000Z' },
    steps,
    ...over
  };
}

function map(windMin: number, windMax: number): MapRecord {
  return {
    fileName: 'test_map',
    scriptName: 'Test Map 1.0',
    name: 'Test Map',
    author: null,
    sizeX: 12,
    sizeZ: 12,
    wind: { min: windMin, max: windMax },
    tidalStrength: 0,
    maxMetal: 2,
    extractorRadius: 90,
    gravity: 100,
    startPositions: [],
    hasWater: false,
    popularity: null,
    mexYield: null
  };
}

const cdr = { kind: 'commander' } as const;
const windOpening = plan('wind-op', { energyStyle: 'wind' }, [
  { id: 's1', actor: cdr, action: 'build', unitId: 'armmex', count: 2, targetTime: 4 },
  { id: 's2', actor: cdr, action: 'build', unitId: 'armwin', count: 5, targetTime: 30 },
  { id: 's3', actor: cdr, action: 'build', unitId: 'armlab', count: 1, targetTime: 90 }
]);
const solarOpening = plan('solar-op', { energyStyle: 'solar' }, [
  { id: 's1', actor: cdr, action: 'build', unitId: 'armmex', count: 2, targetTime: 4 },
  { id: 's2', actor: cdr, action: 'build', unitId: 'armsolar', count: 2, targetTime: 30 },
  { id: 's3', actor: cdr, action: 'build', unitId: 'armlab', count: 1, targetTime: 90 }
]);
const target = (avgWind: number | null, m = map(0, 20)): AdaptTarget => ({
  factionId: 'armada',
  mapRecord: m,
  avgWind,
  mode: '1v1',
  skill: 'intermediate'
});
const at = '2026-10-05T12:00:00.000Z';

function ok(result: ReturnType<typeof adaptPlan>): Exclude<ReturnType<typeof adaptPlan>, { error: 'NO_BASE_PLAN' }> {
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('plan adapter (04 §5.2, T08.5)', () => {
  it('classifies wind: high ≥ 10, low < 6, unknown without data', () => {
    expect([windClass(12), windClass(10), windClass(8), windClass(5.9), windClass(null)]).toEqual(['high', 'high', 'mid', 'low', 'unknown']);
    expect(energyOutput(registry.get('armsolar')!)).toBe(20);
  });

  it('low wind: 5 turbines become ceil(5 · min(4, 25) / 20) = 1 solar collector', () => {
    const r = ok(adaptPlan({ registry, library: [windOpening], target: target(4), createdAt: at }));
    const s2 = r.plan.steps.find((s) => s.id === 's2')!;
    expect([s2.unitId, s2.count]).toEqual(['armsolar', 1]);
    expect(r.plan.energyStyle).toBe('solar');
    expect(r.transforms).toContain('energy(wind→solar)');
    expect(r.issues.errors).toEqual([]);
  });

  it('high wind: 2 solar collectors become ceil(2 · 20 / min(12.5, 25)) = 4 turbines', () => {
    const r = ok(adaptPlan({ registry, library: [solarOpening], target: target(12.5), createdAt: at }));
    const s2 = r.plan.steps.find((s) => s.id === 's2')!;
    expect([s2.unitId, s2.count]).toEqual(['armwin', 4]);
    expect(r.plan.energyStyle).toBe('wind');
    expect(r.transforms).toContain('energy(solar→wind)');
  });

  it('mid wind or a matching style keeps the energy as planned', () => {
    expect(ok(adaptPlan({ registry, library: [windOpening], target: target(8), createdAt: at })).plan.steps[1]!.unitId).toBe('armwin');
    expect(ok(adaptPlan({ registry, library: [solarOpening], target: target(3), createdAt: at })).plan.steps[1]!.unitId).toBe('armsolar');
  });

  it('unknown wind: no substitution and a W_WIND_UNKNOWN warning', () => {
    const r = ok(adaptPlan({ registry, library: [windOpening], target: target(null), createdAt: at }));
    expect(r.plan.steps.map((s) => [s.unitId, s.count])).toEqual([
      ['armmex', 2],
      ['armwin', 5],
      ['armlab', 1]
    ]);
    expect(r.issues.warnings.map((w) => w.code)).toContain('W_WIND_UNKNOWN');
    expect(r.transforms.some((t) => t.startsWith('energy('))).toBe(false);
  });

  it('retimes every step to its simulated (asap) start and records the source', () => {
    const r = ok(adaptPlan({ registry, library: [windOpening], target: target(8), createdAt: at }));
    expect(r.plan.steps[0]!.targetTime).toBe(r.sim.steps.find((s) => s.stepId === 's1')!.start);
    expect(r.plan.source).toEqual({ kind: 'adapted', fromPlanId: 'wind-op', transforms: r.transforms, createdAt: at });
    expect(r.plan.mapFit).toEqual({ windMin: 0, windMax: 20, maps: ['Test Map 1.0'] });
    expect(r.plan.id).toBe('wind-op-adapted-test-map-1-0');
  });

  it('inserts commander energy before an early energy stall (at most 3 times)', () => {
    // 3 mexes and two labs with no energy buildings stall energy from about 1:17 in the simulator
    const greedy = plan('greedy', { energyStyle: 'solar' }, [
      { id: 's1', actor: cdr, action: 'build', unitId: 'armmex', count: 3 },
      { id: 's2', actor: cdr, action: 'build', unitId: 'armlab', count: 1 },
      { id: 's3', actor: { kind: 'factory', unitId: 'armlab', index: 1 }, action: 'build', unitId: 'armck', count: 2 },
      { id: 's4', actor: { kind: 'builder', unitId: 'armck', index: 1 }, action: 'build', unitId: 'armlab', count: 1 },
      { id: 's5', actor: { kind: 'factory', unitId: 'armlab', index: 1 }, action: 'build', unitId: 'armpw', count: 12 }
    ]);
    const r = ok(adaptPlan({ registry, library: [greedy], target: target(8), createdAt: at }));
    const fixes = r.plan.steps.filter((s) => s.id.startsWith('fix'));
    expect(fixes.length).toBeGreaterThanOrEqual(1);
    expect(fixes.length).toBeLessThanOrEqual(3);
    expect(fixes.every((s) => s.actor.kind === 'commander' && s.unitId === 'armsolar' && s.count === 1)).toBe(true);
    expect(r.transforms.filter((t) => t === 'stall-fix(armsolar)')).toHaveLength(fixes.length);
    expect(r.issues.errors).toEqual([]);
    // the fix lands before the step that stalled, not at the end
    expect(r.plan.steps.findIndex((s) => s.id === 'fix1')).toBeLessThan(r.plan.steps.length - 1);
  });

  it('returns NO_BASE_PLAN when no plan fits faction and mode', () => {
    expect(adaptPlan({ registry, library: [{ ...windOpening, factionId: 'cortex' }], target: target(8), createdAt: at })).toEqual({ error: 'NO_BASE_PLAN' });
    expect(adaptPlan({ registry, library: [{ ...windOpening, modes: ['large-team'] }], target: target(8), createdAt: at })).toEqual({ error: 'NO_BASE_PLAN' });
  });

  it('picks the base whose wind fit is closest, then the nearest skill', () => {
    const calm = { ...windOpening, id: 'calm', mapFit: { windMin: 2, windMax: 8 } };
    const windy = { ...windOpening, id: 'windy', mapFit: { windMin: 10, windMax: 20 } };
    expect(selectBasePlan([calm, windy], target(14))?.id).toBe('windy');
    expect(selectBasePlan([calm, windy], target(4))?.id).toBe('calm');
    const pro = { ...windy, id: 'pro', skill: 'advanced' as const };
    expect(selectBasePlan([pro, windy], target(14))?.id).toBe('windy');
  });

  it('is deterministic', () => {
    const a = adaptPlan({ registry, library: [solarOpening, windOpening], target: target(12.5), createdAt: at });
    const b = adaptPlan({ registry, library: [windOpening, solarOpening], target: target(12.5), createdAt: at });
    expect(a).toEqual(b);
  });
});
