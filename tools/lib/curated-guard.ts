import fs from 'node:fs';
import path from 'node:path';
import type { BuildPlan } from '../../src/core/schemas';

export interface CuratedGuardResult {
  valid: boolean;
  reason?: string;
}

/**
 * Guard for curated build plans (T06.11).
 * Any plan in data/builds/** with source.kind === 'curated' must have:
 * 1. A replayId that is a real BAR replay id (32 lowercase hex characters).
 * 2. An 'approve' record in data/builds/REVIEW-LOG.md (written at H3/T08.9).
 * Before H3, no curated plans may exist.
 */
/** Candidate files written by tools/curate.ts (T08.3) and reviewed at H3. */
export function isCandidatePath(relPath: string): boolean {
  return relPath.replace(/\\/g, '/').includes('builds/_candidates/');
}

/**
 * Rule for data/builds/_candidates/*.json (T08.3): a curated source with a real BAR replay id, not yet
 * reviewed (reviewedBy / reviewedAt empty until H3). The app never lists these (PlanStore skips "_" folders).
 */
export function validateCandidatePlan(plan: BuildPlan): CuratedGuardResult {
  if (plan.source.kind !== 'curated') {
    return { valid: false, reason: `Candidate "${plan.id}" must have a curated source, got "${plan.source.kind}"` };
  }
  if (!/^[0-9a-f]{32}$/.test(plan.source.replayId)) {
    return { valid: false, reason: `Candidate "${plan.id}" has invalid replayId "${plan.source.replayId}"` };
  }
  if (plan.source.reviewedBy !== '' || plan.source.reviewedAt !== '') {
    return { valid: false, reason: `Candidate "${plan.id}" is marked reviewed; publish it with T08.9 instead` };
  }
  return { valid: true };
}

export function validateCuratedPlanGuard(
  plan: BuildPlan,
  buildsDir: string = path.resolve(process.cwd(), 'data/builds')
): CuratedGuardResult {
  if (plan.source.kind !== 'curated') {
    return { valid: true };
  }

  const replayId = plan.source.replayId;
  const validReplayId = typeof replayId === 'string' && /^[0-9a-f]{32}$/.test(replayId);
  if (!validReplayId) {
    return {
      valid: false,
      reason: `Plan "${plan.id}" has invalid replayId: expected 32 lowercase hex characters, got "${String(replayId)}"`
    };
  }

  const reviewLogPath = path.resolve(buildsDir, 'REVIEW-LOG.md');
  if (!fs.existsSync(reviewLogPath)) {
    return {
      valid: false,
      reason: `Plan "${plan.id}" is marked curated but REVIEW-LOG.md does not exist (no curated plans allowed before H3)`
    };
  }

  const logContent = fs.readFileSync(reviewLogPath, 'utf-8');
  const hasApproval = logContent.includes(plan.id) && logContent.toLowerCase().includes('approve');
  if (!hasApproval) {
    return {
      valid: false,
      reason: `Plan "${plan.id}" does not appear as "approve" in REVIEW-LOG.md`
    };
  }

  return { valid: true };
}
