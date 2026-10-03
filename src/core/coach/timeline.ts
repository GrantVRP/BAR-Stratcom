import type { BuildPlan } from '../schemas/plans';
import type { SimResult } from '../sim/types';
import type { LiveSnapshot } from '../schemas/live';
import type { WidgetEvent } from '../schemas/protocol';
import type { Registry } from '../registry';
import type { BenchmarkFile } from '../schemas/benchmark';
import type { ProfileConfig } from './profiles';
import { INTERMEDIATE_PROFILE } from './profiles';
import { createFinishedLedger, applyEventsToLedger, type FinishedLedger } from './ledger';
import { createInitialCoachMemory, type CoachMemory } from './rules';
import { evaluate } from './evaluate';
import { ALERT_MIN_VISIBLE_SEC, ALERT_REACTIVATION_WINDOW_SEC } from './constants';

export interface AlertInterval {
  id: string;
  startSec: number;
  endSec: number;
}

export interface CueRecord {
  atSec: number;
  alertId: string;
  sound: string;
  text: string;
}

export interface CoachScenarioTimeline {
  finalAheadBehindSec: number | null;
  alertIntervals: AlertInterval[];
  cues: CueRecord[];
}

export interface CoachTimeline {
  fixtureId: string;
  nominal: CoachScenarioTimeline;
  behind: CoachScenarioTimeline;
}

export interface ComputeScenarioOptions {
  plan: BuildPlan;
  planSim: SimResult;
  registry: Registry;
  states: readonly LiveSnapshot[];
  events: readonly WidgetEvent[];
  teamId?: number;
  profile?: ProfileConfig;
  benchmark?: BenchmarkFile | null;
}

/**
 * Derives a "behind" plan with every targetTime shifted earlier by deltaSec (05 §T05.9).
 * Steps with targetTime clamp to minimum 0.
 */
export function makeBehindPlan(plan: BuildPlan, deltaSec = 30): BuildPlan {
  return {
    ...plan,
    steps: plan.steps.map((s) => ({
      ...s,
      targetTime: s.targetTime !== undefined ? Math.max(0, s.targetTime - deltaSec) : undefined
    }))
  };
}

/**
 * Computes a compact CoachScenarioTimeline for a given fixture stream of states and events.
 * Evaluates at every state, tracking active alert intervals and audio cues.
 */
export function computeScenarioTimeline(options: ComputeScenarioOptions): CoachScenarioTimeline {
  const {
    plan,
    planSim,
    registry,
    states,
    events,
    teamId,
    profile = INTERMEDIATE_PROFILE,
    benchmark = null
  } = options;

  let ledger: FinishedLedger = createFinishedLedger();
  let memory: CoachMemory = createInitialCoachMemory();
  const history: LiveSnapshot[] = [];
  const cues: CueRecord[] = [];

  const intervals: AlertInterval[] = [];
  const activeIntervals = new Map<string, AlertInterval>();
  const lastCompletedInterval = new Map<string, AlertInterval>();

  let eventIdx = 0;
  let finalAheadBehindSec: number | null = null;

  for (const state of states) {
    // 1. Gather all events up to state.frame
    const batch: WidgetEvent[] = [];
    while (eventIdx < events.length && events[eventIdx]!.f <= state.frame) {
      batch.push(events[eventIdx]!);
      eventIdx++;
    }

    if (batch.length > 0) {
      ledger = applyEventsToLedger(ledger, batch, teamId);
    }

    // 2. Sliding history (last 60s)
    history.push(state);
    const cutoff = state.gameSeconds - 60;
    while (history.length > 0 && history[0]!.gameSeconds < cutoff) {
      history.shift();
    }

    // 3. Evaluate
    const evalResult = evaluate({
      plan,
      planSim,
      registry,
      now: state,
      history,
      finished: ledger,
      benchmark,
      profile,
      memory,
      mode: 'demo',
      chatEchoEnabled: true
    });

    memory = evalResult.memory;
    finalAheadBehindSec = evalResult.state.aheadBehindSec;

    // 4. Collect cues
    for (const cue of evalResult.cues) {
      cues.push({
        atSec: Math.round(cue.at),
        alertId: cue.alertId,
        sound: cue.sound,
        text: cue.text
      });
    }

    // 5. Update alert intervals with 15s reactivation extension and 5s min duration (T05.10 item 5)
    const activeIds = new Set<string>(evalResult.state.alerts.map((a) => a.id));
    const sec = Math.round(state.gameSeconds);

    // End intervals that are no longer active
    for (const [id, interval] of activeIntervals.entries()) {
      if (!activeIds.has(id)) {
        interval.endSec = Math.max(interval.endSec, interval.startSec + ALERT_MIN_VISIBLE_SEC);
        intervals.push(interval);
        lastCompletedInterval.set(id, interval);
        activeIntervals.delete(id);
      } else {
        interval.endSec = sec;
      }
    }

    // Start intervals for newly active alerts (or re-open if within 15s)
    for (const id of activeIds) {
      if (!activeIntervals.has(id)) {
        const last = lastCompletedInterval.get(id);
        if (last && sec - last.endSec <= ALERT_REACTIVATION_WINDOW_SEC) {
          const idx = intervals.indexOf(last);
          if (idx !== -1) {
            intervals.splice(idx, 1);
          }
          last.endSec = sec;
          activeIntervals.set(id, last);
        } else {
          activeIntervals.set(id, { id, startSec: sec, endSec: sec });
        }
      }
    }
  }

  // Close remaining intervals with min 5s duration
  for (const interval of activeIntervals.values()) {
    interval.endSec = Math.max(interval.endSec, interval.startSec + ALERT_MIN_VISIBLE_SEC);
    intervals.push(interval);
  }

  // Sort intervals by startSec then id
  intervals.sort((a, b) => a.startSec - b.startSec || a.id.localeCompare(b.id));

  return {
    finalAheadBehindSec,
    alertIntervals: intervals,
    cues
  };
}
