import { z } from 'zod';
import { ProfileSchema } from './common';

export const AlertIdSchema = z.enum([
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
]);

export type AlertId = z.infer<typeof AlertIdSchema>;

export const AlertSeveritySchema = z.enum(['info', 'warn', 'danger']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertSchema = z
  .object({
    id: AlertIdSchema,
    severity: AlertSeveritySchema,
    text: z.string().max(36),
    since: z.number(),
    dedupeKey: z.string()
  })
  .strict();

export type Alert = z.infer<typeof AlertSchema>;

export const SoundIdSchema = z.enum(['step_due', 'step_done', 'info', 'warn', 'danger']);

export type SoundId = z.infer<typeof SoundIdSchema>;

export const CueAlertIdSchema = z.union([AlertIdSchema, z.literal('STEP_DONE'), z.literal('STEP_DUE')]);

export type CueAlertId = z.infer<typeof CueAlertIdSchema>;

export const CueSchema = z
  .object({
    id: z.string(),
    alertId: CueAlertIdSchema,
    sound: SoundIdSchema,
    text: z.string(),
    at: z.number()
  })
  .strict();

export type Cue = z.infer<typeof CueSchema>;

export const CoachStepStatusSchema = z.enum(['done', 'current', 'upcoming', 'skipped']);

export type CoachStepStatus = z.infer<typeof CoachStepStatusSchema>;

export const CoachStepSchema = z
  .object({
    stepId: z.string(),
    status: CoachStepStatusSchema,
    plannedStart: z.number(),
    plannedFinish: z.number(),
    actualFinish: z.number().nullable()
  })
  .strict();

export type CoachStep = z.infer<typeof CoachStepSchema>;

export const CoachProjectionsSchema = z
  .object({
    energyEmptyInSec: z.number().nullable(),
    metalEmptyInSec: z.number().nullable(),
    metalFullInSec: z.number().nullable(),
    energyFullInSec: z.number().nullable()
  })
  .strict();

export type CoachProjections = z.infer<typeof CoachProjectionsSchema>;

export const CoachModeSchema = z.enum(['live', 'manual', 'demo', 'radar']);
export type CoachMode = z.infer<typeof CoachModeSchema>;

export const CoachStateSchema = z
  .object({
    mode: CoachModeSchema,
    clock: z.number(),
    planId: z.string(),
    steps: z.array(CoachStepSchema),
    currentStepIndex: z.number().int().min(0),
    aheadBehindSec: z.number().nullable(),
    alerts: z.array(AlertSchema),
    projections: CoachProjectionsSchema,
    profile: ProfileSchema,
    /** Game second each enemy type currently in sight was first seen (T09.5). */
    enemySeenAt: z.record(z.string(), z.number()).optional()
  })
  .strict();

export type CoachState = z.infer<typeof CoachStateSchema>;
