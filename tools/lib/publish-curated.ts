import fs from 'node:fs';
import path from 'node:path';
import { avgWindFor, findMapByScriptName } from '../../src/core/maps';
import { beginnerVariantId, makeBeginnerVariant } from '../../src/core/plans/simplify';
import { validatePlan } from '../../src/core/plans/validate';
import type { Registry } from '../../src/core/registry';
import { BuildPlanSchema, type BuildPlan, type MapRecord } from '../../src/core/schemas';
import { parseReviewDecisions } from './review-log';

export const MIN_APPROVED = 12;

export interface PublishOptions {
  /** data/builds */
  buildsDir: string;
  registryFor: (gameVersion: string) => Registry;
  maps: MapRecord[];
  windTable: Record<string, Record<string, number>> | null;
  /** Reviewer handle as given in STATUS (H3). */
  reviewer: string;
  /** YYYY-MM-DD of the review. */
  reviewedAt: string;
  /** ISO timestamp written into the beginner variants. */
  createdAt: string;
}

export interface PublishResult {
  curated: string[];
  beginner: string[];
  rejected: string[];
}

const write = (file: string, plan: BuildPlan): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`, 'utf-8');
};

/**
 * T08.9: publishes the candidates approved at H3. Approved → data/builds/<id>.json with the reviewer
 * credited; a beginner variant of each → data/builds/beginner/<id>-beginner.json; the candidates folder
 * is removed and the review sheet is kept as REVIEW-LOG.md. Refuses while any decision is open, below
 * 12 approvals, or when a published plan would have validation errors (nothing is written then).
 */
export function publishCurated(opts: PublishOptions): PublishResult {
  const reviewPath = path.join(opts.buildsDir, '_review.md');
  const candidatesDir = path.join(opts.buildsDir, '_candidates');
  if (!opts.reviewer.trim()) throw new Error('A reviewer handle is required (STATUS → H3)');
  const review = fs.readFileSync(reviewPath, 'utf-8');
  const decisions = parseReviewDecisions(review);
  const open = decisions.filter((d) => d.decision === 'pending');
  if (open.length > 0) throw new Error(`Review still open for #${open.map((d) => d.num).join(', #')}`);
  const approved = decisions.filter((d) => d.decision === 'approve');
  if (approved.length < MIN_APPROVED) throw new Error(`Only ${approved.length} approved; ${MIN_APPROVED} needed`);

  // build everything first, write only when all of it is valid
  const outputs: Array<{ file: string; plan: BuildPlan }> = [];
  for (const d of approved) {
    const candidate = BuildPlanSchema.parse(JSON.parse(fs.readFileSync(path.join(candidatesDir, `${d.id}.json`), 'utf-8')));
    if (candidate.source.kind !== 'curated') throw new Error(`${d.id} is not a curated candidate`);
    const curated: BuildPlan = { ...candidate, source: { ...candidate.source, reviewedBy: opts.reviewer.trim(), reviewedAt: opts.reviewedAt } };
    const registry = opts.registryFor(curated.gameVersion);
    const errors = validatePlan(curated, registry).errors;
    if (errors.length > 0) throw new Error(`${d.id}: ${errors[0]!.message}`);
    outputs.push({ file: path.join(opts.buildsDir, `${d.id}.json`), plan: curated });

    const map = findMapByScriptName(opts.maps, candidate.source.map);
    if (!map) throw new Error(`${d.id}: map "${candidate.source.map}" is not in data/maps`);
    const variant = makeBeginnerVariant({ curated, registry, map, avgWind: avgWindFor(map, opts.windTable), createdAt: opts.createdAt });
    if (!variant) throw new Error(`${d.id}: the adapter found no base plan`);
    if (variant.issues.errors.length > 0) throw new Error(`${beginnerVariantId(d.id)}: ${variant.issues.errors[0]!.message}`);
    outputs.push({ file: path.join(opts.buildsDir, 'beginner', `${variant.plan.id}.json`), plan: variant.plan });
  }

  for (const o of outputs) write(o.file, o.plan);
  fs.rmSync(candidatesDir, { recursive: true, force: true });
  const header = `<!-- Published in T08.9 on ${opts.reviewedAt}: ${approved.length} approved plans are data/builds/<id>.json (reviewer: ${opts.reviewer.trim()}), each with a beginner variant in data/builds/beginner/. -->\n\n`;
  fs.writeFileSync(path.join(opts.buildsDir, 'REVIEW-LOG.md'), header + review, 'utf-8');
  fs.rmSync(reviewPath);

  return {
    curated: approved.map((d) => d.id),
    beginner: approved.map((d) => beginnerVariantId(d.id)),
    rejected: decisions.filter((d) => d.decision === 'reject').map((d) => d.id)
  };
}
