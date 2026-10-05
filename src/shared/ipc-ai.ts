import { z } from 'zod';
import { BuildPlanSchema, PlanModeSchema, PlanOpeningSchema, PlanRoleSchema, PlanSkillSchema } from '../core/schemas/plans';
import { AiProviderSchema } from '../core/schemas/settings';
import { PlanIssueSchema } from '../core/schemas/validation';

/** AI providers without "none" (T08.6). */
const AiProviderIdSchema = AiProviderSchema.exclude(['none']);
/** Local server endpoints: http(s) only. */
const AiBaseUrlSchema = z
  .string()
  .max(300)
  .regex(/^https?:\/\/\S+$/);
const AiProviderInfoSchema = z
  .object({
    id: AiProviderIdSchema,
    label: z.string(),
    needsKey: z.boolean(),
    defaultBaseUrl: z.string().optional(),
    local: z.boolean(),
    hasKey: z.boolean()
  })
  .strict();

/** The player's intent for a draft (04 §6.1); the provider and model come from Settings. */
export const AiDraftRequestSchema = z
  .object({
    factionId: z.string().regex(/^[a-z]+$/),
    mode: PlanModeSchema,
    role: PlanRoleSchema,
    opening: PlanOpeningSchema,
    skill: PlanSkillSchema,
    mapFileName: z.string().min(1).max(200).optional(),
    freeText: z.string().max(300).optional()
  })
  .strict();

/** DraftResult (04 §6.1): a plan with errors is shown but cannot be activated or saved. */
export const AiDraftResultSchema = z
  .object({
    plan: BuildPlanSchema.nullable(),
    report: z
      .object({
        errors: z.array(PlanIssueSchema),
        warnings: z.array(PlanIssueSchema),
        sim: z.object({ energyStallSec: z.number(), metalStallSec: z.number(), flags: z.array(z.string()) }).strict().nullable()
      })
      .strict(),
    provider: z.string(),
    model: z.string(),
    rounds: z.number().int().min(1)
  })
  .strict();

/** AI channels (T08.6, T08.7); keys go in, never out: the renderer only learns `hasKey`. */
export const aiIpcContract = {
  'ai:listProviders': {
    request: z.void().optional(),
    response: z.array(AiProviderInfoSchema)
  },
  'ai:setKey': {
    request: z.object({ provider: AiProviderIdSchema, key: z.string().min(1).max(500) }).strict(),
    response: z.object({ ok: z.literal(true) }).strict()
  },
  'ai:clearKey': {
    request: z.object({ provider: AiProviderIdSchema }).strict(),
    response: z.object({ ok: z.literal(true) }).strict()
  },
  'ai:hasKey': {
    request: z.object({ provider: AiProviderIdSchema }).strict(),
    response: z.boolean()
  },
  'ai:listModels': {
    request: z.object({ provider: AiProviderIdSchema, baseUrl: AiBaseUrlSchema.optional() }).strict(),
    response: z.array(z.object({ id: z.string(), label: z.string() }).strict())
  },
  'ai:test': {
    request: z.object({ provider: AiProviderIdSchema, baseUrl: AiBaseUrlSchema.optional() }).strict(),
    response: z.object({ ok: z.literal(true), models: z.number().int() }).strict()
  },
  'ai:draft': {
    request: AiDraftRequestSchema,
    response: AiDraftResultSchema
  },
  'ai:cancel': {
    request: z.void().optional(),
    response: z.object({ cancelled: z.boolean() }).strict()
  }
} as const;

/** Pushed while a draft runs: round 1 drafts, rounds 2–3 repair, then the valid plan is simulated. */
export const aiIpcEvents = {
  'ai:progress': z.object({ round: z.number().int().min(1), phase: z.enum(['draft', 'repair', 'simulate']) }).strict()
} as const;
