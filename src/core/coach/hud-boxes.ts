import type { Alert, CoachStep } from '../schemas/coach';
import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { CoachHudAlert, CoachHudBox, CoachHudLine, CoachHudMeta } from '../schemas/protocol';
import type { Registry } from '../registry';
import { fitText, timeSuffix, unitLabel } from './hud-text';
import { pendingBuilderSteps, pendingFactoryBuilds } from './queues';

/**
 * The HUD boxes (owner requests T09.3/T09.4). Every box follows one pattern, so the player learns it
 * once: a quiet header, one big row (the entry point: what to do now), then up to three smaller rows
 * (what comes after), each with who builds it on the left and when on the right. Colour only carries
 * meaning: a row's timing turns warn when it is late and danger after 15 s.
 */
export const HUD_BOX_ROWS = 4;
const LATE_DANGER_SEC = 15;
/** Name lengths that fit the widget's columns at the big (20 px) and queue (15 px) sizes. */
const BIG_TEXT_MAX = 24;
const ROW_TEXT_MAX = 28;

const ACTION_LABEL: Record<BuildStep['action'], string> = { build: 'Build', reclaim: 'Reclaim', assist: 'Assist', note: 'Note' };

function sameActor(a: BuildStep['actor'], b: BuildStep['actor']): boolean {
  if (a.kind === 'commander' || b.kind === 'commander') return a.kind === b.kind;
  return a.kind === b.kind && a.unitId === b.unitId && a.index === b.index;
}

/**
 * Who builds a step, the same words the app uses (Coach view): CDR, CON, FAC, numbered from the second
 * of a kind (CON#2, FAC#2).
 */
export function actorTag(actor: BuildStep['actor']): string {
  if (actor.kind === 'commander') return 'CDR';
  const base = actor.kind === 'factory' ? 'FAC' : 'CON';
  return actor.index > 1 ? `${base}#${actor.index}` : base;
}

interface Group {
  first: BuildStep;
  count: number;
}

/** Consecutive builds of the same unit by the same actor become one row; at most `limit` rows. */
function groupRows(steps: readonly BuildStep[], limit: number): Group[] {
  const out: Group[] = [];
  for (const step of steps) {
    const last = out[out.length - 1];
    const merges =
      last && step.action === 'build' && last.first.action === 'build' && last.first.unitId === step.unitId && sameActor(last.first.actor, step.actor);
    if (merges) {
      last.count += step.count;
      continue;
    }
    if (out.length === limit) break;
    out.push({ first: step, count: step.count });
  }
  return out;
}

function row(group: Group, big: boolean, coachSteps: ReadonlyMap<string, CoachStep>, registry: Registry, clock: number): CoachHudLine {
  const step = group.first;
  const isBuild = step.action === 'build' && !!step.unitId;
  const text = isBuild ? `${group.count}× ${unitLabel(registry, step.unitId!)}` : (step.text ?? ACTION_LABEL[step.action]);
  const coachStep = coachSteps.get(step.id);
  const late = coachStep ? clock - coachStep.plannedFinish : 0;
  return {
    text: fitText(text, big ? BIG_TEXT_MAX : ROW_TEXT_MAX),
    tone: late > LATE_DANGER_SEC ? 'danger' : late > 0 ? 'warn' : 'info',
    ...(big ? { big: true } : {}),
    ...(coachStep ? { right: timeSuffix(coachStep, clock) } : {}),
    tag: actorTag(step.actor),
    ...(big && isBuild ? { unitId: step.unitId } : {})
  };
}

/** Plan pace for a box header: "3s AHEAD", "ON TIME", "12s BEHIND" (danger from 20 s behind). */
export function paceMeta(aheadBehindSec: number | null): CoachHudMeta | null {
  if (aheadBehindSec === null) return null;
  if (aheadBehindSec > 0) return { text: fitText(`${aheadBehindSec}s AHEAD`, 12), tone: 'good' };
  if (aheadBehindSec === 0) return { text: 'ON TIME', tone: 'info' };
  return { text: fitText(`${-aheadBehindSec}s BEHIND`, 12), tone: aheadBehindSec <= -20 ? 'danger' : 'warn' };
}

export interface BuildBoxInput {
  plan: BuildPlan;
  steps: readonly CoachStep[];
  currentStepIndex: number;
  aheadBehindSec: number | null;
  registry: Registry;
  clock: number;
}

/**
 * BUILDINGS: the commander's and constructors' next steps in plan order (the first is the HUD's NEXT
 * and what ARM NEXT BUILD arms); the header carries the plan's progress and pace.
 */
export function buildBuildBox(input: BuildBoxInput): CoachHudBox | null {
  const { plan, steps, currentStepIndex, aheadBehindSec, registry, clock } = input;
  if (steps.length === 0) return null;

  const done = steps.filter((s) => s.status === 'done').length;
  const pace = paceMeta(aheadBehindSec);
  const meta: CoachHudMeta[] = [{ text: `${done}/${steps.length}`, tone: 'info' }, ...(pace ? [pace] : [])];

  const coachSteps = new Map(steps.map((s) => [s.stepId, s]));
  const groups = groupRows(pendingBuilderSteps(plan, steps), HUD_BOX_ROWS);
  let lines: CoachHudLine[];
  if (groups.length > 0) lines = groups.map((g, i) => row(g, i === 0, coachSteps, registry, clock));
  else if (currentStepIndex >= steps.length) lines = [{ text: 'PLAN COMPLETE', tone: 'good', big: true }];
  else lines = [{ text: 'No buildings due', tone: 'info' }];
  return { title: 'BUILDINGS', meta, lines };
}

/** FACTORY: the next factory builds of every factory, in plan order; null when none is pending. */
export function buildFactoryBox(plan: BuildPlan, steps: readonly CoachStep[], registry: Registry, clock: number): CoachHudBox | null {
  const coachSteps = new Map(steps.map((s) => [s.stepId, s]));
  const groups = groupRows(pendingFactoryBuilds(plan, steps), HUD_BOX_ROWS);
  if (groups.length === 0) return null;
  return { title: 'FACTORY', lines: groups.map((g, i) => row(g, i === 0, coachSteps, registry, clock)) };
}

/** Up to two active alerts (severity first, as the coach sorts them), then a planned stall if room. */
export function buildHudAlerts(activeAlerts: readonly Alert[], plannedStall: 'energy' | 'metal' | null): CoachHudAlert[] {
  const alerts: CoachHudAlert[] = activeAlerts.slice(0, 2).map((a) => ({ text: fitText(a.text, 36), tone: a.severity }));
  if (alerts.length < 2 && plannedStall) alerts.push({ text: 'PLANNED STALL', tone: 'info' });
  return alerts;
}
