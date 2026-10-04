import { z } from 'zod';

/** Plan validation issue codes (03 §5). `E_*` block coaching and saving; `W_*` are advisory. */
export const IssueCodeSchema = z.enum([
  'E_FACTION_DISABLED',
  'E_UNKNOWN_UNIT',
  'E_WRONG_FACTION',
  'E_NOT_BUILDABLE',
  'E_ACTOR_NOT_AVAILABLE',
  'E_BAD_COUNT',
  'E_MISSING_FIELD',
  'W_TIME_ORDER',
  'W_NO_ENERGY_BEFORE_FACTORY',
  'W_STALE_VERSION'
]);

export type IssueCode = z.infer<typeof IssueCodeSchema>;

export const PlanIssueSchema = z
  .object({
    code: IssueCodeSchema,
    message: z.string(),
    stepId: z.string().optional(),
    path: z.array(z.string()).optional()
  })
  .strict();

export type PlanIssue = z.infer<typeof PlanIssueSchema>;

export const PlanValidationResultSchema = z
  .object({
    errors: z.array(PlanIssueSchema),
    warnings: z.array(PlanIssueSchema)
  })
  .strict();

export type PlanValidationResult = z.infer<typeof PlanValidationResultSchema>;
