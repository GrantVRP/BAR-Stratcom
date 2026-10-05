import { z } from 'zod';
import { AiProviderSchema } from '../core/schemas/settings';

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

/** AI settings channels (T08.6); keys go in, never out: the renderer only learns `hasKey`. */
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
  }
} as const;
