import { z } from 'zod';
import { LiveSnapshotSchema } from './live';

export const PROTOCOL_VERSION = 1;
export const ProtocolVersionSchema = z.literal(1);

export const WidgetHeartbeatMapSchema = z
  .object({
    scriptName: z.string(),
    windMin: z.number(),
    windMax: z.number(),
    avgWind: z.number().nullable(),
    windRisk: z.number().nullable(),
    tidal: z.number()
  })
  .strict();

export type WidgetHeartbeatMap = z.infer<typeof WidgetHeartbeatMapSchema>;

export const WidgetHeartbeatPerfSchema = z
  .object({
    frameMs: z.number(),
    drawMs: z.number(),
    snapshotMs: z.number()
  })
  .strict();

export type WidgetHeartbeatPerf = z.infer<typeof WidgetHeartbeatPerfSchema>;

export const WidgetHeartbeatSchema = z
  .object({
    protocol: ProtocolVersionSchema,
    widgetVersion: z.string(),
    engineVersion: z.string(),
    gameVersion: z.string(),
    sessionId: z.string().nullable(),
    mode: z.enum(['pregame', 'player', 'spectator', 'replay']),
    canControlUnits: z.boolean(),
    frame: z.number().int(),
    gameStarted: z.boolean(),
    gameOver: z.boolean(),
    map: WidgetHeartbeatMapSchema,
    perf: WidgetHeartbeatPerfSchema.nullable(),
    degraded: z.boolean(),
    heartbeat: z.number()
  })
  .strict();

export type WidgetHeartbeat = z.infer<typeof WidgetHeartbeatSchema>;

export const StateDocSchema = LiveSnapshotSchema.extend({
  protocol: ProtocolVersionSchema,
  sessionId: z.string(),
  seq: z.number().int()
}).strict();

export type StateDoc = z.infer<typeof StateDocSchema>;

export const WidgetEventGameStartSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('gamestart')
  })
  .strict();

export const WidgetEventCreatedSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('created'),
    u: z.number().int(),
    d: z.string(),
    tm: z.number().int(),
    b: z.number().int().nullable().optional(),
    bd: z.string().nullable().optional()
  })
  .strict();

export const WidgetEventFinishedSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('finished'),
    u: z.number().int(),
    d: z.string(),
    tm: z.number().int()
  })
  .strict();

export const WidgetEventDestroyedSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('destroyed'),
    u: z.number().int(),
    d: z.string(),
    tm: z.number().int()
  })
  .strict();

export const WidgetEventGivenSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('given'),
    u: z.number().int(),
    d: z.string(),
    tm: z.number().int()
  })
  .strict();

export const WidgetEventTakenSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('taken'),
    u: z.number().int(),
    d: z.string(),
    tm: z.number().int()
  })
  .strict();

export const WidgetEventGameOverSchema = z
  .object({
    f: z.number().int(),
    e: z.literal('gameover'),
    w: z.array(z.number().int()).optional()
  })
  .strict();

export const WidgetEventSchema = z.discriminatedUnion('e', [
  WidgetEventGameStartSchema,
  WidgetEventCreatedSchema,
  WidgetEventFinishedSchema,
  WidgetEventDestroyedSchema,
  WidgetEventGivenSchema,
  WidgetEventTakenSchema,
  WidgetEventGameOverSchema
]);

export type WidgetEvent = z.infer<typeof WidgetEventSchema>;

export const RawUnitdefsExportSchema = z
  .object({
    protocol: ProtocolVersionSchema,
    kind: z.literal('unitdefs'),
    gameVersion: z.string(),
    engineVersion: z.string(),
    units: z.array(z.record(z.string(), z.unknown())),
    missingFields: z.array(z.string())
  })
  .strict();

export type RawUnitdefsExport = z.infer<typeof RawUnitdefsExportSchema>;

export const RawWindLookupSchema = z
  .object({
    protocol: ProtocolVersionSchema,
    kind: z.literal('wind-lookup'),
    gameVersion: z.string(),
    table: z.record(z.string(), z.record(z.string(), z.number()))
  })
  .strict();

export type RawWindLookup = z.infer<typeof RawWindLookupSchema>;

export const CoachHudToneSchema = z.enum(['info', 'good', 'warn', 'danger']);

export const CoachHudLineSchema = z
  .object({
    text: z.string().max(36),
    tone: CoachHudToneSchema,
    big: z.boolean().optional(),
    /** Right-aligned column (from widget 3.0.5): the timing, e.g. 'in 0:08' or '+0:05'. */
    right: z.string().max(9).optional(),
    /** Who builds it (from widget 3.0.5): 'COM', 'CB1', 'BL'; shown when it changes from the row above. */
    tag: z.string().max(6).optional(),
    /** The unit (from widget 3.0.5): a big row shows its build picture, drawn by the engine. */
    unitId: z.string().optional()
  })
  .strict();

export type CoachHudLine = z.infer<typeof CoachHudLineSchema>;

export const CoachHudProgressSchema = z
  .object({
    done: z.number().int(),
    total: z.number().int()
  })
  .strict();

export type CoachHudProgress = z.infer<typeof CoachHudProgressSchema>;

/** A small right-aligned item in a box header (progress, pace). */
export const CoachHudMetaSchema = z
  .object({
    text: z.string().max(12),
    tone: CoachHudToneSchema
  })
  .strict();

export type CoachHudMeta = z.infer<typeof CoachHudMetaSchema>;

/**
 * A HUD box: a header (title + meta) and 1–4 rows, the first big (the
 * entry point), the rest the queue behind it.
 */
export const CoachHudBoxSchema = z
  .object({
    title: z.string().max(36),
    meta: z.array(CoachHudMetaSchema).max(3).optional(),
    lines: z.array(CoachHudLineSchema).min(1).max(4)
  })
  .strict();

export type CoachHudBox = z.infer<typeof CoachHudBoxSchema>;

export const CoachHudAlertSchema = z
  .object({
    text: z.string().max(36),
    tone: CoachHudToneSchema
  })
  .strict();

export type CoachHudAlert = z.infer<typeof CoachHudAlertSchema>;

/** The radar box (from widget 3.0.6): the widget draws the scope from the game; `lines` are the
 *  enemy contacts the app lists under it (identified enemies in LOS). */
export const CoachHudRadarSchema = z
  .object({
    /** Elmos from the centre to the scope's side edges (top and bottom: half). */
    range: z.number().int().min(500).max(8000),
    lines: z.array(CoachHudLineSchema).max(3)
  })
  .strict();

export type CoachHudRadar = z.infer<typeof CoachHudRadarSchema>;

export const CoachHudSchema = z
  .object({
    visible: z.boolean(),
    /** title, lines and progress: the single-panel HUD that widgets before 3.0.5 draw. */
    title: z.string(),
    lines: z.array(CoachHudLineSchema).max(4),
    progress: CoachHudProgressSchema.nullable(),
    /** The commander's and constructors' next steps (from 3.0.5); null without a plan. */
    build: CoachHudBoxSchema.nullable().optional(),
    /** The factories' next builds (from 3.0.4); null when no factory build is pending. */
    factory: CoachHudBoxSchema.nullable().optional(),
    /** Radar scope + enemy contacts (from 3.0.6); null without enemy data. */
    radar: CoachHudRadarSchema.nullable().optional(),
    /** Up to two active alerts (from 3.0.5), drawn under the boxes. */
    alerts: z.array(CoachHudAlertSchema).max(2).optional()
  })
  .strict();

export type CoachHud = z.infer<typeof CoachHudSchema>;

export const CoachEchoSchema = z
  .object({
    id: z.string(),
    text: z.string()
  })
  .strict();

export type CoachEcho = z.infer<typeof CoachEchoSchema>;

export const CoachAssistArmNextSchema = z
  .object({
    unitId: z.string(),
    stepId: z.string()
  })
  .strict();

export type CoachAssistArmNext = z.infer<typeof CoachAssistArmNextSchema>;

export const CoachAssistFactoryQueueItemSchema = z
  .object({
    unitId: z.string(),
    count: z.number().int().min(1)
  })
  .strict();

export type CoachAssistFactoryQueueItem = z.infer<typeof CoachAssistFactoryQueueItemSchema>;

export const CoachAssistFactoryQueueSchema = z
  .object({
    factoryUnitId: z.string(),
    items: z.array(CoachAssistFactoryQueueItemSchema)
  })
  .strict();

export type CoachAssistFactoryQueue = z.infer<typeof CoachAssistFactoryQueueSchema>;

export const CoachAssistSchema = z
  .object({
    armNext: CoachAssistArmNextSchema.nullable(),
    factoryQueue: CoachAssistFactoryQueueSchema.nullable(),
    enabled: z
      .object({
        armNext: z.boolean(),
        factoryQueue: z.boolean()
      })
      .strict()
  })
  .strict();

export type CoachAssist = z.infer<typeof CoachAssistSchema>;

export const CoachDocSchema = z
  .object({
    protocol: ProtocolVersionSchema,
    seq: z.number().int(),
    sessionId: z.string().nullable(),
    mode: z.enum(['live', 'manual', 'off']),
    generatedAtSec: z.number(),
    hud: CoachHudSchema,
    echo: z.array(CoachEchoSchema),
    assist: CoachAssistSchema
  })
  .strict();

export type CoachDoc = z.infer<typeof CoachDocSchema>;

export const SessionFileTeamSchema = z
  .object({
    teamId: z.number().int(),
    allyTeamId: z.number().int(),
    playerName: z.string(),
    factionId: z.string().nullable(),
    isAI: z.boolean(),
    isMe: z.boolean()
  })
  .strict();

export type SessionFileTeam = z.infer<typeof SessionFileTeamSchema>;

export const SessionFileStartSchema = z
  .object({
    metal: z.number(),
    energy: z.number(),
    metalStorage: z.number(),
    energyStorage: z.number()
  })
  .strict();

export type SessionFileStart = z.infer<typeof SessionFileStartSchema>;

export const SessionFileDocSchema = z
  .object({
    protocol: ProtocolVersionSchema,
    kind: z.literal('session'),
    sessionId: z.string(),
    /** Widget that wrote the file (from 3.0.2, older files have none). */
    widgetVersion: z.string().optional(),
    mode: z.enum(['player', 'spectator', 'replay']),
    gameVersion: z.string(),
    engineVersion: z.string(),
    map: z
      .object({
        scriptName: z.string(),
        windMin: z.number(),
        windMax: z.number(),
        tidal: z.number()
      })
      .strict(),
    teams: z.array(SessionFileTeamSchema),
    start: SessionFileStartSchema.nullable()
  })
  .strict();

export type SessionFileDoc = z.infer<typeof SessionFileDocSchema>;
