import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import snapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../registry';
import { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema, type BuildPlan, type BuildStep, type MapRecord } from '../schemas';
import { BEGINNER_STEPS, beginnerVariantId, makeBeginnerVariant, simplifyPlanSteps } from './simplify';

const registry = createRegistry(
  UnitSnapshotSchema.parse(snapshotData),
  FactionsFileSchema.parse(factionsData),
  AliasesFileSchema.parse(aliasesData)
);

const COM = { kind: 'commander' } as const;
const LAB = { kind: 'factory', unitId: 'armlab', index: 1 } as const;
const step = (id: string, actor: BuildStep['actor'], unitId: string, count: number, targetTime: number): BuildStep => ({ id, actor, action: 'build', unitId, count, targetTime });

describe('simplify transform', () => {
  it('merges consecutive builds of the same unit by the same actor, keeping the first time', () => {
    const steps = [step('a', COM, 'armmex', 1, 3), step('b', COM, 'armmex', 2, 10), step('c', COM, 'armwin', 1, 20), step('d', COM, 'armmex', 1, 30)];
    expect(simplifyPlanSteps(steps)).toEqual([step('a', COM, 'armmex', 3, 3), step('c', COM, 'armwin', 1, 20), step('d', COM, 'armmex', 1, 30)]);
  });

  it('does not merge across actors, actions or the 50-unit step limit', () => {
    const steps = [step('a', LAB, 'armpw', 30, 60), step('b', LAB, 'armpw', 30, 90), step('c', { kind: 'factory', unitId: 'armlab', index: 2 }, 'armpw', 1, 95)];
    expect(simplifyPlanSteps(steps).map((s) => [s.id, s.count])).toEqual([['a', 30], ['b', 30], ['c', 1]]);
  });

  it('keeps the first 12 steps and drops assists whose target was cut', () => {
    const many = Array.from({ length: 20 }, (_, i) => step(`s${i}`, COM, i % 2 ? 'armwin' : 'armsolar', 1, i * 10));
    expect(simplifyPlanSteps(many)).toHaveLength(BEGINNER_STEPS);
    const withAssist: BuildStep[] = [
      step('a', COM, 'armlab', 1, 10),
      { id: 'b', actor: COM, action: 'assist', assistStepId: 'a', count: 1 },
      { id: 'c', actor: COM, action: 'assist', assistStepId: 'gone', count: 1 }
    ];
    expect(simplifyPlanSteps(withAssist).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('builds a valid beginner variant that cites its curated parent', () => {
    const curated: BuildPlan = {
      schemaVersion: 1,
      id: 'pro-armada-bot-test-0123ab-t0',
      title: 'Bot wind // Test Map',
      factionId: 'armada',
      gameVersion: registry.gameVersion,
      modes: ['1v1'],
      role: 'any',
      skill: 'advanced',
      opening: 'bot',
      energyStyle: 'wind',
      source: { kind: 'curated', replayId: '0123abcd0123abcd0123abcd0123abcd', player: 'TestPro', map: 'Test Map 1.0', playedAt: '2026-09-12', gameVersion: registry.gameVersion, reviewedBy: 'Owner', reviewedAt: '2026-10-05' },
      steps: [
        step('s1', COM, 'armmex', 1, 3),
        step('s2', COM, 'armmex', 1, 8),
        step('s3', COM, 'armwin', 2, 15),
        step('s4', COM, 'armlab', 1, 30),
        step('s5', LAB, 'armck', 1, 50),
        step('s6', LAB, 'armpw', 2, 60),
        step('s7', LAB, 'armpw', 2, 70),
        ...Array.from({ length: 10 }, (_, i) => step(`w${i}`, COM, i % 2 ? 'armwin' : 'armsolar', 1, 80 + i * 10))
      ]
    };
    const map: MapRecord = {
      fileName: 'test_map_1.0', scriptName: 'Test Map 1.0', name: 'Test Map', author: null, sizeX: 12, sizeZ: 12,
      wind: { min: 5, max: 15 }, tidalStrength: 0, maxMetal: 2, extractorRadius: 90, gravity: 120, startPositions: [], hasWater: false, popularity: null, mexYield: null
    };
    const variant = makeBeginnerVariant({ curated, registry, map, avgWind: 9, createdAt: '2026-10-05T00:00:00.000Z' })!;
    expect(variant.issues.errors).toEqual([]);
    expect(variant.plan.id).toBe(beginnerVariantId(curated.id));
    expect(variant.plan.skill).toBe('beginner');
    expect(variant.plan.title).toBe('Bot wind // Test Map // Beginner');
    expect(variant.plan.steps.length).toBeLessThanOrEqual(BEGINNER_STEPS);
    expect(variant.plan.steps[0]).toMatchObject({ unitId: 'armmex', count: 2 }); // s1 + s2 merged
    expect(variant.plan.source).toMatchObject({ kind: 'adapted', fromPlanId: curated.id, createdAt: '2026-10-05T00:00:00.000Z' });
    expect(variant.plan.source.kind === 'adapted' && variant.plan.source.transforms.at(-1)).toBe('simplify(12)');
    expect(variant.plan.description).toContain("TestPro's opening");

    // a plan the adapter cannot select (no mode to match) yields no variant
    expect(makeBeginnerVariant({ curated: { ...curated, modes: [] as never }, registry, map, avgWind: 9, createdAt: '' })).toBeNull();
  });
});
