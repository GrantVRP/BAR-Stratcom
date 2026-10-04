import type { SessionReportMetrics, IncomePoint } from '../schemas/report';
import type { StateDoc } from '../schemas/protocol';
import type { LiveSnapshot } from '../schemas/live';
import type { ComputeMetricsOptions } from './types';
import {
  ANALYSIS_HORIZON_SEC,
  COMMANDER_IDLE_HORIZON_SEC,
  STALL_STORAGE_RATIO,
  STALL_MIN_CURRENT,
  METAL_FLOAT_STORAGE_RATIO,
  ENERGY_FLOAT_STORAGE_RATIO
} from './constants';

function isFactoryFallback(defId: string): boolean {
  const lower = defId.toLowerCase();
  return (
    lower.includes('lab') ||
    lower.includes('vp') ||
    lower.includes('ap') ||
    lower.includes('hp') ||
    lower.includes('plat')
  );
}

function isT2Fallback(defId: string): boolean {
  const lower = defId.toLowerCase();
  return (
    lower.includes('alab') ||
    lower.includes('avp') ||
    lower.includes('aap') ||
    lower.includes('ahp') ||
    lower.includes('aplat')
  );
}

function getOwnTeamRes(snap: StateDoc | LiveSnapshot, myTeamId: number) {
  if (snap.res) {
    return snap.res;
  }
  if (snap.teams) {
    const t = snap.teams.find((tm) => tm.teamId === myTeamId);
    if (t?.res) {
      return t.res;
    }
  }
  return null;
}

function getOwnTeamUnits(snap: StateDoc | LiveSnapshot) {
  return {
    builders: snap.builders ?? { total: 0, idle: 0 },
    factories: snap.factories ?? { total: 0, idle: 0 },
    commander: snap.commander ?? { alive: false, idle: false },
    bp: snap.bp ?? { total: 0, active: 0 }
  };
}

/**
 * Computes post-match summary metrics from session states and events (04 §4.1, T07.2).
 * Capped at 900 s unless noted.
 */
export function computeMetrics(options: ComputeMetricsOptions): SessionReportMetrics {
  const { meta, states, events, registry, teamId: explicitTeamId } = options;

  const myTeam = meta.teams.find((t) => t.isMe) ?? meta.teams[0];
  const myTeamId = explicitTeamId ?? myTeam?.teamId ?? 0;

  const rawDuration = Math.max(0, meta.durationSec);
  const durationSec = Math.round(Math.min(ANALYSIS_HORIZON_SEC, rawDuration) * 10) / 10;
  const maxSec = Math.floor(durationSec);

  // Bucket snapshots by integer gameSeconds
  const secMap = new Map<number, StateDoc | LiveSnapshot>();
  for (const snap of states) {
    if (snap.gameSeconds < 0 || snap.gameSeconds > ANALYSIS_HORIZON_SEC) {
      continue;
    }
    const s = Math.floor(snap.gameSeconds);
    secMap.set(s, snap);
  }

  let energyStallSec = 0;
  let metalStallSec = 0;
  let metalFloatSec = 0;
  let energyFloatSec = 0;
  let idleFactorySec = 0;
  let idleBuilderSec = 0;
  let idleCommanderSec = 0;
  const bpSamples: number[] = [];

  // Evaluate each 1-second interval
  const startSec = maxSec === 0 ? 0 : 1;
  let lastKnownSnap: StateDoc | LiveSnapshot | null = secMap.get(0) ?? null;

  for (let s = startSec; s <= maxSec; s++) {
    const snap: StateDoc | LiveSnapshot | null = secMap.get(s) ?? lastKnownSnap;
    if (!snap) continue;
    lastKnownSnap = snap;

    const res = getOwnTeamRes(snap, myTeamId);
    if (res) {
      const eStorage = res.energy.storage;
      const eCurrent = res.energy.current;
      const ePull = res.energy.pull;
      const eIncome = res.energy.income;
      if (
        eCurrent <= Math.max(STALL_MIN_CURRENT, STALL_STORAGE_RATIO * eStorage) &&
        ePull > eIncome
      ) {
        energyStallSec++;
      }
      if (eCurrent >= ENERGY_FLOAT_STORAGE_RATIO * eStorage) {
        energyFloatSec++;
      }

      const mStorage = res.metal.storage;
      const mCurrent = res.metal.current;
      const mPull = res.metal.pull;
      const mIncome = res.metal.income;
      if (
        mCurrent <= Math.max(STALL_MIN_CURRENT, STALL_STORAGE_RATIO * mStorage) &&
        mPull > mIncome
      ) {
        metalStallSec++;
      }
      if (mCurrent >= METAL_FLOAT_STORAGE_RATIO * mStorage) {
        metalFloatSec++;
      }
    }

    const units = getOwnTeamUnits(snap);
    idleFactorySec += units.factories.idle;
    idleBuilderSec += units.builders.idle;

    if (s <= COMMANDER_IDLE_HORIZON_SEC && units.commander.alive && units.commander.idle) {
      idleCommanderSec++;
    }

    if (units.bp.total > 0) {
      bpSamples.push(units.bp.active / units.bp.total);
    }
  }

  const bpUtilisation =
    bpSamples.length > 0
      ? Math.max(0, Math.min(1, bpSamples.reduce((a, b) => a + b, 0) / bpSamples.length))
      : 0;

  // Factory finish times from events
  let timeToFirstFactory: number | null = null;
  let timeToT2: number | null = null;

  for (const ev of events) {
    if (ev.e !== 'finished') continue;
    if (ev.tm !== myTeamId && explicitTeamId != null) continue;

    const unit = registry?.get(ev.d);
    const isFactory = unit ? unit.isFactory : isFactoryFallback(ev.d);
    if (isFactory) {
      const sec = Math.round(ev.f / 30);
      if (timeToFirstFactory === null) {
        timeToFirstFactory = sec;
      }
      const isT2 = (unit && unit.techLevel != null && unit.techLevel >= 2) || isT2Fallback(ev.d);
      if (isT2 && timeToT2 === null) {
        timeToT2 = sec;
      }
    }
  }

  // Income points at 180, 300, 480, 600 seconds
  const targetCheckpoints = [180, 300, 480, 600] as const;
  const incomeAt: Record<'180' | '300' | '480' | '600', IncomePoint | null> = {
    '180': null,
    '300': null,
    '480': null,
    '600': null
  };

  for (const cp of targetCheckpoints) {
    if (cp <= maxSec) {
      const snap = secMap.get(cp);
      if (snap) {
        const res = getOwnTeamRes(snap, myTeamId);
        if (res) {
          incomeAt[String(cp) as '180' | '300' | '480' | '600'] = {
            metal: Math.round(res.metal.income * 100) / 100,
            energy: Math.round(res.energy.income * 100) / 100
          };
        }
      }
    }
  }

  return {
    durationSec,
    energyStallSec,
    metalStallSec,
    metalFloatSec,
    energyFloatSec,
    idleFactorySec,
    idleBuilderSec,
    idleCommanderSec,
    bpUtilisation: Math.round(bpUtilisation * 1000) / 1000,
    timeToFirstFactory,
    timeToT2,
    incomeAt
  };
}
