import { z } from 'zod';
import { ProfileSchema, SchemaVersionSchema } from './common';
import { AlertIdSchema } from './coach';

export const BarSourceSchema = z.enum(['registry', 'process', 'default', 'manual']);

export type BarSource = z.infer<typeof BarSourceSchema>;

export const BarSettingsSchema = z
  .object({
    dataDir: z.string().nullable(),
    source: BarSourceSchema.nullable()
  })
  .strict();

export type BarSettings = z.infer<typeof BarSettingsSchema>;

export const AlertSettingOverrideSchema = z
  .object({
    enabled: z.boolean(),
    threshold: z.number().optional()
  })
  .strict();

export type AlertSettingOverride = z.infer<typeof AlertSettingOverrideSchema>;

const alertOverrideEntries = Object.fromEntries(
  AlertIdSchema.options.map((id) => [id, AlertSettingOverrideSchema.optional()])
);

export const AlertSettingOverridesSchema = z.object(alertOverrideEntries).strict();

export type AlertSettingOverrides = z.infer<typeof AlertSettingOverridesSchema>;

export const SoundSettingsSchema = z
  .object({
    enabled: z.boolean(),
    volume: z.number().min(0).max(1)
  })
  .strict();

export type SoundSettings = z.infer<typeof SoundSettingsSchema>;

export const HudSettingsSchema = z
  .object({
    enabled: z.boolean()
  })
  .strict();

export type HudSettings = z.infer<typeof HudSettingsSchema>;

export const CoachWindowBoundsSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number(),
    height: z.number()
  })
  .strict();

export type CoachWindowBounds = z.infer<typeof CoachWindowBoundsSchema>;

export const CoachWindowSettingsSchema = z
  .object({
    alwaysOnTop: z.boolean(),
    overlayMode: z.boolean(),
    bounds: CoachWindowBoundsSchema.optional(),
    clickThrough: z.boolean().optional()
  })
  .strict();

export type CoachWindowSettings = z.infer<typeof CoachWindowSettingsSchema>;

export const AssistSettingsSchema = z
  .object({
    armNext: z.boolean(),
    factoryQueue: z.boolean()
  })
  .strict();

export type AssistSettings = z.infer<typeof AssistSettingsSchema>;

export const AiProviderSchema = z.enum([
  'none',
  'anthropic',
  'gemini',
  'openai',
  'openrouter',
  'ollama',
  'lmstudio'
]);

export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiSettingsSchema = z
  .object({
    provider: AiProviderSchema,
    model: z.string().nullable(),
    baseUrl: z.string().nullable(),
    anthropicFallbacks: z.boolean()
  })
  .strict();

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const UpdatesSettingsSchema = z
  .object({
    checkOnLaunch: z.boolean()
  })
  .strict();

export type UpdatesSettings = z.infer<typeof UpdatesSettingsSchema>;

export const LauncherSettingsSchema = z
  .object({
    showOnStart: z.boolean()
  })
  .strict();

export type LauncherSettings = z.infer<typeof LauncherSettingsSchema>;

export const SettingsSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    profile: ProfileSchema,
    bar: BarSettingsSchema,
    alerts: AlertSettingOverridesSchema,
    sound: SoundSettingsSchema,
    chatEcho: z.boolean(),
    hud: HudSettingsSchema,
    coachWindow: CoachWindowSettingsSchema,
    assist: AssistSettingsSchema,
    ai: AiSettingsSchema,
    updates: UpdatesSettingsSchema,
    launcher: LauncherSettingsSchema,
    globalShortcut: z.string().nullable(),
    activePlanId: z.string().nullable()
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;

export function defaultSettings(): Settings {
  return {
    schemaVersion: 1,
    profile: 'intermediate',
    bar: {
      dataDir: null,
      source: null
    },
    alerts: {},
    sound: {
      enabled: true,
      volume: 0.8
    },
    chatEcho: false,
    hud: {
      enabled: true
    },
    coachWindow: {
      alwaysOnTop: false,
      overlayMode: false
    },
    assist: {
      armNext: false,
      factoryQueue: false
    },
    ai: {
      provider: 'none',
      model: null,
      baseUrl: null,
      anthropicFallbacks: false
    },
    updates: {
      checkOnLaunch: true
    },
    launcher: {
      showOnStart: true
    },
    globalShortcut: 'Ctrl+Alt+S',
    activePlanId: null
  };
}
