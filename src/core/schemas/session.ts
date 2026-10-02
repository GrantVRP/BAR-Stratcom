import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const SessionModeSchema = z.enum(['player', 'spectator', 'replay']);
export type SessionMode = z.infer<typeof SessionModeSchema>;

export const SessionTeamMemberSchema = z
  .object({
    teamId: z.number().int(),
    allyTeamId: z.number().int(),
    playerName: z.string(),
    factionId: z.string().nullable(),
    isMe: z.boolean()
  })
  .strict();

export type SessionTeamMember = z.infer<typeof SessionTeamMemberSchema>;

export const SessionStartResSchema = z
  .object({
    metal: z.number(),
    energy: z.number(),
    metalStorage: z.number(),
    energyStorage: z.number()
  })
  .strict();

export type SessionStartRes = z.infer<typeof SessionStartResSchema>;

export const SessionSourceSchema = z.enum(['live', 'fixture']);
export type SessionSource = z.infer<typeof SessionSourceSchema>;

export const SessionReplaySchema = z
  .object({
    replayId: z.string(),
    url: z.string()
  })
  .strict();

export type SessionReplay = z.infer<typeof SessionReplaySchema>;

export const SessionMetaSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    sessionId: z.string(),
    mode: SessionModeSchema,
    gameVersion: z.string(),
    engineVersion: z.string(),
    mapScriptName: z.string(),
    durationSec: z.number(),
    startedAt: z.string(),
    teams: z.array(SessionTeamMemberSchema),
    start: SessionStartResSchema.nullable(),
    planId: z.string().optional(),
    source: SessionSourceSchema,
    anonymized: z.boolean(),
    replay: SessionReplaySchema.optional(),
    notes: z.string().optional()
  })
  .strict();

export type SessionMeta = z.infer<typeof SessionMetaSchema>;
