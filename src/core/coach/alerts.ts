import type { LiveSnapshot } from '../schemas/live';
import type { AlertId, AlertSeverity } from '../schemas/coach';
import { ANTI_AIR_UNIT_GROUPS } from './constants';
import { bandAt } from '../benchmarks';
import {
  type AlertCandidate,
  type AlertContext,
  isSustained,
  detectEStallSoon,
  detectEStalling,
  detectMStallSoon,
  detectMStalling,
  detectMFloat,
  detectEFloat
} from './alerts-res';

export * from './alerts-res';

// 7. IDLE_FACTORY
export function detectIdleFactory(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile } = ctx;
  if (!profile.enabledAlerts.has('IDLE_FACTORY')) {
    return null;
  }

  const check = (snap: LiveSnapshot) => snap.factories.idle >= 1;
  const S = profile.thresholds.idleFactorySustainSec;
  if (isSustained(check, now, history, S)) {
    const count = now.factories.idle;
    const text = count === 1 ? 'FACTORY IDLE' : `${count} FACTORIES IDLE`;
    return {
      id: 'IDLE_FACTORY',
      severity: 'warn',
      text,
      dedupeKey: 'IDLE_FACTORY'
    };
  }
  return null;
}

// 8. IDLE_BUILDERS
export function detectIdleBuilders(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile } = ctx;
  if (!profile.enabledAlerts.has('IDLE_BUILDERS')) {
    return null;
  }

  const check = (snap: LiveSnapshot) => snap.builders.idle >= 1;
  const S = profile.thresholds.idleBuildersSustainSec;
  if (isSustained(check, now, history, S)) {
    const count = now.builders.idle;
    return {
      id: 'IDLE_BUILDERS',
      severity: 'warn',
      text: `${count} CONSTRUCTOR(S) IDLE`,
      dedupeKey: 'IDLE_BUILDERS'
    };
  }
  return null;
}

// 9. IDLE_COMMANDER
export function detectIdleCommander(ctx: AlertContext): AlertCandidate | null {
  const { now, history, profile, clock } = ctx;
  if (!profile.enabledAlerts.has('IDLE_COMMANDER') || clock >= 600) {
    return null;
  }

  const check = (snap: LiveSnapshot) => snap.commander.alive && snap.commander.idle;
  const S = profile.thresholds.idleCommanderSustainSec;
  if (isSustained(check, now, history, S)) {
    return {
      id: 'IDLE_COMMANDER',
      severity: 'warn',
      text: 'COMMANDER IDLE',
      dedupeKey: 'IDLE_COMMANDER'
    };
  }
  return null;
}

// 10. BEHIND_PLAN
export function detectBehindPlan(ctx: AlertContext): AlertCandidate | null {
  const { aheadBehindSec, profile } = ctx;
  if (!profile.enabledAlerts.has('BEHIND_PLAN') || aheadBehindSec === null || aheadBehindSec === undefined) {
    return null;
  }

  const X = profile.thresholds.behindPlanThresholdSec;
  if (aheadBehindSec <= -X) {
    const severity: AlertSeverity = aheadBehindSec <= -2 * X ? 'warn' : 'info';
    return {
      id: 'BEHIND_PLAN',
      severity,
      text: `BEHIND PLAN ${Math.abs(aheadBehindSec)}s`,
      dedupeKey: 'BEHIND_PLAN'
    };
  }
  return null;
}

// 11. BENCHMARK_LOW
export function detectBenchmarkLow(ctx: AlertContext): AlertCandidate | null {
  const { now, benchmark, profile, clock } = ctx;
  if (!profile.enabledAlerts.has('BENCHMARK_LOW') || !benchmark || !now.res || clock < 180) {
    return null;
  }

  // At each full minute >= 180s
  const roundedSec = Math.round(clock);
  if (Math.abs(clock - roundedSec) > 0.5 || roundedSec % 60 !== 0) {
    return null;
  }

  // pro band of the player's faction + mode; none past the end of the recorded series
  const band = bandAt(benchmark, 'metalIncome', roundedSec);
  if (!band) {
    return null;
  }

  if (now.res.metal.income < band.p25) {
    return {
      id: 'BENCHMARK_LOW',
      severity: 'info',
      text: 'ECO BELOW PRO P25',
      dedupeKey: `BENCHMARK_LOW_${roundedSec}`
    };
  }
  return null;
}

// 12. SCOUT_REMINDER
export function detectScoutReminder(ctx: AlertContext): AlertCandidate | null {
  const { now, profile, plan, registry, clock } = ctx;
  if (!profile.enabledAlerts.has('SCOUT_REMINDER')) {
    return null;
  }

  const isSmallMode = !plan?.modes || plan.modes.some((m) => m === '1v1' || m === 'small-team');
  if (!isSmallMode) {
    return null;
  }

  const T = profile.thresholds.scoutReminderTimeSec;
  if (clock < T) {
    return null;
  }

  let hasScoutOrRadar = false;
  for (const [unitDefId, count] of Object.entries(now.counts)) {
    if (count.alive <= 0) continue;
    const unit = registry.get(unitDefId);
    if (!unit) continue;
    if (unit.isBuilding && unit.combat.radarDistance > 0) {
      hasScoutOrRadar = true;
      break;
    }
    if (registry.classify(unitDefId) === 'scout') {
      hasScoutOrRadar = true;
      break;
    }
  }

  if (!hasScoutOrRadar) {
    return {
      id: 'SCOUT_REMINDER',
      severity: 'info',
      text: 'GET RADAR / SCOUT',
      dedupeKey: 'SCOUT_REMINDER'
    };
  }
  return null;
}

// 13. ENEMY_AIR_NO_AA
export function detectEnemyAirNoAa(ctx: AlertContext): AlertCandidate | null {
  const { now, profile, registry } = ctx;
  if (!profile.enabledAlerts.has('ENEMY_AIR_NO_AA')) {
    return null;
  }

  let enemyAirPresent = false;
  for (const [unitDefId, count] of Object.entries(now.enemies)) {
    if (count <= 0) continue;
    const unit = registry.get(unitDefId);
    // Neutral units (wildlife/critters with factionId === null) are never enemies (T05.10 item 1)
    if (unit && unit.factionId !== null && unit.canFly) {
      enemyAirPresent = true;
      break;
    }
  }

  if (!enemyAirPresent) {
    return null;
  }

  let ownAaPresent = false;
  for (const [unitDefId, count] of Object.entries(now.counts)) {
    if (count.alive <= 0) continue;
    const unit = registry.get(unitDefId);
    if (unit && unit.unitGroup && ANTI_AIR_UNIT_GROUPS.has(unit.unitGroup)) {
      ownAaPresent = true;
      break;
    }
  }

  if (!ownAaPresent) {
    return {
      id: 'ENEMY_AIR_NO_AA',
      severity: 'warn',
      text: 'ENEMY AIR // BUILD AA',
      dedupeKey: 'ENEMY_AIR_NO_AA'
    };
  }
  return null;
}

export const ALERT_DETECTORS: Record<AlertId, (ctx: AlertContext) => AlertCandidate | null> = {
  E_STALL_SOON: detectEStallSoon,
  E_STALLING: detectEStalling,
  M_STALL_SOON: detectMStallSoon,
  M_STALLING: detectMStalling,
  M_FLOAT: detectMFloat,
  E_FLOAT: detectEFloat,
  IDLE_FACTORY: detectIdleFactory,
  IDLE_BUILDERS: detectIdleBuilders,
  IDLE_COMMANDER: detectIdleCommander,
  BEHIND_PLAN: detectBehindPlan,
  BENCHMARK_LOW: detectBenchmarkLow,
  SCOUT_REMINDER: detectScoutReminder,
  ENEMY_AIR_NO_AA: detectEnemyAirNoAa
};
