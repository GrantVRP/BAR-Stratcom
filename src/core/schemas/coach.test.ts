import { describe, expect, it } from 'vitest';
import {
  AlertIdSchema,
  AlertSchema,
  CoachModeSchema,
  CoachProjectionsSchema,
  CoachStateSchema,
  CoachStepSchema,
  CueSchema,
  SoundIdSchema
} from './coach';

describe('coach schemas', () => {
  const alertIds = [
    'E_STALL_SOON',
    'E_STALLING',
    'M_STALL_SOON',
    'M_STALLING',
    'M_FLOAT',
    'E_FLOAT',
    'IDLE_FACTORY',
    'IDLE_BUILDERS',
    'IDLE_COMMANDER',
    'BEHIND_PLAN',
    'BENCHMARK_LOW',
    'SCOUT_REMINDER',
    'ENEMY_AIR_NO_AA'
  ] as const;

  const validAlert = {
    id: 'E_STALL_SOON' as const,
    severity: 'warn' as const,
    text: 'ENERGY EMPTY IN 8s',
    since: 45,
    dedupeKey: 'E_STALL_SOON'
  };

  const validCue = {
    id: 'cue-1',
    alertId: 'E_STALL_SOON' as const,
    sound: 'warn' as const,
    text: 'ENERGY EMPTY IN 8s',
    at: 45
  };

  const validStep = {
    stepId: 'step-1',
    status: 'current' as const,
    plannedStart: 0,
    plannedFinish: 15,
    actualFinish: null
  };

  const validProjections = {
    energyEmptyInSec: 8,
    metalEmptyInSec: null,
    metalFullInSec: null,
    energyFullInSec: null
  };

  const validCoachState = {
    mode: 'live' as const,
    clock: 45,
    planId: 'plan-1',
    steps: [validStep],
    currentStepIndex: 0,
    aheadBehindSec: 3,
    alerts: [validAlert],
    projections: validProjections,
    profile: 'intermediate' as const
  };

  describe('AlertIdSchema', () => {
    it('accepts all 13 alert catalog IDs', () => {
      for (const id of alertIds) {
        expect(AlertIdSchema.parse(id)).toBe(id);
      }
    });

    it('rejects unknown alert IDs', () => {
      expect(AlertIdSchema.safeParse('UNKNOWN_ALERT').success).toBe(false);
    });
  });

  describe('AlertSchema', () => {
    it('accepts valid alert', () => {
      expect(AlertSchema.parse(validAlert)).toEqual(validAlert);
    });

    it('rejects alert text > 36 chars', () => {
      expect(AlertSchema.safeParse({ ...validAlert, text: 'a'.repeat(37) }).success).toBe(false);
    });

    it('rejects invalid severity', () => {
      expect(AlertSchema.safeParse({ ...validAlert, severity: 'critical' }).success).toBe(false);
    });
  });

  describe('SoundIdSchema and CueSchema', () => {
    it('accepts all sound IDs', () => {
      const sounds = ['step_due', 'step_done', 'info', 'warn', 'danger'] as const;
      for (const snd of sounds) {
        expect(SoundIdSchema.parse(snd)).toBe(snd);
      }
    });

    it('accepts valid cue with alert ID or step cue', () => {
      expect(CueSchema.parse(validCue)).toEqual(validCue);
      const stepDueCue = { ...validCue, alertId: 'STEP_DUE', sound: 'step_due' as const };
      expect(CueSchema.parse(stepDueCue)).toEqual(stepDueCue);
      const stepDoneCue = { ...validCue, alertId: 'STEP_DONE', sound: 'step_done' as const };
      expect(CueSchema.parse(stepDoneCue)).toEqual(stepDoneCue);
    });

    it('rejects invalid cue alertId or sound', () => {
      expect(CueSchema.safeParse({ ...validCue, alertId: 'OTHER' }).success).toBe(false);
      expect(CueSchema.safeParse({ ...validCue, sound: 'other' }).success).toBe(false);
    });
  });

  describe('CoachStateSchema', () => {
    it('accepts valid CoachState', () => {
      expect(CoachStateSchema.parse(validCoachState)).toEqual(validCoachState);
    });

    it('accepts valid coach step, projections, and mode', () => {
      expect(CoachStepSchema.parse(validStep)).toEqual(validStep);
      expect(CoachProjectionsSchema.parse(validProjections)).toEqual(validProjections);
      expect(CoachModeSchema.parse('live')).toBe('live');
    });

    it('rejects invalid mode or negative step index', () => {
      expect(CoachStateSchema.safeParse({ ...validCoachState, mode: 'invalid' }).success).toBe(false);
      expect(CoachStateSchema.safeParse({ ...validCoachState, currentStepIndex: -1 }).success).toBe(false);
    });
  });
});
