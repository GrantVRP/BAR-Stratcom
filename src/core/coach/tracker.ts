import type { CoachStep, CoachStepStatus, Cue } from '../schemas/coach';
import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { SimResult, SimStepResult } from '../sim/types';
import type { Registry } from '../registry';
import type { FinishedLedger } from './ledger';

export interface StepTrackerInput {
  plan: BuildPlan;
  planSim: SimResult;
  finished: FinishedLedger;
  clock: number;
  dueLeadSec?: number;
  registry?: Registry;
  manualDoneStepIds?: ReadonlySet<string>;
  skippedStepIds?: ReadonlySet<string>;
  previouslyDueStepIds?: ReadonlySet<string>;
  previouslyDoneStepIds?: ReadonlySet<string>;
}

export interface StepTrackerResult {
  steps: CoachStep[];
  currentStepIndex: number;
  aheadBehindSec: number | null;
  cues: Cue[];
  dueStepIds: Set<string>;
  doneStepIds: Set<string>;
}

interface StepWorkingItem {
  step: BuildStep;
  index: number;
  plannedStart: number;
  plannedFinish: number;
  isSkipped: boolean;
  isDone: boolean;
  actualFinish: number | null;
}

/**
 * Tracks build plan step progress against in-game finished ledger and clock.
 * Implements cumulative count requirements, out-of-order completion, non-build step auto-completion,
 * ahead/behind calculation, and single-emission due/done cues.
 */
export function trackSteps(input: StepTrackerInput): StepTrackerResult {
  const {
    plan,
    planSim,
    finished,
    clock,
    dueLeadSec = 10,
    registry,
    manualDoneStepIds,
    skippedStepIds,
    previouslyDueStepIds,
    previouslyDoneStepIds
  } = input;

  const simStepMap = new Map<string, SimStepResult>();
  for (const s of planSim.steps) {
    simStepMap.set(s.stepId, s);
  }

  // 1. Initial pass: planned times, manual done, skipped, and build step completions
  const cumulativeCount: Record<string, number> = {};
  const working: StepWorkingItem[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    if (!step) {
      continue;
    }

    const sim = simStepMap.get(step.id);
    const plannedStart = sim?.start ?? step.targetTime ?? 0;
    const plannedFinish = sim?.finish ?? step.targetTime ?? plannedStart;

    const isSkipped = Boolean(skippedStepIds?.has(step.id));
    let isDone = false;
    let actualFinish: number | null = null;

    if (!isSkipped) {
      if (manualDoneStepIds?.has(step.id)) {
        isDone = true;
        actualFinish = clock;
      } else if (step.action === 'build' && step.unitId) {
        const nextCount = (cumulativeCount[step.unitId] ?? 0) + step.count;
        cumulativeCount[step.unitId] = nextCount;
        const required = nextCount;
        const finishes = finished[step.unitId] ?? [];
        if (finishes.length >= required) {
          isDone = true;
          actualFinish = finishes[required - 1] ?? null;
        }
      }
    }

    working.push({
      step,
      index: i,
      plannedStart,
      plannedFinish,
      isSkipped,
      isDone,
      actualFinish
    });
  }

  // 2. Second pass: non-build step auto-completion (reclaim / assist / note)
  // Done when:
  // - a later build step is done, OR
  // - now >= plannedFinish + 10s, OR
  // - manual done (already checked)
  for (let i = 0; i < working.length; i++) {
    const item = working[i];
    if (!item || item.isSkipped || item.isDone || item.step.action === 'build') {
      continue;
    }

    // Check later build steps
    let laterBuildFinish: number | null = null;
    for (let j = i + 1; j < working.length; j++) {
      const candidate = working[j];
      if (
        candidate &&
        candidate.step.action === 'build' &&
        candidate.isDone &&
        candidate.actualFinish !== null
      ) {
        if (laterBuildFinish === null || candidate.actualFinish < laterBuildFinish) {
          laterBuildFinish = candidate.actualFinish;
        }
      }
    }

    if (laterBuildFinish !== null) {
      item.isDone = true;
      item.actualFinish = laterBuildFinish;
    } else if (clock >= item.plannedFinish + 10) {
      item.isDone = true;
      item.actualFinish = item.plannedFinish + 10;
    }
  }

  // 3. Status determination & currentStepIndex
  // "Steps may complete out of order; the current step is the first step that is not done."
  let currentStepIndex = working.findIndex((item) => !item.isSkipped && !item.isDone);
  if (currentStepIndex === -1) {
    currentStepIndex = working.length;
  }

  const coachSteps: CoachStep[] = working.map((item) => {
    let status: CoachStepStatus;
    if (item.isSkipped) {
      status = 'skipped';
    } else if (item.isDone) {
      status = 'done';
    } else if (item.index === currentStepIndex) {
      status = 'current';
    } else {
      status = 'upcoming';
    }

    return {
      stepId: item.step.id,
      status,
      plannedStart: item.plannedStart,
      plannedFinish: item.plannedFinish,
      actualFinish: item.actualFinish
    };
  });

  // 4. Ahead / Behind calculation
  // "if the current step is overdue (clock > plannedFinish(current)), the value is
  // plannedFinish(current) - clock (negative). Otherwise it is plannedFinish - actualFinish of the
  // most recently completed build step. Report whole seconds."
  let aheadBehindSec: number | null = null;
  const currentItem = currentStepIndex < working.length ? working[currentStepIndex] : null;

  if (currentItem && clock > currentItem.plannedFinish) {
    aheadBehindSec = Math.round(currentItem.plannedFinish - clock);
  } else {
    const completedBuildItems = working.filter(
      (item) => item.step.action === 'build' && item.isDone && item.actualFinish !== null
    );

    const firstCompleted = completedBuildItems[0];
    if (firstCompleted && firstCompleted.actualFinish !== null) {
      let mostRecent = firstCompleted;
      for (let i = 1; i < completedBuildItems.length; i++) {
        const candidate = completedBuildItems[i];
        if (candidate && candidate.actualFinish !== null && mostRecent.actualFinish !== null) {
          if (
            candidate.actualFinish > mostRecent.actualFinish ||
            (candidate.actualFinish === mostRecent.actualFinish && candidate.index > mostRecent.index)
          ) {
            mostRecent = candidate;
          }
        }
      }
      aheadBehindSec = Math.round(mostRecent.plannedFinish - mostRecent.actualFinish!);
    }
  }

  // 5. Cue emission
  const dueStepIds = new Set<string>(previouslyDueStepIds ?? []);
  const doneStepIds = new Set<string>(previouslyDoneStepIds ?? []);
  const cues: Cue[] = [];

  for (const item of working) {
    if (item.isSkipped) {
      continue;
    }

    const unitDefName = item.step.unitId;
    const humanName = unitDefName && registry ? registry.get(unitDefName)?.name : undefined;
    const targetName = humanName ?? unitDefName;

    // STEP_DUE: emitted once when clock >= plannedStart - dueLeadSec and not already done
    if (!item.isDone && clock >= item.plannedStart - dueLeadSec) {
      if (!dueStepIds.has(item.step.id)) {
        dueStepIds.add(item.step.id);
        const text = item.step.text ?? (targetName ? `${item.step.count}x ${targetName}` : item.step.action);
        cues.push({
          id: `cue-${item.step.id}-due`,
          alertId: 'STEP_DUE',
          sound: 'step_due',
          text,
          at: clock
        });
      }
    }

    // STEP_DONE: emitted once when step completes
    if (item.isDone) {
      if (!doneStepIds.has(item.step.id)) {
        doneStepIds.add(item.step.id);
        const text = item.step.text
          ? `${item.step.text} done`
          : targetName
            ? `${item.step.count}x ${targetName} done`
            : `${item.step.action} done`;
        cues.push({
          id: `cue-${item.step.id}-done`,
          alertId: 'STEP_DONE',
          sound: 'step_done',
          text,
          at: clock
        });
      }
    }
  }

  return {
    steps: coachSteps,
    currentStepIndex,
    aheadBehindSec,
    cues,
    dueStepIds,
    doneStepIds
  };
}
