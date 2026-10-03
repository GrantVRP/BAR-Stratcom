import type { LiveSnapshot } from '../schemas/live';
import type { AlertId, AlertSeverity } from '../schemas/coach';
import type { Registry } from '../registry';
import type { BuildPlan } from '../schemas/plans';
import type { BenchmarkFile } from '../schemas/benchmark';
import type { ProfileConfig } from './profiles';

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
  aheadBehindSec?: number | null;
  benchmark?: BenchmarkFile | null;
  registry: Registry;
  clock: number;
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
  const { now, profile } = ctx;
  if (!profile.enabledAlerts.has('E_STALL_SOON') || !now.res) {
    return null;
  }

  const { current, pull, income } = now.res.energy;
  const H = profile.thresholds.eStallSoonHorizonSec;
  if (pull > income && current + (income - pull) * H <= 0) {
    const timeToEmpty = Math.max(1, Math.round(current / (pull - income)));
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
  const { now, history, profile } = ctx;
  if (!profile.enabledAlerts.has('E_STALLING') || !now.res) {
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
  const { now, profile } = ctx;
  const H = profile.thresholds.mStallSoonHorizonSec;
  if (!profile.enabledAlerts.has('M_STALL_SOON') || H === null || !now.res) {
    return null;
  }

  const { current, pull, income } = now.res.metal;
  if (pull > income && current + (income - pull) * H <= 0) {
    const timeToEmpty = Math.max(1, Math.round(current / (pull - income)));
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
  const { now, history, profile } = ctx;
  if (!profile.enabledAlerts.has('M_STALLING') || !now.res) {
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
  const { now, history, profile } = ctx;
  if (!profile.enabledAlerts.has('M_FLOAT') || !now.res) {
    return null;
  }

  const check = (snap: LiveSnapshot) => {
    if (!snap.res) return false;
    const { current, storage } = snap.res.metal;
    return current >= 0.9 * storage;
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
  if (!profile.enabledAlerts.has('E_FLOAT') || S === null || !now.res || clock <= 240) {
    return null;
  }

  const check = (snap: LiveSnapshot) => {
    if (!snap.res) return false;
    const { current, storage } = snap.res.energy;
    return current >= 0.95 * storage;
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
