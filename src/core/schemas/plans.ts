import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const ActorCommanderSchema = z
  .object({
    kind: z.literal('commander')
  })
  .strict();

export const ActorFactorySchema = z
  .object({
    kind: z.literal('factory'),
    unitId: z.string(),
    index: z.number().int().min(1)
  })
  .strict();

export const ActorBuilderSchema = z
  .object({
    kind: z.literal('builder'),
    unitId: z.string(),
    index: z.number().int().min(1)
  })
  .strict();

export const ActorSchema = z.discriminatedUnion('kind', [
  ActorCommanderSchema,
  ActorFactorySchema,
  ActorBuilderSchema
]);

export type Actor = z.infer<typeof ActorSchema>;

export const BuildStepReclaimSchema = z
  .object({
    metal: z.number(),
    energy: z.number(),
    durationSec: z.number()
  })
  .strict();

export type BuildStepReclaim = z.infer<typeof BuildStepReclaimSchema>;

const baseStepFields = {
  actor: ActorSchema,
  action: z.enum(['build', 'reclaim', 'assist', 'note']),
  unitId: z.string().optional(),
  count: z.number().int().min(1).max(50),
  targetTime: z.number().min(0).optional(),
  reclaim: BuildStepReclaimSchema.optional(),
  assistStepId: z.string().optional(),
  text: z.string().max(80).optional(),
  optional: z.boolean().optional()
};

function refineStep(step: { action: string; unitId?: string }, ctx: z.RefinementCtx): void {
  if (step.action === 'build' && !step.unitId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'unitId is required when action is "build"',
      path: ['unitId']
    });
  }
}

export const BuildStepSchema = z
  .object({
    id: z.string(),
    ...baseStepFields
  })
  .strict()
  .superRefine(refineStep);

export type BuildStep = z.infer<typeof BuildStepSchema>;

export const AiBuildStepSchema = z
  .object({
    id: z.string().optional(),
    ...baseStepFields
  })
  .strict()
  .superRefine(refineStep);

export type AiBuildStep = z.infer<typeof AiBuildStepSchema>;

export const PlanSourceCuratedSchema = z
  .object({
    kind: z.literal('curated'),
    replayId: z.string(),
    player: z.string(),
    playerRating: z.number().optional(),
    map: z.string(),
    playedAt: z.string(),
    gameVersion: z.string(),
    reviewedBy: z.string(),
    reviewedAt: z.string()
  })
  .strict();

export const PlanSourceReplayCaptureSchema = z
  .object({
    kind: z.literal('replay-capture'),
    sessionId: z.string(),
    replayId: z.string().optional(),
    player: z.string(),
    map: z.string(),
    capturedAt: z.string()
  })
  .strict();

export const PlanSourceOwnGameSchema = z
  .object({
    kind: z.literal('own-game'),
    sessionId: z.string(),
    map: z.string(),
    capturedAt: z.string()
  })
  .strict();

export const PlanSourceAdaptedSchema = z
  .object({
    kind: z.literal('adapted'),
    fromPlanId: z.string(),
    transforms: z.array(z.string()),
    createdAt: z.string()
  })
  .strict();

export const PlanSourceAiDraftSchema = z
  .object({
    kind: z.literal('ai-draft'),
    provider: z.string(),
    model: z.string(),
    createdAt: z.string(),
    repairRounds: z.number().int().min(0)
  })
  .strict();

export const PlanSourceManualSchema = z
  .object({
    kind: z.literal('manual'),
    createdAt: z.string()
  })
  .strict();

export const PlanSourceSchema = z.discriminatedUnion('kind', [
  PlanSourceCuratedSchema,
  PlanSourceReplayCaptureSchema,
  PlanSourceOwnGameSchema,
  PlanSourceAdaptedSchema,
  PlanSourceAiDraftSchema,
  PlanSourceManualSchema
]);

export type PlanSource = z.infer<typeof PlanSourceSchema>;

export const PlanMapFitSchema = z
  .object({
    windMin: z.number().optional(),
    windMax: z.number().optional(),
    needsWater: z.boolean().optional(),
    maps: z.array(z.string()).optional()
  })
  .strict();

export type PlanMapFit = z.infer<typeof PlanMapFitSchema>;

export const PlanModeSchema = z.enum(['1v1', 'small-team', 'large-team']);
export type PlanMode = z.infer<typeof PlanModeSchema>;

export const PlanRoleSchema = z.enum(['any', 'front', 'eco', 'air', 'sea']);
export type PlanRole = z.infer<typeof PlanRoleSchema>;

export const PlanSkillSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type PlanSkill = z.infer<typeof PlanSkillSchema>;

export const PlanOpeningSchema = z.enum(['bot', 'vehicle', 'air', 'sea', 'hover', 'mixed']);
export type PlanOpening = z.infer<typeof PlanOpeningSchema>;

export const PlanEnergyStyleSchema = z.enum(['wind', 'solar', 'tidal', 'mixed']);
export type PlanEnergyStyle = z.infer<typeof PlanEnergyStyleSchema>;

export const BuildPlanSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: z.string(),
    title: z.string().max(60),
    description: z.string().max(400).optional(),
    factionId: z.string(),
    gameVersion: z.string(),
    modes: z.array(PlanModeSchema).min(1),
    role: PlanRoleSchema,
    skill: PlanSkillSchema,
    opening: PlanOpeningSchema,
    energyStyle: PlanEnergyStyleSchema,
    mapFit: PlanMapFitSchema.optional(),
    source: PlanSourceSchema,
    steps: z.array(BuildStepSchema).min(1).max(120),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional()
  })
  .strict();

export type BuildPlan = z.infer<typeof BuildPlanSchema>;

export const AiPlanDraftSchema = z
  .object({
    title: z.string().max(60),
    description: z.string().max(400).optional(),
    factionId: z.string(),
    modes: z.array(PlanModeSchema).min(1),
    role: PlanRoleSchema,
    skill: PlanSkillSchema,
    opening: PlanOpeningSchema,
    energyStyle: PlanEnergyStyleSchema,
    mapFit: PlanMapFitSchema.optional(),
    steps: z.array(AiBuildStepSchema).min(1).max(120),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.string()).optional()
  })
  .strict();

export type AiPlanDraft = z.infer<typeof AiPlanDraftSchema>;
