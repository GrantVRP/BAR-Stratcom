import type { Profile } from '../schemas/common';
import type { AlertId } from '../schemas/coach';
import type { AlertSettingOverrides } from '../schemas/settings';
import { ALL_ALERT_IDS } from './constants';

export interface AlertThresholds {
  eStallSoonHorizonSec: number;
  eStallingSustainSec: number;
  mStallSoonHorizonSec: number | null;
  mStallingSustainSec: number;
  mFloatSustainSec: number;
  eFloatSustainSec: number | null;
  idleFactorySustainSec: number;
  idleBuildersSustainSec: number;
  idleCommanderSustainSec: number;
  behindPlanThresholdSec: number;
  benchmarkLowEnabled: boolean;
  scoutReminderTimeSec: number;
  enemyAirNoAaEnabled: boolean;
}

export type ProfileWording = 'plain' | 'standard' | 'terse';

export interface ProfileConfig {
  id: Profile;
  thresholds: AlertThresholds;
  tolerances: {
    adherenceSec: 30 | 20 | 12;
  };
  enabledAlerts: Set<AlertId>;
  wording: ProfileWording;
}

export const BEGINNER_PROFILE: ProfileConfig = {
  id: 'beginner',
  thresholds: {
    eStallSoonHorizonSec: 10,
    eStallingSustainSec: 2,
    mStallSoonHorizonSec: null, // off
    mStallingSustainSec: 10,
    mFloatSustainSec: 8,
    eFloatSustainSec: null, // off
    idleFactorySustainSec: 8, // estimated: rally & production transitions take 5-8s
    idleBuildersSustainSec: 10, // estimated: walking between build sites takes 8-10s
    idleCommanderSustainSec: 8, // estimated: commander positioning takes 5-8s
    behindPlanThresholdSec: 20,
    benchmarkLowEnabled: false, // off
    scoutReminderTimeSec: 150,
    enemyAirNoAaEnabled: true
  },
  tolerances: {
    adherenceSec: 30
  },
  enabledAlerts: new Set(
    ALL_ALERT_IDS.filter((id) => id !== 'M_STALL_SOON' && id !== 'E_FLOAT' && id !== 'BENCHMARK_LOW')
  ),
  wording: 'plain'
};

export const INTERMEDIATE_PROFILE: ProfileConfig = {
  id: 'intermediate',
  thresholds: {
    eStallSoonHorizonSec: 6, // estimated: 6s horizon with deficit requirement catches real stalls without blip noise
    eStallingSustainSec: 2,
    mStallSoonHorizonSec: null, // advanced-only (spending metal is good play in BAR)
    mStallingSustainSec: 8,
    mFloatSustainSec: 10,
    eFloatSustainSec: 20,
    idleFactorySustainSec: 8, // estimated: 8s allows factory rally & production transitions without noisy alerts
    idleBuildersSustainSec: 10, // estimated: constructors walking between build locations on large maps take 8-10s
    idleCommanderSustainSec: 8, // estimated: commander walking/repositioning takes 5-8s
    behindPlanThresholdSec: 15,
    benchmarkLowEnabled: true,
    scoutReminderTimeSec: 180,
    enemyAirNoAaEnabled: true
  },
  tolerances: {
    adherenceSec: 20
  },
  enabledAlerts: new Set(ALL_ALERT_IDS.filter((id) => id !== 'M_STALL_SOON')),
  wording: 'standard'
};

export const ADVANCED_PROFILE: ProfileConfig = {
  id: 'advanced',
  thresholds: {
    eStallSoonHorizonSec: 6,
    eStallingSustainSec: 2,
    mStallSoonHorizonSec: 6,
    mStallingSustainSec: 5,
    mFloatSustainSec: 12,
    eFloatSustainSec: 20,
    idleFactorySustainSec: 3,
    idleBuildersSustainSec: 4,
    idleCommanderSustainSec: 3,
    behindPlanThresholdSec: 10,
    benchmarkLowEnabled: true,
    scoutReminderTimeSec: 180,
    enemyAirNoAaEnabled: true
  },
  tolerances: {
    adherenceSec: 12
  },
  enabledAlerts: new Set(ALL_ALERT_IDS),
  wording: 'terse'
};

export const DEFAULT_PROFILES: Record<Profile, ProfileConfig> = {
  beginner: BEGINNER_PROFILE,
  intermediate: INTERMEDIATE_PROFILE,
  advanced: ADVANCED_PROFILE
};

export function getProfileConfig(profile: Profile, overrides?: Partial<ProfileConfig>): ProfileConfig {
  const base = DEFAULT_PROFILES[profile];
  if (!overrides) {
    return {
      ...base,
      enabledAlerts: new Set(base.enabledAlerts),
      thresholds: { ...base.thresholds },
      tolerances: { ...base.tolerances }
    };
  }

  return {
    id: overrides.id ?? base.id,
    thresholds: { ...base.thresholds, ...overrides.thresholds },
    tolerances: { ...base.tolerances, ...overrides.tolerances },
    enabledAlerts: overrides.enabledAlerts ? new Set(overrides.enabledAlerts) : new Set(base.enabledAlerts),
    wording: overrides.wording ?? base.wording
  };
}

/** False when the profile has no threshold for the alert, so switching it on could never fire it. */
export function profileCanRunAlert(config: ProfileConfig, id: AlertId): boolean {
  if (id === 'M_STALL_SOON') return config.thresholds.mStallSoonHorizonSec !== null;
  if (id === 'E_FLOAT') return config.thresholds.eFloatSustainSec !== null;
  return true;
}

/**
 * The profile the coach runs: Settings → Coach
 * skill profile, with the per-alert switches there turning its alerts on or off.
 */
export function coachProfile(profile: Profile, alerts: AlertSettingOverrides = {}): ProfileConfig {
  const config = getProfileConfig(profile);
  for (const id of ALL_ALERT_IDS) {
    const enabled = alerts[id]?.enabled;
    if (enabled === false) config.enabledAlerts.delete(id);
    else if (enabled === true && profileCanRunAlert(config, id)) config.enabledAlerts.add(id);
  }
  return config;
}
