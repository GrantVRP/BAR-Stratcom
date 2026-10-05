import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { CoachStep } from '../schemas/coach';
import type { CoachAssist } from '../schemas/protocol';
import type { AssistSettings } from '../schemas/settings';
import { ASSIST_QUEUE_MAX_UNITS } from './constants';

export interface CoachAssistInput {
  plan: BuildPlan;
  steps: readonly CoachStep[];
  currentStepIndex: number;
  /** Settings → Assist; both off by default (D-06). */
  enabled: AssistSettings;
}

/** Off: no payloads, both switches false (also what the widget sees when coaching stops). */
export const ASSIST_OFF: CoachAssist = { armNext: null, factoryQueue: null, enabled: { armNext: false, factoryQueue: false } };

const sameFactory = (a: BuildStep['actor'], b: BuildStep['actor']): boolean =>
  a.kind === 'factory' && b.kind === 'factory' && a.unitId === b.unitId && a.index === b.index;

/** The current step's unit when that step is a build by the commander or a builder. */
function armNextPayload(plan: BuildPlan, currentStepIndex: number): CoachAssist['armNext'] {
  const step = plan.steps[currentStepIndex];
  if (!step || step.action !== 'build' || !step.unitId || step.actor.kind === 'factory') return null;
  return { unitId: step.unitId, stepId: step.id };
}

/**
 * The first factory with a pending build step and its upcoming consecutive build steps (its own
 * steps in plan order until one that is not a build), merged per unit, at most 20 units.
 */
function factoryQueuePayload(plan: BuildPlan, steps: readonly CoachStep[]): CoachAssist['factoryQueue'] {
  const status = new Map(steps.map((s) => [s.stepId, s.status]));
  const pending = plan.steps.filter((s) => status.get(s.id) === 'current' || status.get(s.id) === 'upcoming');
  const first = pending.find((s) => s.actor.kind === 'factory' && s.action === 'build' && s.unitId);
  if (!first || first.actor.kind !== 'factory') return null;

  const items: Array<{ unitId: string; count: number }> = [];
  let total = 0;
  for (const step of pending.slice(pending.indexOf(first))) {
    if (!sameFactory(step.actor, first.actor)) continue;
    if (step.action !== 'build' || !step.unitId) break;
    const count = Math.min(step.count, ASSIST_QUEUE_MAX_UNITS - total);
    const last = items[items.length - 1];
    if (last && last.unitId === step.unitId) last.count += count;
    else items.push({ unitId: step.unitId, count });
    total += count;
    if (total >= ASSIST_QUEUE_MAX_UNITS) break;
  }
  return { factoryUnitId: first.actor.unitId, items };
}

/** coach.json `assist` (03 §7.6, T09.2): payloads only for the switches the player turned on. */
export function buildCoachAssist(input: CoachAssistInput): CoachAssist {
  const { plan, steps, currentStepIndex, enabled } = input;
  return {
    armNext: enabled.armNext ? armNextPayload(plan, currentStepIndex) : null,
    factoryQueue: enabled.factoryQueue ? factoryQueuePayload(plan, steps) : null,
    enabled: { armNext: enabled.armNext, factoryQueue: enabled.factoryQueue }
  };
}
