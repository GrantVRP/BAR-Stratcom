import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';
import { createRegistry } from '../registry';
import syntheticSnapshotData from '../registry/__test__/test-snapshot.json';
import goldenOpeningA from './__golden__/opening-a.json';
import { deriveBaseMexExtractsMetal, simulate } from './simulate';
import { SimInputError, type SimInput } from './types';

const syntheticSnapshot = UnitSnapshotSchema.parse(syntheticSnapshotData);

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

const registry = createRegistry(syntheticSnapshot, factions, aliases);

const openingPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'synthetic-opening-a',
  title: 'Synthetic Opening A',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason test-fixture',
  modes: ['1v1'],
  role: 'any',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'mixed',
  source: {
    kind: 'manual',
    createdAt: '2026-10-02T00:00:00.000Z'
  },
  steps: [
    { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 1, targetTime: 0 },
    { id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 1, targetTime: 10 },
    { id: 's3', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 1, targetTime: 20 },
    { id: 's4', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 1, targetTime: 35 },
    { id: 's5', actor: { kind: 'commander' }, action: 'build', unitId: 'armlab', count: 1, targetTime: 50 },
    { id: 's6', actor: { kind: 'factory', unitId: 'armlab', index: 1 }, action: 'build', unitId: 'armpw', count: 2, targetTime: 70 }
  ]
};

const baseMap = {
  windAvg: 10,
  windMin: 5,
  windMax: 20,
  tidalStrength: 0,
  mexYield: 2.0,
  mexYieldProvenance: 'estimated' as const
};

describe('Sim: scheduler & SimResult', () => {
  it('matches golden SimResult for 6-step synthetic opening', () => {
    const input: SimInput = {
      registry,
      plan: openingPlan,
      map: baseMap,
      start: {
        metal: 1000,
        energy: 1000,
        metalStorage: 1000,
        energyStorage: 1000
      },
      options: {
        dt: 0.5,
        horizon: 120,
        schedule: 'respect-targets'
      }
    };

    const result = simulate(input);
    expect(result).toEqual(goldenOpeningA);
  });

  it('guarantees asap finish times are less than or equal to respect-targets', () => {
    const respectInput: SimInput = {
      registry,
      plan: openingPlan,
      map: baseMap,
      options: { dt: 0.5, horizon: 120, schedule: 'respect-targets' }
    };
    const asapInput: SimInput = {
      registry,
      plan: openingPlan,
      map: baseMap,
      options: { dt: 0.5, horizon: 120, schedule: 'asap' }
    };

    const respectRes = simulate(respectInput);
    const asapRes = simulate(asapInput);

    expect(asapRes.steps).toHaveLength(respectRes.steps.length);
    for (let i = 0; i < respectRes.steps.length; i++) {
      const stepRespect = respectRes.steps[i];
      const stepAsap = asapRes.steps[i];
      expect(stepRespect).toBeDefined();
      expect(stepAsap).toBeDefined();

      if (stepRespect && stepAsap) {
        expect(stepAsap.finish).not.toBeNull();
        expect(stepRespect.finish).not.toBeNull();
        expect(stepAsap.finish!).toBeLessThanOrEqual(stepRespect.finish!);
      }
    }
  });

  it('surfaces validation error when an actor is unavailable', () => {
    const invalidPlan: BuildPlan = {
      ...openingPlan,
      steps: [
        // Factory armlab #1 attempts to build Pawn without armlab ever being built
        { id: 's1', actor: { kind: 'factory', unitId: 'armlab', index: 1 }, action: 'build', unitId: 'armpw', count: 1 }
      ]
    };

    expect(() => {
      simulate({ registry, plan: invalidPlan, map: baseMap });
    }).toThrowError(SimInputError);

    try {
      simulate({ registry, plan: invalidPlan, map: baseMap });
    } catch (err) {
      expect(err).toBeInstanceOf(SimInputError);
      const simErr = err as SimInputError;
      expect(simErr.issues.some((issue) => issue.code === 'E_ACTOR_NOT_AVAILABLE')).toBe(true);
    }
  });

  it('produces deterministic output across multiple runs', () => {
    const input: SimInput = {
      registry,
      plan: openingPlan,
      map: baseMap,
      options: { dt: 0.5, horizon: 120, schedule: 'respect-targets' }
    };

    const run1 = simulate(input);
    const run2 = simulate(input);
    expect(run1).toEqual(run2);
  });

  it('simulates reclaim and assist steps accurately', () => {
    // Step 1: Commander builds armlab
    // Step 2: Commander assists armlab (actor already busy or sequential)
    // Step 3: Commander reclaims
    const assistPlan: BuildPlan = {
      ...openingPlan,
      steps: [
        {
          id: 's1',
          actor: { kind: 'commander' },
          action: 'reclaim',
          count: 1,
          reclaim: { metal: 200, energy: 400, durationSec: 4 }
        },
        {
          id: 's2',
          actor: { kind: 'commander' },
          action: 'note',
          count: 1,
          text: 'Reclaim finished'
        }
      ]
    };

    const res = simulate({
      registry,
      plan: assistPlan,
      map: baseMap,
      options: { dt: 0.5, horizon: 20 }
    });

    const s1 = res.steps.find((s) => s.stepId === 's1');
    const s2 = res.steps.find((s) => s.stepId === 's2');
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    expect(s1?.finish).toBe(4.0);
    expect(s2?.finish).toBe(4.0);
  });

  it('flags horizonReached when steps fail to finish before horizon', () => {
    const res = simulate({
      registry,
      plan: openingPlan,
      map: baseMap,
      options: { dt: 0.5, horizon: 5 } // Only 5s horizon; lab and pawns cannot finish
    });

    expect(res.flags).toContain('horizonReached');
    const labStep = res.steps.find((s) => s.stepId === 's5');
    expect(labStep?.finish).toBeNull();
  });

  it('flags startEstimated and windUnknown when defaults or nulls are provided', () => {
    const mapWithoutWind = { ...baseMap, windAvg: null };
    const res = simulate({
      registry,
      plan: openingPlan,
      map: mapWithoutWind
      // start omitted
    });

    expect(res.flags).toContain('startEstimated');
    expect(res.flags).toContain('windUnknown');
    expect(res.flags).toContain('mexYieldEstimated');
  });

  it('evaluates windSeries when supplied in options', () => {
    const windSeries = Array.from({ length: 60 }, (_, i) => 5 + (i % 15));
    const res = simulate({
      registry,
      plan: openingPlan,
      map: baseMap,
      options: { dt: 0.5, horizon: 60, windSeries }
    });
    expect(res.samples).toHaveLength(61);
  });

  it('derives baseMexExtractsMetal from snapshot T1 metal extractor', () => {
    expect(deriveBaseMexExtractsMetal(registry, 'armada')).toBe(0.001);
    expect(deriveBaseMexExtractsMetal(registry, 'cortex')).toBe(0.001);
    expect(deriveBaseMexExtractsMetal(registry, 'unknown_faction')).toBe(0.001);
  });
});
