import { z } from 'zod';

const UpdateInfoSchema = z.object({ latest: z.string(), url: z.string().url() }).strict();

/** Version check and links. */
export const appIpcContract = {
  'updates:check': {
    request: z.void().optional(),
    response: UpdateInfoSchema.nullable()
  },
  'shell:openExternal': {
    request: z.object({ url: z.string().url().max(2048) }).strict(),
    response: z.object({ ok: z.boolean() }).strict()
  }
} as const;
