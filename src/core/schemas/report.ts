import { z } from 'zod';
import { ProfileSchema, SchemaVersionSchema } from './common';

export const IncomePointSchema = z
  .object({
    metal: z.number(),
    energy: z.number()
  })
  .strict();

export type IncomePoint = z.infer<typeof IncomePointSchema>;

export const SessionReportMetricsSchema = z
  .object({
    durationSec: z.number(),
    energyStallSec: z.number(),
    metalStallSec: z.number(),
    metalFloatSec: z.number(),
    energyFloatSec: z.number(),
    idleFactorySec: z.number(),
    idleBuilderSec: z.number(),
    idleCommanderSec: z.number(),
    bpUtilisation: z.number().min(0).max(1),
    timeToFirstFactory: z.number().nullable(),
    timeToT2: z.number().nullable(),
    incomeAt: z
      .object({
        '180': IncomePointSchema.nullable(),
        '300': IncomePointSchema.nullable(),
        '480': IncomePointSchema.nullable(),
        '600': IncomePointSchema.nullable()
      })
      .strict()
  })
  .strict();

export type SessionReportMetrics = z.infer<typeof SessionReportMetricsSchema>;

export const SessionReportStepSchema = z
  .object({
    stepId: z.string(),
    plannedFinish: z.number(),
    actualFinish: z.number().nullable(),
    deltaSec: z.number().nullable()
  })
  .strict();

export type SessionReportStep = z.infer<typeof SessionReportStepSchema>;

export const SessionReportBenchmarkSchema = z
  .object({
    percentileMetalAt300: z.number().nullable(),
    percentileMetalAt600: z.number().nullable()
  })
  .strict();

export type SessionReportBenchmark = z.infer<typeof SessionReportBenchmarkSchema>;

export const SessionReportTipSchema = z
  .object({
    id: z.string(),
    severity: z.enum(['info', 'warn', 'danger']),
    text: z.string()
  })
  .strict();

export type SessionReportTip = z.infer<typeof SessionReportTipSchema>;

export const SessionReportGradeSchema = z.enum(['S', 'A', 'B', 'C', 'D']);
export type SessionReportGrade = z.infer<typeof SessionReportGradeSchema>;

export const ProfileSuggestionSchema = z
  .object({
    to: ProfileSchema,
    reason: z.string()
  })
  .strict();

export type ProfileSuggestion = z.infer<typeof ProfileSuggestionSchema>;

export const SessionReportSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    sessionId: z.string(),
    planId: z.string().optional(),
    profile: ProfileSchema,
    factionId: z.string().nullable(),
    metrics: SessionReportMetricsSchema,
    steps: z.array(SessionReportStepSchema),
    adherence: z.number().min(0).max(1),
    benchmark: SessionReportBenchmarkSchema.nullable(),
    tips: z.array(SessionReportTipSchema).max(3),
    grade: SessionReportGradeSchema,
    profileSuggestion: ProfileSuggestionSchema.nullable()
  })
  .strict();

export type SessionReport = z.infer<typeof SessionReportSchema>;
