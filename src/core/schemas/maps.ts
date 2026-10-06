import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const MapRecordSchema = z
  .object({
    fileName: z.string(),
    scriptName: z.string(),
    name: z.string(),
    author: z.string().nullable(),
    sizeX: z.number(),
    sizeZ: z.number(),
    wind: z
      .object({
        min: z.number(),
        max: z.number()
      })
      .strict(),
    tidalStrength: z.number(),
    maxMetal: z.number(),
    extractorRadius: z.number(),
    gravity: z.number(),
    startPositions: z.array(
      z
        .object({
          x: z.number(),
          z: z.number()
        })
        .strict()
    ),
    hasWater: z.boolean(),
    popularity: z
      .object({
        replays30d: z.number(),
        rank: z.number()
      })
      .strict()
      .nullable(),
    mexYield: z
      .object({
        value: z.number(),
        provenance: z.enum(['measured', 'estimated'])
      })
      .strict()
      .nullable()
  })
  .strict();

export type MapRecord = z.infer<typeof MapRecordSchema>;

export const MapsFileSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    fetchedAt: z.string(),
    source: z.literal('api.bar-rts.com/maps'),
    maps: z.array(MapRecordSchema)
  })
  .strict();

export type MapsFile = z.infer<typeof MapsFileSchema>;

export const MapNotesFileSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    fileName: z.string(),
    notes: z.array(
      z
        .object({
          text: z.string(),
          source: z
            .object({
              kind: z.enum(['replay', 'guide', 'owner']),
              ref: z.string()
            })
            .strict(),
          addedAt: z.string()
        })
        .strict()
    )
  })
  .strict();

export type MapNotesFile = z.infer<typeof MapNotesFileSchema>;

export const AvgWindFileSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    gameVersion: z.string(),
    table: z.record(z.string(), z.record(z.string(), z.number())),
    /** BAR's windRiskLookup: percent of the time the wind is below 6, same keys (Q-06; tools/import-wind-risk.ts). */
    riskTable: z.record(z.string(), z.record(z.string(), z.number())).optional()
  })
  .strict();

export type AvgWindFile = z.infer<typeof AvgWindFileSchema>;
