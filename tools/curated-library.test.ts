import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePlan } from '../src/core/plans/validate';
import { BEGINNER_STEPS, beginnerVariantId } from '../src/core/plans/simplify';
import { BuildPlanSchema, type BuildPlan } from '../src/core/schemas';
import { validateCuratedPlanGuard } from './lib/curated-guard';
import { MIN_APPROVED } from './lib/publish-curated';
import { parseReviewDecisions } from './lib/review-log';
import { registryLoader } from './lib/registry-for';

const root = process.cwd();
const builds = path.join(root, 'data/builds');
const readPlan = (file: string): BuildPlan => BuildPlanSchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')));
const registryFor = registryLoader();

describe('published curated library', () => {
  const curated = fs.readdirSync(builds).filter((f) => f.endsWith('.json')).map((f) => readPlan(path.join(builds, f)));
  const beginner = fs.readdirSync(path.join(builds, 'beginner')).map((f) => readPlan(path.join(builds, 'beginner', f)));
  const log = fs.readFileSync(path.join(builds, 'REVIEW-LOG.md'), 'utf-8');
  const decisions = parseReviewDecisions(log);

  it('holds exactly the approved candidates (at least 12), each credited and with 0 validation errors', () => {
    const approved = decisions.filter((d) => d.decision === 'approve').map((d) => d.id).sort();
    expect(approved.length).toBeGreaterThanOrEqual(MIN_APPROVED);
    expect(curated.map((p) => p.id).sort()).toEqual(approved);
    expect(decisions.filter((d) => d.decision === 'pending')).toEqual([]);
    for (const p of curated) {
      expect(validateCuratedPlanGuard(p), p.id).toEqual({ valid: true });
      expect(p.source.kind === 'curated' && p.source.reviewedBy, p.id).toBe('Grant_P');
      expect(validatePlan(p, registryFor(p.gameVersion)).errors, p.id).toEqual([]);
    }
    expect(fs.existsSync(path.join(builds, '_candidates'))).toBe(false);
    expect(fs.existsSync(path.join(builds, '_review.md'))).toBe(false);
  });

  it('has one beginner variant per curated plan: adapted from it, at most 12 steps, valid', () => {
    expect(beginner.map((p) => p.id).sort()).toEqual(curated.map((p) => beginnerVariantId(p.id)).sort());
    for (const v of beginner) {
      const parent = curated.find((p) => v.source.kind === 'adapted' && p.id === v.source.fromPlanId);
      expect(parent, v.id).toBeDefined();
      expect(v.skill).toBe('beginner');
      expect(v.factionId).toBe(parent!.factionId);
      expect(v.steps.length).toBeLessThanOrEqual(BEGINNER_STEPS);
      expect(v.source.kind === 'adapted' && v.source.transforms.at(-1)).toBe(`simplify(${BEGINNER_STEPS})`);
      expect(validatePlan(v, registryFor(v.gameVersion)).errors, v.id).toEqual([]);
    }
  });

  it('covers both factions and every opening with a 1v1 and a team plan where the games had one', () => {
    const cells = new Set(curated.map((p) => `${p.factionId}:${p.opening}:${p.modes.includes('1v1') ? '1v1' : 'team'}`));
    for (const cell of ['armada:bot:1v1', 'armada:bot:team', 'armada:vehicle:1v1', 'armada:vehicle:team', 'armada:air:1v1', 'armada:air:team', 'cortex:bot:1v1', 'cortex:bot:team', 'cortex:vehicle:1v1', 'cortex:vehicle:team', 'cortex:air:team']) {
      expect(cells.has(cell), cell).toBe(true);
    }
  });
});
