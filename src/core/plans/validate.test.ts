import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';
import { createRegistry } from '../registry';
import syntheticSnapshotData from '../registry/__test__/test-snapshot.json';
import { validatePlan } from './validate';

const syntheticSnapshot = UnitSnapshotSchema.parse(syntheticSnapshotData);

const testFactions = {
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

const testAliases = {
  schemaVersion: 1 as const,
  aliases: []
};

const registry = createRegistry(syntheticSnapshot, testFactions, testAliases);

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
    { id: 's3', actor: { kind: 'factory', unitId: 'armlab', index: 1 }, action: 'build', unitId: 'armpw', count: 1 }
  ]
};

describe('Plan validation (03 §5)', () => {
  it('passes a fully valid plan with 0 errors and 0 warnings', () => {
    const res = validatePlan(validPlan, registry);
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
  });

  it('reports E_WRONG_FACTION for non-existent faction', () => {
    const invalidPlan = { ...validPlan, factionId: 'unknown-faction' };
    const res = validatePlan(invalidPlan, registry);
    expect(res.errors.some((e) => e.code === 'E_WRONG_FACTION')).toBe(true);
  });

  it('reports W_STALE_VERSION when plan version differs from active registry', () => {
    const stalePlan = { ...validPlan, gameVersion: 'Old-Version-1.0' };
    const res = validatePlan(stalePlan, registry);
    expect(res.warnings.some((w) => w.code === 'W_STALE_VERSION')).toBe(true);
  });

  it('reports E_ACTOR_NOT_AVAILABLE when factory has not been built yet', () => {
    const invalidPlan: BuildPlan = {
      ...validPlan,
      steps: [
        { id: 's1', actor: { kind: 'factory', unitId: 'armlab', index: 1 }, action: 'build', unitId: 'armpw', count: 1 }
      ]
    };
    const res = validatePlan(invalidPlan, registry);
    expect(res.errors.some((e) => e.code === 'E_ACTOR_NOT_AVAILABLE')).toBe(true);
  });

  it('reports E_UNKNOWN_UNIT when building an unrecognised unit', () => {
    const invalidPlan: BuildPlan = {
      ...validPlan,
      steps: [
        { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'nonexistent_unit', count: 1 }
      ]
    };
    const res = validatePlan(invalidPlan, registry);
    expect(res.errors.some((e) => e.code === 'E_UNKNOWN_UNIT')).toBe(true);
  });

  it('reports E_NOT_BUILDABLE when actor buildOptions exclude target unit', () => {
    // Commander cannot build Finch (armpeep - air scout) directly
    const invalidPlan: BuildPlan = {
      ...validPlan,
      steps: [
        { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armpeep', count: 1 }
      ]
    };
    const res = validatePlan(invalidPlan, registry);
    expect(res.errors.some((e) => e.code === 'E_NOT_BUILDABLE')).toBe(true);
  });

  it('reports E_BAD_COUNT when step count is outside 1..50 range', () => {
    const invalidPlan: BuildPlan = {
      ...validPlan,
      steps: [
        { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 0 }
      ]
    };
    const res = validatePlan(invalidPlan, registry);
    expect(res.errors.some((e) => e.code === 'E_BAD_COUNT')).toBe(true);
  });

  it('reports W_TIME_ORDER when step targetTime decreases for an actor', () => {
    const outOfOrderPlan: BuildPlan = {
      ...validPlan,
      steps: [
        { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 1, targetTime: 25 },
        { id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 1, targetTime: 10 }
      ]
    };
    const res = validatePlan(outOfOrderPlan, registry);
    expect(res.warnings.some((w) => w.code === 'W_TIME_ORDER')).toBe(true);
  });
});
