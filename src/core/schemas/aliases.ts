import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const AliasEntrySchema = z
  .object({
    alias: z.string(),
    unitId: z.string(),
    kind: z.enum(['legacy-name', 'nickname', 'abbreviation']),
    note: z.string().optional()
  })
  .strict();

export type AliasEntry = z.infer<typeof AliasEntrySchema>;

export const AliasesFileSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    aliases: z.array(AliasEntrySchema)
  })
  .strict();

export type AliasesFile = z.infer<typeof AliasesFileSchema>;
