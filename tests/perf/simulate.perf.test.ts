import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRegistry } from '../../src/core/registry/registry';
import { simulate } from '../../src/core/sim/simulate';
import type { BuildPlan } from '../../src/core/schemas/plans';

describe('Simulate Wall-Clock Performance Benchmark', () => {
  const root = process.cwd();
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/snapshots/test-31479-433a460/units.json'), 'utf-8'));
  const factions = JSON.parse(fs.readFileSync(path.join(root, 'data/factions.json'), 'utf-8'));
  const aliases = JSON.parse(fs.readFileSync(path.join(root, 'data/aliases.json'), 'utf-8'));
  const registry = createRegistry(snapshot, factions, aliases);

  // Generate realistic 60-step build plan (900 s horizon)
  const steps: BuildPlan['steps'] = [];

  // Steps 1..10: Commander opening (mex, solar, factory, wind)
  steps.push({ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'cormex', count: 2 });
  steps.push({ id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'corsolar', count: 1 });
  steps.push({ id: 's3', actor: { kind: 'commander' }, action: 'build', unitId: 'corvp', count: 1 });
  for (let i = 4; i <= 10; i++) {
    steps.push({ id: `s${i}`, actor: { kind: 'commander' }, action: 'build', unitId: 'corwin', count: 1 });
  }

  // Steps 11..35: Factory vehicle production queue
  for (let i = 11; i <= 35; i++) {
    const unitId = i === 11 ? 'corcv' : (i % 2 === 0 ? 'corgator' : 'corfav');
    steps.push({ id: `s${i}`, actor: { kind: 'factory', unitId: 'corvp', index: 1 }, action: 'build', unitId, count: 2 });
  }

  // Steps 36..60: Mobile builder expansion queue
  for (let i = 36; i <= 60; i++) {
    const unitId = i % 3 === 0 ? 'cormex' : (i % 3 === 1 ? 'corwin' : 'cormakr');
    steps.push({ id: `s${i}`, actor: { kind: 'builder', unitId: 'corcv', index: 1 }, action: 'build', unitId, count: 1 });
  }

  const plan: BuildPlan = {
    version: 1,
    id: 'perf-60-step-plan',
    name: 'Performance 60 Step Plan',
    factionId: 'cortex',
    steps
  };

  const map = {
    windAvg: 12,
    windMin: 4,
    windMax: 20,
    tidalStrength: 0,
    mexYield: 1.43,
    mexYieldProvenance: 'measured' as const
  };

  it('finishes a 60-step plan (900s, dt 0.5) in <= 15 ms (median of 20 runs)', () => {
    // Warmup
    for (let i = 0; i < 5; i++) {
      simulate({ registry, plan, map, options: { horizon: 900, dt: 0.5, schedule: 'asap' } });
    }

    // 20 benchmark runs
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      simulate({ registry, plan, map, options: { horizon: 900, dt: 0.5, schedule: 'asap' } });
      times.push(performance.now() - start);
    }

    times.sort((a, b) => a - b);
    const medianMs = times[Math.floor(times.length / 2)]!;

    // Budget: <= 15 ms
    expect(medianMs).toBeLessThanOrEqual(15.0);
  });
});
