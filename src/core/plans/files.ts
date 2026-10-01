import type { Registry } from '../registry/types';
import { BuildPlanSchema, type BuildPlan, type BuildStep } from '../schemas/plans';
import { encodePlan } from '../sharecode';

const DISCORD_CHAR_LIMIT = 1900;

export type PlanFileResult = { ok: true; value: BuildPlan; plan: BuildPlan } | { ok: false; error: string };

/**
 * Serializes a BuildPlan to formatted JSON with 2-space indentation.
 */
export function planToFile(plan: BuildPlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

/**
 * Returns the canonical filename for a build plan export (<slug>.stratcom.json).
 */
export function planFileName(plan: BuildPlan): string {
  const slug =
    plan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'plan';
  return `${slug}.stratcom.json`;
}

/**
 * Deserializes and validates a JSON string into a BuildPlan.
 */
export function planFromFile(text: string): PlanFileResult {
  try {
    const parsed = JSON.parse(text);
    const result = BuildPlanSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, value: result.data, plan: result.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

function formatActor(step: BuildStep, registry?: Registry): string {
  const actor = step.actor;
  if (actor.kind === 'commander') {
    return 'Commander';
  }

  const def = registry?.get(actor.unitId);
  const baseName = def?.name ?? actor.unitId;
  return actor.index > 1 ? `${baseName} #${actor.index}` : baseName;
}

function formatStepAction(step: BuildStep, registry?: Registry): string {
  if (step.action === 'build') {
    const def = step.unitId ? registry?.get(step.unitId) : undefined;
    const name = def?.name ?? step.unitId ?? 'Unknown';
    return `${step.count}× ${name}`;
  }
  if (step.action === 'reclaim') {
    return 'Reclaim';
  }
  if (step.action === 'assist') {
    return 'Assist';
  }
  return step.text ? `Note: ${step.text}` : 'Note';
}

function formatStepLine(step: BuildStep, registry?: Registry): string {
  const target = step.targetTime ?? 0;
  const mins = Math.floor(target / 60);
  const secs = Math.floor(target % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const actorStr = formatActor(step, registry);
  const actionStr = formatStepAction(step, registry);

  return `${timeStr}  ${actorStr}  ${actionStr}`;
}

/**
 * Formats a build plan as plain Discord-ready text (<= 1900 characters).
 * Includes header line, step lines, and share code.
 * Truncates steps with "…+n more" if content exceeds the 1900-character budget.
 */
export function planToDiscordText(plan: BuildPlan, registry?: Registry): string {
  const header = `**${plan.title}** (${plan.factionId})`;
  const shareCode = encodePlan(plan);
  const stepLines = plan.steps.map((step) => formatStepLine(step, registry));

  const fullText = [header, ...stepLines, '', shareCode].join('\n');
  if (fullText.length <= DISCORD_CHAR_LIMIT) {
    return fullText;
  }

  for (let k = stepLines.length - 1; k >= 0; k--) {
    const remaining = stepLines.length - k;
    const truncatedText = [header, ...stepLines.slice(0, k), `…+${remaining} more`, '', shareCode].join('\n');

    if (truncatedText.length <= DISCORD_CHAR_LIMIT) {
      return truncatedText;
    }
  }

  const fallback = [header, `…+${stepLines.length} more`, '', shareCode].join('\n');
  return fallback.length <= DISCORD_CHAR_LIMIT ? fallback : fallback.slice(0, DISCORD_CHAR_LIMIT);
}
