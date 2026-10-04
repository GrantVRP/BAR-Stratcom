import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRegistry } from '../src/core/registry';
import { validatePlan } from '../src/core/plans/validate';
import { BuildPlanSchema, SnapshotIndexSchema, UnitSnapshotSchema } from '../src/core/schemas';
import { validateCandidatePlan } from './lib/curated-guard';
import { FACTORY_BEFORE_SEC, MIN_STEPS } from './lib/curate-select';

const root = process.cwd();
const dir = path.join(root, 'data/builds/_candidates');
const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8'));

describe('committed curated candidates (T08.3)', () => {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const plans = files.map((f) => BuildPlanSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))));
  const list = (readJson('docs/plan/reports/h2-replay-list.json') as { replays: Array<{ id: string }> }).replays;
  const review = fs.readFileSync(path.join(root, 'data/builds/_review.md'), 'utf-8');
  const fixtures = fs.readdirSync(path.join(root, 'data/fixtures/sessions'));
  const index = SnapshotIndexSchema.parse(readJson('data/snapshots/index.json'));
  const registry = createRegistry(
    UnitSnapshotSchema.parse(readJson(`data/snapshots/${index.available.find((a) => a.gameVersion === index.default)!.path}`)),
    readJson('data/factions.json') as Parameters<typeof createRegistry>[1],
    readJson('data/aliases.json') as Parameters<typeof createRegistry>[2]
  );

  it('has at least 16 candidates, one review entry and decision line each', () => {
    expect(plans.length).toBeGreaterThanOrEqual(16);
    expect(review.split('\n').filter((l) => l.startsWith('DECISION:'))).toHaveLength(plans.length);
    for (const p of plans) expect(review, p.id).toContain(`\`${p.id}\``);
  });

  it('every candidate comes from a listed pro replay that is a fixture, unreviewed, with 0 validation errors', () => {
    for (const p of plans) {
      expect(validateCandidatePlan(p), p.id).toEqual({ valid: true });
      const replayId = p.source.kind === 'curated' ? p.source.replayId : '';
      expect(list.some((r) => r.id === replayId), p.id).toBe(true);
      expect(fixtures.some((f) => f.includes('-pro-') && f.endsWith(replayId.slice(0, 6))), p.id).toBe(true);
      expect(validatePlan(p, registry).errors, p.id).toEqual([]);
      expect(p.steps.length).toBeGreaterThanOrEqual(MIN_STEPS);
      const factory = p.steps.find((s) => s.unitId && registry.get(s.unitId)?.isFactory);
      expect(factory?.targetTime ?? Infinity, p.id).toBeLessThan(FACTORY_BEFORE_SEC);
    }
  });
});
