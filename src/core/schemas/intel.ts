import { z } from 'zod';

/*
 * BAR public API responses (api.bar-rts.com, Teiserver), as inspected live on 2026-10-04.
 * Only the fields the app uses are declared: unknown fields are stripped (never rejected), so API
 * additions do not break us and nothing we do not need (e.g. lobby host IPs) reaches the renderer.
 */

const optionalString = z.string().nullish();
const optionalNumber = z.number().nullish();

export const IntelPlayerStatusSchema = z.object({
  ingame: z.boolean().optional(),
  away: z.boolean().optional(),
  rank: optionalNumber,
  bot: z.boolean().optional()
});

export const IntelBattlePlayerSchema = z.object({
  username: z.string(),
  userId: optionalNumber,
  country: optionalString,
  clan: optionalString,
  /** e.g. "[38.32 ??]" */
  skill: optionalString,
  teamId: optionalNumber,
  /** "Playing" | "Spectating" | "Waiting" | "Loading" | "Not connected" | "Disconnected" | "" */
  gameStatus: optionalString,
  status: IntelPlayerStatusSchema.optional()
});

export const IntelBattleSchema = z.object({
  battleId: z.number(),
  title: z.string(),
  game: z.string(),
  map: z.string(),
  mapFileName: optionalString,
  locked: z.boolean(),
  passworded: z.boolean(),
  maxPlayers: z.number(),
  spectators: optionalNumber,
  lobbyStatus: optionalString,
  gameStatus: optionalString,
  /** Seconds since the game started. */
  gameTime: optionalNumber,
  gameType: optionalString,
  preset: optionalString,
  founder: z.object({ username: z.string(), country: optionalString }),
  players: z.array(IntelBattlePlayerSchema)
});

export type IntelBattle = z.infer<typeof IntelBattleSchema>;
export const IntelBattlesSchema = z.array(IntelBattleSchema);

export const IntelLeaderboardSchema = z.object({
  season: z.number().int(),
  categories: z.array(
    z.object({
      name: z.string(),
      players: z.array(z.object({ id: z.number(), name: z.string(), rating: z.number() }))
    })
  )
});

export type IntelLeaderboard = z.infer<typeof IntelLeaderboardSchema>;

const ReplayMapSchema = z.object({ fileName: z.string(), scriptName: z.string() });

export const IntelReplaySummarySchema = z.object({
  id: z.string(),
  startTime: z.string(),
  durationMs: z.number(),
  Map: ReplayMapSchema,
  AllyTeams: z.array(
    z.object({
      winningTeam: z.boolean().optional(),
      Players: z.array(z.object({ name: z.string() })),
      AIs: z.array(z.object({ shortName: z.string() })).optional()
    })
  )
});

export type IntelReplaySummary = z.infer<typeof IntelReplaySummarySchema>;

export const IntelReplayPageSchema = z.object({
  page: z.number(),
  limit: z.number(),
  data: z.array(IntelReplaySummarySchema)
});

export type IntelReplayPage = z.infer<typeof IntelReplayPageSchema>;

export const IntelReplayDetailSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  engineVersion: z.string(),
  gameVersion: z.string(),
  startTime: z.string(),
  durationMs: z.number(),
  gameEndedNormally: z.boolean(),
  hasBots: z.boolean(),
  preset: z.string(),
  Map: ReplayMapSchema,
  AllyTeams: z.array(
    z.object({
      winningTeam: z.boolean().optional(),
      Players: z.array(
        z.object({ name: z.string(), faction: optionalString, skill: optionalString, rank: optionalNumber })
      ),
      AIs: z.array(z.object({ shortName: z.string() })).optional()
    })
  )
});

export type IntelReplayDetail = z.infer<typeof IntelReplayDetailSchema>;

/** One node of a balance-change tree: a unit, a weapon, or a single property with old/new values. */
export interface IntelPropertyChange {
  propertyId: string;
  propertyName: string;
  changeType: string;
  prevValue?: unknown;
  newValue?: unknown;
  percentChange?: number | null;
  changes?: IntelPropertyChange[];
}

export const IntelPropertyChangeSchema: z.ZodType<IntelPropertyChange> = z.lazy(() =>
  z.object({
    propertyId: z.string(),
    propertyName: z.string(),
    changeType: z.string(),
    prevValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
    percentChange: z.number().nullish(),
    changes: z.array(IntelPropertyChangeSchema).optional()
  })
);

export const IntelBalanceChangeSchema = z.object({
  sha: z.string(),
  date: z.string(),
  message: z.string(),
  url: z.string(),
  author: z.object({ name: z.string(), url: optionalString }),
  /** `unit.propertyId` is the unitDef name (e.g. "armemp"). */
  changes: z.array(z.object({ unit: IntelPropertyChangeSchema }))
});

export type IntelBalanceChange = z.infer<typeof IntelBalanceChangeSchema>;

export const IntelBalancePageSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalResults: z.number(),
  data: z.array(IntelBalanceChangeSchema)
});

export type IntelBalancePage = z.infer<typeof IntelBalancePageSchema>;

/** Every intel IPC answer says when it was fetched and whether it is an offline fallback. */
export function cachedSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({ data, fetchedAt: z.string(), stale: z.boolean() });
}

export interface Cached<T> {
  data: T;
  /** ISO timestamp of the successful fetch this data came from. */
  fetchedAt: string;
  /** True when the network failed and this is older cached data. */
  stale: boolean;
}

export const IntelReplaysRequestSchema = z
  .object({
    page: z.number().int().min(1).max(500).optional(),
    preset: z.enum(['duel', 'team', 'ffa']).optional(),
    /** Exact map script name, e.g. "Isidis crack 1.1" (the API times out on file names). */
    map: z.string().min(1).max(120).optional(),
    player: z.string().min(1).max(60).optional()
  })
  .strict();

export type IntelReplaysRequest = z.infer<typeof IntelReplaysRequestSchema>;
