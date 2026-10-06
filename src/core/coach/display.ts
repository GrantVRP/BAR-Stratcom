import type { CoachHud, CoachHudBox, CoachHudLine } from '../schemas/protocol';
import type { CoachStep, Alert } from '../schemas/coach';
import type { BuildPlan } from '../schemas/plans';
import type { Registry } from '../registry';
import { nextBuilderStep, nextFactoryRun } from './queues';

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

/** A unit's display name from the snapshot (warns once when the snapshot does not have it). */
function unitLabel(registry: Registry, unitId: string): string {
  const unit = registry.get(unitId);
  if (unit?.name) return unit.name;
  if (!warnedMissingUnits.has(unitId)) {
    warnedMissingUnits.add(unitId);
    console.warn(`[display] Unit '${unitId}' not found in registry`);
  }
  return 'Unknown unit';
}

/** "in m:ss" until the step should start or finish, "+m:ss" once it is late. */
function timeSuffix(step: CoachStep, clock: number): string {
  if (clock < step.plannedStart) return `in ${formatTimeMinutesSeconds(step.plannedStart - clock)}`;
  if (clock <= step.plannedFinish) return `in ${formatTimeMinutesSeconds(step.plannedFinish - clock)}`;
  return `+${formatTimeMinutesSeconds(clock - step.plannedFinish)}`;
}

/** prefix + description (shortened to fit) + right-aligned suffix, at most 36 characters. */
function paddedLine(prefix: string, desc: string, suffix: string): string {
  const spaceAvailable = 36 - prefix.length - 1 - suffix.length;
  let fitted = desc;
  if (spaceAvailable > 0 && desc.length > spaceAvailable) {
    fitted = `${desc.slice(0, spaceAvailable - 1)}…`;
  }
  const padding = Math.max(1, 36 - prefix.length - fitted.length - suffix.length);
  return truncateTo36(`${prefix}${fitted}${' '.repeat(padding)}${suffix}`);
}

/**
 * The factory box (owner request, T09.3): the first factory with pending builds and its next builds
 * (`nextFactoryRun`, the same run the LOAD FACTORY QUEUE assist queues), so the player can queue them
 * while the commander works on NEXT. The first line carries its timing and turns warn/danger when late.
 */
export function buildFactoryBox(plan: BuildPlan, steps: readonly CoachStep[], registry: Registry, clock: number): CoachHudBox | null {
  const run = nextFactoryRun(plan, steps);
  if (!run || run.items.length === 0) return null;

  const factory = unitLabel(registry, run.actor.unitId).toUpperCase();
  const title = truncateTo36(`FACTORY // ${factory}${run.actor.index > 1 ? ` ${run.actor.index}` : ''}`);
  const lines: CoachHudLine[] = run.items.slice(0, 4).map((item, i) => {
    const desc = `${item.count}× ${unitLabel(registry, item.unitId)}`;
    const coachStep = i === 0 ? steps.find((s) => s.stepId === item.stepId) : undefined;
    if (!coachStep) return { text: truncateTo36(desc), tone: 'info' };
    const late = clock - coachStep.plannedFinish;
    const tone: CoachHudLine['tone'] = late > 15 ? 'danger' : late > 0 ? 'warn' : 'info';
    return { text: paddedLine('', desc, timeSuffix(coachStep, clock)), tone, big: true };
  });
  return { title, lines };
}

/**
 * Builds the Coach HUD display model with at most 4 lines, each <= 36 chars, plus the factory box.
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
    factory: plan ? buildFactoryBox(plan, steps, registry, clock) : null
  };
}
