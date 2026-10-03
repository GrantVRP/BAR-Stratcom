import type { BuildPlan } from '../schemas/plans';
import type { SimResult } from '../sim/types';
import type { LiveSnapshot } from '../schemas/live';
import type { Registry } from '../registry';
import type { BenchmarkFile } from '../schemas/benchmark';
import type { CoachState, Cue, CoachProjections } from '../schemas/coach';
import type { CoachHud, CoachEcho, CoachAssist } from '../schemas/protocol';
import type { FinishedLedger } from './ledger';
import { trackSteps } from './tracker';
import type { ProfileConfig } from './profiles';
import { ALERT_DETECTORS, type AlertCandidate } from './alerts';
import { type CoachMemory, updateAlertRules, resolveAudioCues } from './rules';
import { buildCoachHud } from './display';
import { CHAT_ECHO_COOLDOWN_SEC, ALL_ALERT_IDS } from './constants';

export interface EvaluateInput {
  plan: BuildPlan;
  planSim: SimResult;
  registry: Registry;
  now: LiveSnapshot;
  history: readonly LiveSnapshot[];
  finished: FinishedLedger;
  benchmark: BenchmarkFile | null;
  profile: ProfileConfig;
  memory: CoachMemory;
  mode: 'live' | 'manual' | 'demo';
  chatEchoEnabled?: boolean;
}

export interface CoachDisplay {
  protocol: 1;
  sessionId: string | null;
  mode: 'live' | 'manual' | 'off';
  generatedAtSec: number;
  hud: CoachHud;
  echo: CoachEcho[];
  assist: CoachAssist;
}

export interface EvaluateResult {
  state: CoachState;
  cues: Cue[];
  display: CoachDisplay;
  memory: CoachMemory;
}

/**
 * Top-level pure evaluation loop for the coach engine (04 §3.1).
 */
export function evaluate(input: EvaluateInput): EvaluateResult {
  const {
    plan,
    planSim,
    registry,
    now,
    history,
    finished,
    benchmark,
    profile,
    memory,
    mode,
    chatEchoEnabled = false
  } = input;

  const clock = now.gameSeconds;

  // 1. Step tracking
  const trackerResult = trackSteps({
    plan,
    planSim,
    finished,
    clock,
    registry,
    previouslyDueStepIds: memory.dueStepIds,
    previouslyDoneStepIds: memory.doneStepIds
  });

  // 2. Alert detection (only active in live or demo mode; manual mode has no live sensor alerts)
  const detectedCandidates: Partial<Record<string, AlertCandidate>> = {};

  if (mode === 'live' || mode === 'demo') {
    const alertCtx = {
      now,
      history,
      profile,
      plan,
      aheadBehindSec: trackerResult.aheadBehindSec,
      benchmark,
      registry,
      clock
    };

    for (const alertId of ALL_ALERT_IDS) {
      const detector = ALERT_DETECTORS[alertId];
      if (detector) {
        const candidate = detector(alertCtx);
        if (candidate) {
          detectedCandidates[alertId] = candidate;
        }
      }
    }
  }

  // 3. State machine update (sustain, 2s deactivation hysteresis, sound cooldown)
  const { activeAlerts, updatedAlertMemory, soundCandidateAlerts } = updateAlertRules(
    detectedCandidates,
    clock,
    memory
  );

  // 4. Audio cue limiting (8s global audio limit, priority: danger > warn > info > step)
  const { emittedCues, newLastGlobalAudioAt, soundedAlertIds } = resolveAudioCues(
    soundCandidateAlerts,
    trackerResult.cues,
    clock,
    memory.lastGlobalAudioAt
  );

  // Update lastSoundAt for any alert that won an audio slot
  for (const alertId of soundedAlertIds) {
    const memItem = updatedAlertMemory[alertId];
    if (memItem) {
      memItem.lastSoundAt = clock;
    }
  }

  // 5. Chat echo (only danger alerts and STEP_DUE, at most one echo per 10s)
  const echo: CoachEcho[] = [];
  let newLastChatEchoAt = memory.lastChatEchoAt;

  if (chatEchoEnabled && clock - memory.lastChatEchoAt >= CHAT_ECHO_COOLDOWN_SEC) {
    const dangerAlert = activeAlerts.find((a) => a.severity === 'danger');
    const stepDueCue = trackerResult.cues.find((c) => c.alertId === 'STEP_DUE');

    if (dangerAlert) {
      echo.push({ id: `echo-${dangerAlert.id}-${Math.round(clock)}`, text: dangerAlert.text });
      newLastChatEchoAt = clock;
    } else if (stepDueCue) {
      echo.push({ id: `echo-${stepDueCue.id}`, text: stepDueCue.text });
      newLastChatEchoAt = clock;
    }
  }

  // 6. Resource projections
  let energyEmptyInSec: number | null = null;
  let metalEmptyInSec: number | null = null;
  let metalFullInSec: number | null = null;
  let energyFullInSec: number | null = null;

  if (now.res) {
    const { energy, metal } = now.res;
    if (energy.pull > energy.income) {
      energyEmptyInSec = Math.max(0, energy.current / (energy.pull - energy.income));
    } else if (energy.income > energy.pull && energy.current < energy.storage) {
      energyFullInSec = Math.max(0, (energy.storage - energy.current) / (energy.income - energy.pull));
    }

    if (metal.pull > metal.income) {
      metalEmptyInSec = Math.max(0, metal.current / (metal.pull - metal.income));
    } else if (metal.income > metal.pull && metal.current < metal.storage) {
      metalFullInSec = Math.max(0, (metal.storage - metal.current) / (metal.income - metal.pull));
    }
  }

  const projections: CoachProjections = {
    energyEmptyInSec,
    metalEmptyInSec,
    metalFullInSec,
    energyFullInSec
  };

  // 7. State & Display models
  const state: CoachState = {
    mode,
    clock,
    planId: plan.id,
    steps: trackerResult.steps,
    currentStepIndex: trackerResult.currentStepIndex,
    aheadBehindSec: trackerResult.aheadBehindSec,
    alerts: activeAlerts,
    projections,
    profile: profile.id
  };

  const hud = buildCoachHud({
    plan,
    steps: trackerResult.steps,
    currentStepIndex: trackerResult.currentStepIndex,
    aheadBehindSec: trackerResult.aheadBehindSec,
    activeAlerts,
    registry,
    clock,
    factionId: now.me?.factionId ?? plan.factionId,
    visible: mode !== 'manual'
  });

  const currentPlanStep =
    trackerResult.currentStepIndex < plan.steps.length ? plan.steps[trackerResult.currentStepIndex] : null;

  const assist: CoachAssist = {
    armNext:
      currentPlanStep && currentPlanStep.unitId
        ? { unitId: currentPlanStep.unitId, stepId: currentPlanStep.id }
        : null,
    factoryQueue: null,
    enabled: {
      armNext: false,
      factoryQueue: false
    }
  };

  const display: CoachDisplay = {
    protocol: 1,
    sessionId: null,
    mode: mode === 'manual' ? 'manual' : 'live',
    generatedAtSec: clock,
    hud,
    echo,
    assist
  };

  const nextMemory: CoachMemory = {
    alerts: updatedAlertMemory,
    lastGlobalAudioAt: newLastGlobalAudioAt,
    lastChatEchoAt: newLastChatEchoAt,
    dueStepIds: trackerResult.dueStepIds,
    doneStepIds: trackerResult.doneStepIds
  };

  return {
    state,
    cues: emittedCues,
    display,
    memory: nextMemory
  };
}
