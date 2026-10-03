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
