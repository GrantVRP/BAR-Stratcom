import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILES,
  BEGINNER_PROFILE,
  INTERMEDIATE_PROFILE,
  ADVANCED_PROFILE,
  getProfileConfig,
  coachProfile,
  profileCanRunAlert
} from './profiles';

describe('Coach Engine: Profiles', () => {
  it('defines default profiles with expected thresholds and disabled alerts', () => {
    expect(DEFAULT_PROFILES.beginner).toBe(BEGINNER_PROFILE);
    expect(DEFAULT_PROFILES.intermediate).toBe(INTERMEDIATE_PROFILE);
    expect(DEFAULT_PROFILES.advanced).toBe(ADVANCED_PROFILE);

    expect(BEGINNER_PROFILE.enabledAlerts.has('M_STALL_SOON')).toBe(false);
    expect(BEGINNER_PROFILE.enabledAlerts.has('E_FLOAT')).toBe(false);
    expect(BEGINNER_PROFILE.enabledAlerts.has('BENCHMARK_LOW')).toBe(false);

    expect(INTERMEDIATE_PROFILE.enabledAlerts.has('M_STALL_SOON')).toBe(false);
    expect(INTERMEDIATE_PROFILE.enabledAlerts.has('E_FLOAT')).toBe(true);
    expect(INTERMEDIATE_PROFILE.enabledAlerts.has('BENCHMARK_LOW')).toBe(true);

    expect(ADVANCED_PROFILE.enabledAlerts.has('M_STALL_SOON')).toBe(true);
    expect(ADVANCED_PROFILE.enabledAlerts.has('E_FLOAT')).toBe(true);
    expect(ADVANCED_PROFILE.enabledAlerts.has('BENCHMARK_LOW')).toBe(true);
  });

  it('merges user overrides over default profile', () => {
    const defaultBeg = getProfileConfig('beginner');
    expect(defaultBeg.id).toBe('beginner');
    expect(defaultBeg.wording).toBe('plain');

    const overridden = getProfileConfig('beginner', {
      wording: 'standard',
      thresholds: {
        ...BEGINNER_PROFILE.thresholds,
        eStallSoonHorizonSec: 15
      },
      enabledAlerts: new Set(['E_STALL_SOON'])
    });

    expect(overridden.wording).toBe('standard');
    expect(overridden.thresholds.eStallSoonHorizonSec).toBe(15);
    expect(overridden.enabledAlerts.has('E_STALL_SOON')).toBe(true);
    expect(overridden.enabledAlerts.has('E_STALLING')).toBe(false);
  });
});

// regression: the chosen skill profile and the per-alert switches never reached the coach,
// which always ran Intermediate with every default alert
describe('coachProfile (Settings → Coach)', () => {
  it('runs the chosen profile', () => {
    expect(coachProfile('advanced').thresholds).toEqual(ADVANCED_PROFILE.thresholds);
    expect(coachProfile('beginner').id).toBe('beginner');
  });

  it('a switch turns a profile alert off, or an off one on', () => {
    const config = coachProfile('intermediate', { IDLE_COMMANDER: { enabled: false }, BENCHMARK_LOW: { enabled: true } });
    expect(config.enabledAlerts.has('IDLE_COMMANDER')).toBe(false);
    expect(coachProfile('beginner', { BENCHMARK_LOW: { enabled: true } }).enabledAlerts.has('BENCHMARK_LOW')).toBe(true);
    // the shared profile objects stay untouched
    expect(INTERMEDIATE_PROFILE.enabledAlerts.has('IDLE_COMMANDER')).toBe(true);
  });

  it('cannot switch on an alert the profile has no threshold for', () => {
    expect(profileCanRunAlert(INTERMEDIATE_PROFILE, 'M_STALL_SOON')).toBe(false);
    expect(profileCanRunAlert(BEGINNER_PROFILE, 'E_FLOAT')).toBe(false);
    expect(profileCanRunAlert(ADVANCED_PROFILE, 'M_STALL_SOON')).toBe(true);
    expect(coachProfile('intermediate', { M_STALL_SOON: { enabled: true } }).enabledAlerts.has('M_STALL_SOON')).toBe(false);
  });
});
