import { z } from 'zod';
import type { IpcChannel, IpcEventChannel } from './channels';
import {
  BarSourceSchema,
  BuildPlanSchema,
  CoachStateSchema,
  CueSchema,
  LiveSnapshotSchema,
  MapRecordSchema,
  SettingsSchema,
  UnitSnapshotSchema
} from '../core/schemas';

export const HealthStatusSchema = z.enum([
  'no-bar',
  'widget-missing',
  'widget-outdated',
  'bar-idle',
  'pregame',
  'live',
  'spectating',
  'replay',
  'widgets-disabled',
  'widget-stalled',
  'protocol-mismatch'
]);

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthStateSchema = z
  .object({
    status: HealthStatusSchema,
    message: z.string(),
    lastHeartbeat: z.number().nullable().optional()
  })
  .strict();

export type HealthState = z.infer<typeof HealthStateSchema>;

export const GameLocationSchema = z
  .object({
    dataDir: z.string(),
    source: BarSourceSchema
  })
  .strict();

export type GameLocation = z.infer<typeof GameLocationSchema>;

export const InstallResultSchema = z
  .object({
    success: z.boolean(),
    message: z.string()
  })
  .strict();

export type InstallResult = z.infer<typeof InstallResultSchema>;

export const WidgetStatusSchema = z
  .object({
    installed: z.boolean(),
    installedVersion: z.string().nullable(),
    bundledVersion: z.string(),
    legacyPresent: z.boolean()
  })
  .strict();

export type WidgetStatus = z.infer<typeof WidgetStatusSchema>;

export const DemoInfoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    durationSec: z.number()
  })
  .strict();

export type DemoInfo = z.infer<typeof DemoInfoSchema>;

export const CoachStartRequestSchema = z
  .object({
    planId: z.string().optional(),
    plan: BuildPlanSchema.optional(),
    mode: z.enum(['live', 'manual', 'demo']),
    demoId: z.string().optional(),
    speed: z.number().optional()
  })
  .strict();

export type CoachStartRequest = z.infer<typeof CoachStartRequestSchema>;

export const AppInfoSchema = z
  .object({
    version: z.string(),
    platform: z.string(),
    dataPaths: z
      .object({
        userData: z.string(),
        barData: z.string().nullable()
      })
      .strict()
      .optional()
  })
  .strict();

export type AppInfo = z.infer<typeof AppInfoSchema>;

export type IpcSuccess<T> = { ok: true; data: T };
export type IpcFailure = { ok: false; code: string; message: string };
export type IpcResponse<T> = IpcSuccess<T> | IpcFailure;

export const ipcContract = {
  'app:getInfo': {
    request: z.void().optional(),
    response: AppInfoSchema
  },
  'settings:get': {
    request: z.void().optional(),
    response: SettingsSchema
  },
  'settings:set': {
    request: SettingsSchema.partial(),
    response: SettingsSchema
  },
  'game:locate': {
    request: z.object({ manualPath: z.string().optional() }).strict().optional(),
    response: GameLocationSchema.nullable()
  },
  'game:widgetStatus': {
    request: z.void().optional(),
    response: WidgetStatusSchema
  },
  'game:installWidget': {
    request: z.void().optional(),
    response: InstallResultSchema
  },
  'game:uninstallWidget': {
    request: z.void().optional(),
    response: InstallResultSchema
  },
  'game:removeLegacyWidget': {
    request: z.object({ confirm: z.boolean() }).strict(),
    response: InstallResultSchema
  },
  'coach:start': {
    request: CoachStartRequestSchema,
    response: z.object({ ok: z.boolean() }).strict()
  },
  'coach:stop': {
    request: z.void().optional(),
    response: z.object({ ok: z.boolean() }).strict()
  },
  'registry:getSnapshot': {
    request: z.object({ gameVersion: z.string().optional() }).strict().optional(),
    response: UnitSnapshotSchema
  },
  'maps:list': {
    request: z.void().optional(),
    response: z.array(MapRecordSchema)
  },
  'maps:get': {
    request: z.object({ fileName: z.string() }).strict(),
    response: MapRecordSchema.nullable()
  },
  'plans:list': {
    request: z.void().optional(),
    response: z.array(BuildPlanSchema)
  },
  'plans:get': {
    request: z.object({ id: z.string() }).strict(),
    response: BuildPlanSchema.nullable()
  },
  'plans:save': {
    request: BuildPlanSchema,
    response: BuildPlanSchema
  },
  'plans:delete': {
    request: z.object({ id: z.string() }).strict(),
    response: z.object({ ok: z.boolean() }).strict()
  },
  'plans:import': {
    request: z.object({ shareCode: z.string() }).strict(),
    response: BuildPlanSchema
  },
  'plans:export': {
    request: z.object({ id: z.string() }).strict(),
    response: z.object({ shareCode: z.string() }).strict()
  },
  'demo:list': {
    request: z.void().optional(),
    response: z.array(DemoInfoSchema)
  }
} as const satisfies Record<IpcChannel, { request: z.ZodTypeAny; response: z.ZodTypeAny }>;

export const ipcEvents = {
  'live:health': HealthStateSchema,
  'live:state': LiveSnapshotSchema,
  'coach:update': CoachStateSchema,
  'coach:cue': CueSchema,
  'review:ready': z.object({ sessionId: z.string() }).strict()
} as const satisfies Record<IpcEventChannel, z.ZodTypeAny>;

export type IpcContract = typeof ipcContract;
export type IpcRequest<C extends IpcChannel> = z.input<IpcContract[C]['request']>;
export type IpcResponseData<C extends IpcChannel> = z.infer<IpcContract[C]['response']>;

export type IpcEvents = typeof ipcEvents;
export type IpcEventData<E extends IpcEventChannel> = z.infer<IpcEvents[E]>;

export * from './channels';
