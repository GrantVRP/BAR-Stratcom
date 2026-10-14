import type { LiveSnapshot } from '../schemas/live';
import type { AlertId, AlertSeverity } from '../schemas/coach';
import type { Registry } from '../registry';
import type { BuildPlan } from '../schemas/plans';
import type { BenchmarkFile } from '../schemas/benchmark';
import type { SimResult } from '../sim/types';
import type { ProfileConfig } from './profiles';
import { FLOAT_OPENING_GRACE_SEC, PLAN_EXPECTED_STALL_WINDOW_SEC } from './constants';

export interface AlertCandidate {
  id: AlertId;
  severity: AlertSeverity;
  text: string;
  dedupeKey: string;
}

export interface AlertContext {
  now: LiveSnapshot;
  history: readonly LiveSnapshot[];
  profile: ProfileConfig;
  plan?: BuildPlan;
  planSim?: SimResult;
  aheadBehindSec?: number | null;
  benchmark?: BenchmarkFile | null;
  registry: Registry;
  clock: number;
}

/**
 * Checks whether a plan simulation already expects a stall of the given type within +/- 10s of now.
 */
export function isPlannedStall(
  planSim: SimResult | undefined,
  type: 'energy' | 'metal',
  clock: number
): boolean {
  if (!planSim) return false;
  const intervals = type === 'energy' ? planSim.intervals.energyStall : planSim.intervals.metalStall;
  for (const iv of intervals) {
    if (
      clock >= iv.start - PLAN_EXPECTED_STALL_WINDOW_SEC &&
      clock <= iv.end + PLAN_EXPECTED_STALL_WINDOW_SEC
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a predicate was true in every snapshot covering the last sustainSec.
 */
export function isSustained(
  predicate: (snap: LiveSnapshot) => boolean,
  now: LiveSnapshot,
  history: readonly LiveSnapshot[],
  sustainSec: number
): boolean {
  if (!predicate(now)) {
    return false;
  }
  if (sustainSec <= 0) {
    return true;
  }

  const cutoff = now.gameSeconds - sustainSec;
  if (cutoff < 0 && now.gameSeconds < sustainSec) {
    return false;
  }

  let coveredBackToCutoff = false;
  for (const snap of history) {
    if (snap.gameSeconds <= cutoff) {
      coveredBackToCutoff = true;
    }
    if (snap.gameSeconds >= cutoff) {
      if (!predicate(snap)) {
        return false;
      }
    }
  }

  return coveredBackToCutoff;
}

// 1. E_STALL_SOON
export function detectEStallSoon(ctx: AlertContext): AlertCandidate | null {
  const { now, profile, clock, planSim } = ctx;
  if (!profile.enabledAlerts.has('E_STALL_SOON') || !now.res) {
    return null;
  }
  if (isPlannedStall(planSim, 'energy', clock)) {
    return null;
  }

  const { current, pull, income, storage } = now.res.energy;
  const H = profile.thresholds.eStallSoonHorizonSec;
  const deficit = pull - income;
  const minDeficit = Math.max(5, 0.1 * income);

  // Significance: deficit >= max(5 E/s, 10% income) and current < 50% storage
  if (deficit >= minDeficit && current < 0.5 * storage && current - deficit * H <= 0) {
    const timeToEmpty = Math.max(1, Math.round(current / deficit));
    let text = `ENERGY EMPTY IN ${timeToEmpty}s`;
    if (profile.wording === 'plain') {
      text = 'BUILD ENERGY NOW';
    } else if (profile.wording === 'terse') {
      text = `E-STALL ${timeToEmpty}s`;
    }
    return {
      id: 'E_STALL_SOON',
      severity: 'warn',
      text,
      dedupeKey: 'E_STALL_SOON'
    };
  }
  return null;
}

// 2. E_STALLING
export function detectEStalling(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile, clock, planSim } = ctx;
  if (!profile.enabledAlerts.has('E_STALLING') || !now.res) {
    return null;
  }
  if (isPlannedStall(planSim, 'energy', clock)) {
    return null;
  }

  const check = (snap: LiveSnapshot) => {
    if (!snap.res) return false;
    const { current, storage, pull, income } = snap.res.energy;
    return current <= Math.max(1, 0.01 * storage) && pull > income + 0.5;
  };

  const S = profile.thresholds.eStallingSustainSec;
  if (isSustained(check, now, history, S)) {
    return {
      id: 'E_STALLING',
      severity: 'danger',
      text: 'ENERGY STALL',
      dedupeKey: 'E_STALLING'
    };
  }
  return null;
}

// 3. M_STALL_SOON
export function detectMStallSoon(ctx: AlertContext): AlertCandidate | null {
  const { now, profile, clock, planSim } = ctx;
  const H = profile.thresholds.mStallSoonHorizonSec;
  if (!profile.enabledAlerts.has('M_STALL_SOON') || H === null || !now.res) {
    return null;
  }
  if (isPlannedStall(planSim, 'metal', clock)) {
    return null;
  }

  const { current, pull, income, storage } = now.res.metal;
  const deficit = pull - income;
  const minDeficit = Math.max(1, 0.1 * income);

  // Significance: deficit >= max(1 M/s, 10% income) and current < 50% storage
  if (deficit >= minDeficit && current < 0.5 * storage && current - deficit * H <= 0) {
    const timeToEmpty = Math.max(1, Math.round(current / deficit));
    return {
      id: 'M_STALL_SOON',
      severity: 'info',
      text: `METAL EMPTY IN ${timeToEmpty}s`,
      dedupeKey: 'M_STALL_SOON'
    };
  }
  return null;
}

// 4. M_STALLING
export function detectMStalling(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile, clock, planSim } = ctx;
  if (!profile.enabledAlerts.has('M_STALLING') || !now.res) {
    return null;
  }
  if (isPlannedStall(planSim, 'metal', clock)) {
    return null;
  }

  const check = (snap: LiveSnapshot) => {
    if (!snap.res) return false;
    const { current, storage, pull, income } = snap.res.metal;
    return current <= Math.max(1, 0.01 * storage) && pull > income + 0.5;
  };

  const S = profile.thresholds.mStallingSustainSec;
  if (isSustained(check, now, history, S)) {
    return {
      id: 'M_STALLING',
      severity: 'warn',
      text: 'METAL STALL // TOO MUCH BP',
      dedupeKey: 'M_STALLING'
    };
  }
  return null;
}

// 5. M_FLOAT
export function detectMFloat(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile, clock } = ctx;
  // Opening grace: no M_FLOAT before 60s
  if (!profile.enabledAlerts.has('M_FLOAT') || !now.res || clock < FLOAT_OPENING_GRACE_SEC) {
    return null;
  }

  // Float alerts require income > 0 for the whole sustain window
  const check = (snap: LiveSnapshot) => {
    if (!snap.res) return false;
    const { current, storage, income } = snap.res.metal;
    return current >= 0.9 * storage && income > 0;
  };

  const S = profile.thresholds.mFloatSustainSec;
  if (isSustained(check, now, history, S)) {
    return {
      id: 'M_FLOAT',
      severity: 'warn',
      text: 'METAL FULL // SPEND IT',
      dedupeKey: 'M_FLOAT'
    };
  }
  return null;
}

// 6. E_FLOAT
export function detectEFloat(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile, clock } = ctx;
  const S = profile.thresholds.eFloatSustainSec;
  // Opening grace: no E_FLOAT before 60s and clock > 240
  if (
    !profile.enabledAlerts.has('E_FLOAT') ||
    S === null ||
    !now.res ||
    clock < FLOAT_OPENING_GRACE_SEC ||
    clock <= 240
  ) {
    return null;
  }

  // Float alerts require income > 0 for the whole sustain window
  const check = (snap: LiveSnapshot) => {
    if (!snap.res) return false;
    const { current, storage, income } = snap.res.energy;
    return current >= 0.95 * storage && income > 0;
  };

  if (isSustained(check, now, history, S)) {
    return {
      id: 'E_FLOAT',
      severity: 'info',
      text: 'ENERGY FULL // ADD BP/CONV',
      dedupeKey: 'E_FLOAT'
    };
  }
  return null;
}
