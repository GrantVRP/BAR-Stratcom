import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const PercentilesSchema = z
  .object({
    p25: z.number(),
    p50: z.number(),
    p75: z.number()
  })
  .strict();

export type Percentiles = z.infer<typeof PercentilesSchema>;

export const BenchmarkSourceSchema = z
  .object({
    sessionId: z.string(),
    player: z.string(),
    replayId: z.string().optional()
  })
  .strict();

export type BenchmarkSource = z.infer<typeof BenchmarkSourceSchema>;

export const BenchmarkSeriesPointSchema = z
  .object({
    t: z.number(),
    metalIncome: PercentilesSchema,
    energyIncome: PercentilesSchema,
    buildPower: PercentilesSchema,
    armyMetal: PercentilesSchema
  })
  .strict();

export type BenchmarkSeriesPoint = z.infer<typeof BenchmarkSeriesPointSchema>;

export const BenchmarkModeSchema = z.enum(['1v1', 'small-team', 'large-team']);
export type BenchmarkMode = z.infer<typeof BenchmarkModeSchema>;

export const BenchmarkFileSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    factionId: z.string(),
    mode: BenchmarkModeSchema,
    gameVersions: z.array(z.string()),
    sampleCount: z.number().int().min(0),
    sources: z.array(BenchmarkSourceSchema),
    series: z.array(BenchmarkSeriesPointSchema)
  })
  .strict();

export type BenchmarkFile = z.infer<typeof BenchmarkFileSchema>;
