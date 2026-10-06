import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { CoachStep } from '../schemas/coach';

type FactoryActor = Extract<BuildStep['actor'], { kind: 'factory' }>;

export interface FactoryRun {
  actor: FactoryActor;
  /** Consecutive builds of the same unit merged; `stepId` is the first step of each item. */
  items: Array<{ unitId: string; count: number; stepId: string }>;
}

/** Plan steps the tracker still expects (current or upcoming), in plan order. */
function pendingSteps(plan: BuildPlan, steps: readonly CoachStep[]): BuildStep[] {
  const status = new Map(steps.map((s) => [s.stepId, s.status]));
  return plan.steps.filter((s) => status.get(s.id) === 'current' || status.get(s.id) === 'upcoming');
}

/**
 * The next pending step for the commander or a constructor. Factory steps are left out: they run in
 * parallel and have their own queue (`nextFactoryRun`), so the player can work both at once.
 */
export function nextBuilderStep(plan: BuildPlan, steps: readonly CoachStep[]): BuildStep | null {
  return pendingSteps(plan, steps).find((s) => s.actor.kind !== 'factory') ?? null;
}

/**
 * The first factory with a pending build step and its upcoming builds: that factory's own steps in
 * plan order (other actors' steps skipped) until one that is not a build.
 */
export function nextFactoryRun(plan: BuildPlan, steps: readonly CoachStep[]): FactoryRun | null {
  const pending = pendingSteps(plan, steps);
  const first = pending.find((s) => s.actor.kind === 'factory' && s.action === 'build' && s.unitId);
  if (!first || first.actor.kind !== 'factory') return null;
  const actor = first.actor;

  const items: FactoryRun['items'] = [];
  for (const step of pending.slice(pending.indexOf(first))) {
    const a = step.actor;
    if (a.kind !== 'factory' || a.unitId !== actor.unitId || a.index !== actor.index) continue;
    if (step.action !== 'build' || !step.unitId) break;
    const last = items[items.length - 1];
    if (last && last.unitId === step.unitId) last.count += step.count;
    else items.push({ unitId: step.unitId, count: step.count, stepId: step.id });
  }
  return { actor, items };
}
