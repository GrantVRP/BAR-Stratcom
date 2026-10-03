import type { Profile } from '../schemas/common';
import type { AlertId } from '../schemas/coach';
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
    idleFactorySustainSec: 5,
    idleBuildersSustainSec: 6,
    idleCommanderSustainSec: 5,
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
    eStallSoonHorizonSec: 8,
    eStallingSustainSec: 2,
    mStallSoonHorizonSec: 8,
    mStallingSustainSec: 8,
    mFloatSustainSec: 10,
    eFloatSustainSec: 20,
    idleFactorySustainSec: 5,
    idleBuildersSustainSec: 5,
    idleCommanderSustainSec: 4,
    behindPlanThresholdSec: 15,
    benchmarkLowEnabled: true,
    scoutReminderTimeSec: 180,
    enemyAirNoAaEnabled: true
  },
  tolerances: {
    adherenceSec: 20
  },
  enabledAlerts: new Set(ALL_ALERT_IDS),
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
