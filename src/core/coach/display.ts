import type { CoachHud, CoachHudLine } from '../schemas/protocol';
import type { CoachStep, Alert } from '../schemas/coach';
import type { BuildPlan } from '../schemas/plans';
import type { Registry } from '../registry';
import { nextBuilderStep } from './queues';
import { paddedLine, timeSuffix, truncateTo36, unitLabel } from './hud-text';
import { buildBuildBox, buildFactoryBox, buildHudAlerts, buildRadarBox } from './hud-boxes';

export { clearWarnedMissingUnits, formatTimeMinutesSeconds, truncateTo36 } from './hud-text';
export { buildFactoryBox } from './hud-boxes';

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
  /** Identified enemies in LOS by unit (state.json); the radar box lists them. */
  enemies?: Readonly<Record<string, number>>;
  enemySeenAt?: Readonly<Record<string, number>>;
}

/**
 * Builds the Coach HUD display model: the boxes widget 3.0.5+ draws (BUILDINGS, FACTORY, alerts; see
 * hud-boxes.ts) and, for older widgets, the single panel of at most 4 lines of <= 36 chars.
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
    plannedStall = null,
    enemies,
    enemySeenAt
  } = input;

  const lines: CoachHudLine[] = [];

  // Line 1 (big): the commander's or a constructor's next step; factory builds go to the factory box
  const builderStep = plan ? nextBuilderStep(plan, steps) : null;
  const builderCoachStep = builderStep ? steps.find((s) => s.stepId === builderStep.id) : undefined;

  if (builderStep && builderCoachStep) {
    const target = builderStep.unitId ? unitLabel(registry, builderStep.unitId) : (builderStep.text ?? builderStep.action);
    const countStr = builderStep.action === 'build' ? `${builderStep.count}× ` : '';

    let tone: CoachHudLine['tone'] = 'info';
    if (aheadBehindSec !== null) {
      if (aheadBehindSec > 0) tone = 'good';
      else if (aheadBehindSec < -15) tone = 'danger';
      else if (aheadBehindSec < 0) tone = 'warn';
    }

    lines.push({
      text: paddedLine('NEXT ', `${countStr}${target}`, timeSuffix(builderCoachStep, clock)),
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
    progress,
    build: plan ? buildBuildBox({ plan, steps, currentStepIndex, aheadBehindSec, registry, clock }) : null,
    factory: plan ? buildFactoryBox(plan, steps, registry, clock) : null,
    radar: enemies ? buildRadarBox(enemies, enemySeenAt ?? {}, registry, clock) : null,
    alerts: buildHudAlerts(activeAlerts, plannedStall)
  };
}
