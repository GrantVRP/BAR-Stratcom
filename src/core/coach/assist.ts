import type { BuildPlan } from '../schemas/plans';
import type { CoachStep } from '../schemas/coach';
import type { CoachAssist } from '../schemas/protocol';
import type { AssistSettings } from '../schemas/settings';
import { ASSIST_QUEUE_MAX_UNITS } from './constants';
import { nextBuilderStep, nextFactoryRun } from './queues';

export interface CoachAssistInput {
  plan: BuildPlan;
  steps: readonly CoachStep[];
  /** Settings → Assist; both off by default. */
  enabled: AssistSettings;
}

/** Off: no payloads, both switches false (also what the widget sees when coaching stops). */
export const ASSIST_OFF: CoachAssist = { armNext: null, factoryQueue: null, enabled: { armNext: false, factoryQueue: false } };

/** The HUD's NEXT step (the commander's or a constructor's next step) when it is a build. */
function armNextPayload(plan: BuildPlan, steps: readonly CoachStep[]): CoachAssist['armNext'] {
  const step = nextBuilderStep(plan, steps);
  if (!step || step.action !== 'build' || !step.unitId) return null;
  return { unitId: step.unitId, stepId: step.id };
}

/** The HUD's factory box (`nextFactoryRun`), cut at 20 units. */
function factoryQueuePayload(plan: BuildPlan, steps: readonly CoachStep[]): CoachAssist['factoryQueue'] {
  const run = nextFactoryRun(plan, steps);
  if (!run) return null;

  const items: Array<{ unitId: string; count: number }> = [];
  let total = 0;
  for (const item of run.items) {
    const count = Math.min(item.count, ASSIST_QUEUE_MAX_UNITS - total);
    items.push({ unitId: item.unitId, count });
    total += count;
    if (total >= ASSIST_QUEUE_MAX_UNITS) break;
  }
  return { factoryUnitId: run.actor.unitId, items };
}

/** coach.json `assist`: payloads only for the switches the player turned on. */
export function buildCoachAssist(input: CoachAssistInput): CoachAssist {
  const { plan, steps, enabled } = input;
  return {
    armNext: enabled.armNext ? armNextPayload(plan, steps) : null,
    factoryQueue: enabled.factoryQueue ? factoryQueuePayload(plan, steps) : null,
    enabled: { armNext: enabled.armNext, factoryQueue: enabled.factoryQueue }
  };
}
