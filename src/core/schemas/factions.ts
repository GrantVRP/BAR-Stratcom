import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const FactionSchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    unitPrefix: z.string(),
    enabled: z.boolean(),
    accent: z.string(),
    commanderIds: z.array(z.string())
  })
  .strict();

export type Faction = z.infer<typeof FactionSchema>;

export const FactionsFileSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    factions: z.array(FactionSchema)
  })
  .strict();

export type FactionsFile = z.infer<typeof FactionsFileSchema>;
