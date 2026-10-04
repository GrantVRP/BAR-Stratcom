import { z } from 'zod';
import { BuildPlanSchema } from './plans';
import { PlanValidationResultSchema } from './validation';

export const CapturePlayerSchema = z
  .object({
    teamId: z.number().int(),
    name: z.string(),
    faction: z.string().nullable(),
    allyTeam: z.number().int(),
    isMe: z.boolean().optional(),
    capturable: z.boolean(),
    reason: z.string().nullable()
  })
  .strict();

export type CapturePlayer = z.infer<typeof CapturePlayerSchema>;

export const CaptureToPlanRequestSchema = z
  .object({
    sessionId: z.string(),
    teamId: z.number().int(),
    horizonSec: z.number().int().min(60).max(3600).optional(),
    replayId: z.string().max(300).optional()
  })
  .strict();

export type CaptureToPlanRequest = z.infer<typeof CaptureToPlanRequestSchema>;

export const CaptureToPlanResponseSchema = z
  .object({
    plan: BuildPlanSchema,
    issues: PlanValidationResultSchema
  })
  .strict();

export type CaptureToPlanResponse = z.infer<typeof CaptureToPlanResponseSchema>;

const REPLAY_ID = /^[a-f0-9]{32}$/i;

/**
 * Extracts a bar-rts replay id (32 hex characters) from a bare id, a `…/replays/<id>` link or a
 * `gameId=<id>` query. Returns `undefined` for empty input and `null` for anything else.
 */
export function parseReplayIdOrUrl(input: string | undefined): string | undefined | null {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;
  const candidate =
    trimmed.match(/\/replays\/([a-f0-9]+)/i)?.[1] ?? trimmed.match(/[?&]gameId=([a-f0-9]+)/i)?.[1] ?? trimmed;
  return REPLAY_ID.test(candidate) ? candidate.toLowerCase() : null;
}
