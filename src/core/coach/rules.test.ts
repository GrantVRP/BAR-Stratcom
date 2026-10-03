import { describe, it, expect } from 'vitest';
import type { Alert } from '../schemas/coach';
import type { AlertCandidate } from './alerts';
import { createInitialCoachMemory, updateAlertRules, resolveAudioCues } from './rules';

describe('Coach Engine: Rules & Audio Limiting', () => {
  it('applies 5s min visible and 2s deactivation hysteresis on alerts', () => {
    let memory = createInitialCoachMemory();

    const candidate: AlertCandidate = {
      id: 'E_STALLING',
      severity: 'danger',
      text: 'ENERGY STALL',
      dedupeKey: 'E_STALLING'
    };

    // t = 10s: alert activates
    let res = updateAlertRules({ E_STALLING: candidate }, 10, memory);
    expect(res.activeAlerts).toHaveLength(1);
    expect(res.activeAlerts[0]!.id).toBe('E_STALLING');
    memory = { ...memory, alerts: res.updatedAlertMemory };

    // t = 11s: condition becomes false (<5s visible and <2s since last true)
    res = updateAlertRules({}, 11, memory);
    expect(res.activeAlerts).toHaveLength(1); // Still active under min visible & hysteresis!
    memory = { ...memory, alerts: res.updatedAlertMemory };

    // t = 14s: false for 4s, but visible only 4s (<5s min visible)
    res = updateAlertRules({}, 14, memory);
    expect(res.activeAlerts).toHaveLength(1);
    memory = { ...memory, alerts: res.updatedAlertMemory };

    // t = 15.1s: >= 5s visible and >= 2s since last true => deactivates!
    res = updateAlertRules({}, 15.1, memory);
    expect(res.activeAlerts).toHaveLength(0);
    memory = { ...memory, alerts: res.updatedAlertMemory };

    // t = 20s (4.9s after clearing <= 15s): reactivates!
    // Extends previous interval (since remains 10) and does NOT re-cue sound
    res = updateAlertRules({ E_STALLING: candidate }, 20, memory);
    expect(res.activeAlerts).toHaveLength(1);
    expect(res.activeAlerts[0]!.since).toBe(10);
    expect(res.soundCandidateAlerts).toHaveLength(0); // Suppressed sound on extension
  });

  it('enforces 20s audio cooldown for the same alert', () => {
    const memory = createInitialCoachMemory();
    const candidate: AlertCandidate = {
      id: 'IDLE_COMMANDER',
      severity: 'warn',
      text: 'COMMANDER IDLE',
      dedupeKey: 'IDLE_COMMANDER'
    };

    // t = 10s: alert activates and becomes a sound candidate
    const res1 = updateAlertRules({ IDLE_COMMANDER: candidate }, 10, memory);
    expect(res1.soundCandidateAlerts).toHaveLength(1);

    // Simulate sound played at 10s
    res1.updatedAlertMemory.IDLE_COMMANDER!.lastSoundAt = 10;
    const memAfterSound = { ...memory, alerts: res1.updatedAlertMemory };

    // t = 25s (15s elapsed): still within 20s cooldown => NO sound candidate
    const res2 = updateAlertRules({ IDLE_COMMANDER: candidate }, 25, memAfterSound);
    expect(res2.activeAlerts).toHaveLength(1);
    expect(res2.soundCandidateAlerts).toHaveLength(0);

    // t = 31s (21s elapsed): cooldown expired => can sound again!
    const res3 = updateAlertRules({ IDLE_COMMANDER: candidate }, 31, memAfterSound);
    expect(res3.soundCandidateAlerts).toHaveLength(1);
  });

  it('global audio limiter picks danger over warn within same window', () => {
    const dangerAlert: Alert = {
      id: 'E_STALLING',
      severity: 'danger',
      text: 'ENERGY STALL',
      since: 10,
      dedupeKey: 'E_STALLING'
    };

    const warnAlert: Alert = {
      id: 'IDLE_COMMANDER',
      severity: 'warn',
      text: 'COMMANDER IDLE',
      since: 10,
      dedupeKey: 'IDLE_COMMANDER'
    };

    // Both want to sound at clock = 10s (last audio at -Infinity)
    const res = resolveAudioCues([dangerAlert, warnAlert], [], 10, -Infinity);

    expect(res.emittedCues).toHaveLength(1);
    expect(res.emittedCues[0]!.sound).toBe('danger');
    expect(res.emittedCues[0]!.alertId).toBe('E_STALLING');
    expect(res.soundedAlertIds.has('E_STALLING')).toBe(true);
    expect(res.soundedAlertIds.has('IDLE_COMMANDER')).toBe(false);
  });

  it('enforces 8s global audio rate limit', () => {
    const dangerAlert: Alert = {
      id: 'E_STALLING',
      severity: 'danger',
      text: 'ENERGY STALL',
      since: 10,
      dedupeKey: 'E_STALLING'
    };

    // Last audio was played at 5s, now clock is 10s (5s elapsed < 8s)
    const res = resolveAudioCues([dangerAlert], [], 10, 5);
    expect(res.emittedCues).toHaveLength(0);

    // At clock = 14s (9s elapsed >= 8s) => audio plays
    const res2 = resolveAudioCues([dangerAlert], [], 14, 5);
    expect(res2.emittedCues).toHaveLength(1);
    expect(res2.newLastGlobalAudioAt).toBe(14);
  });
});
