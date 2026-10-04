import type { CoachHud, CoachHudLine } from '../schemas/protocol';
import type { CoachStep, Alert } from '../schemas/coach';
import type { BuildPlan } from '../schemas/plans';
import type { Registry } from '../registry';

export function formatTimeMinutesSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function truncateTo36(text: string): string {
  if (text.length <= 36) return text;
  return `${text.slice(0, 35)}…`;
}

const warnedMissingUnits = new Set<string>();

export function clearWarnedMissingUnits(): void {
  warnedMissingUnits.clear();
}

export interface BuildHudInput {
  plan?: BuildPlan | null;
  steps: readonly CoachStep[];
  currentStepIndex: number;
  aheadBehindSec: number | null;
  activeAlerts: readonly Alert[];
  registry: Registry;
  clock: number;
  factionId?: string | null;
  visible?: boolean;
  plannedStall?: 'energy' | 'metal' | null;
}

/**
 * Builds the Coach HUD display model with at most 4 lines, each <= 36 chars.
 */
export function buildCoachHud(input: BuildHudInput): CoachHud {
  const {
    plan,
    steps,
    currentStepIndex,
    aheadBehindSec,
    activeAlerts,
    registry,
    clock,
    factionId,
    visible = true,
    plannedStall = null
  } = input;

  const lines: CoachHudLine[] = [];

  // Line 1: Next step (big line)
  const currentStep = currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  const planStep = plan && currentStepIndex < plan.steps.length ? plan.steps[currentStepIndex] : null;

  if (currentStep && planStep) {
    let targetLabel: string;
    if (planStep.unitId) {
      const unit = registry.get(planStep.unitId);
      if (unit?.name) {
        targetLabel = unit.name;
      } else {
        targetLabel = 'Unknown unit';
        if (!warnedMissingUnits.has(planStep.unitId)) {
          warnedMissingUnits.add(planStep.unitId);
          console.warn(`[display] Unit '${planStep.unitId}' not found in registry`);
        }
      }
    } else {
      targetLabel = planStep.text ?? planStep.action;
    }

    const countStr = planStep.action === 'build' ? `${planStep.count}× ` : '';
    const desc = `${countStr}${targetLabel}`;

    let timeSuffix = '';
    if (clock < currentStep.plannedStart) {
      const wait = currentStep.plannedStart - clock;
      timeSuffix = `in ${formatTimeMinutesSeconds(wait)}`;
    } else if (clock <= currentStep.plannedFinish) {
      const remaining = currentStep.plannedFinish - clock;
      timeSuffix = `in ${formatTimeMinutesSeconds(remaining)}`;
    } else {
      const late = clock - currentStep.plannedFinish;
      timeSuffix = `+${formatTimeMinutesSeconds(late)}`;
    }

    // Format line: 'NEXT ' + desc + ' ' + timeSuffix
    // Must fit <= 36 chars
    const prefix = 'NEXT ';
    const spaceAvailable = 36 - prefix.length - 1 - timeSuffix.length;
    let truncatedDesc = desc;
    if (spaceAvailable > 0 && desc.length > spaceAvailable) {
      truncatedDesc = `${desc.slice(0, spaceAvailable - 1)}…`;
    }

    const padding = Math.max(1, 36 - prefix.length - truncatedDesc.length - timeSuffix.length);
    const lineText = truncateTo36(`${prefix}${truncatedDesc}${' '.repeat(padding)}${timeSuffix}`);

    let tone: CoachHudLine['tone'] = 'info';
    if (aheadBehindSec !== null) {
      if (aheadBehindSec > 0) tone = 'good';
      else if (aheadBehindSec < -15) tone = 'danger';
      else if (aheadBehindSec < 0) tone = 'warn';
    }

    lines.push({
      text: lineText,
      tone,
      big: true
    });
  } else if (steps.length > 0 && currentStepIndex >= steps.length) {
    lines.push({
      text: 'PLAN COMPLETE',
      tone: 'good',
      big: true
    });
  }

  // Line 2: Plan pace line
  if (plan && steps.length > 0) {
    let paceText = 'PLAN  ON TRACK';
    let paceTone: CoachHudLine['tone'] = 'info';

    if (aheadBehindSec !== null) {
      if (aheadBehindSec > 0) {
        paceText = `PLAN  +${aheadBehindSec}s AHEAD`;
        paceTone = 'good';
      } else if (aheadBehindSec === 0) {
        paceText = 'PLAN  ON TIME';
        paceTone = 'info';
      } else {
        paceText = `PLAN  -${Math.abs(aheadBehindSec)}s BEHIND`;
        paceTone = aheadBehindSec <= -20 ? 'danger' : 'warn';
      }
    }

    lines.push({
      text: truncateTo36(paceText),
      tone: paceTone
    });
  }

  // Lines 3 & 4: Top 2 active alerts (severity desc, then newest)
  const topAlerts = activeAlerts.slice(0, 2);
  for (const alert of topAlerts) {
    if (lines.length >= 4) break;

    const alertTone: CoachHudLine['tone'] =
      alert.severity === 'danger' ? 'danger' : alert.severity === 'warn' ? 'warn' : 'info';

    lines.push({
      text: truncateTo36(`⚠ ${alert.text}`),
      tone: alertTone
    });
  }

  // Quiet line for planned stall if active and line space permits (T05.10 item 3)
  if (lines.length < 4 && plannedStall) {
    lines.push({
      text: truncateTo36('ℹ PLANNED STALL'),
      tone: 'info'
    });
  }

  // HUD Title
  const factionName = (factionId ?? plan?.factionId ?? 'BAR').toUpperCase();
  const planTitle = plan?.title?.toUpperCase() ?? 'COACH';
  const rawTitle = `${factionName} // ${planTitle}`;
  const title = truncateTo36(rawTitle);

  // Progress
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progress = steps.length > 0 ? { done: doneCount, total: steps.length } : null;

  return {
    visible,
    title,
    lines,
    progress
  };
}
