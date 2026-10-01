import { z } from 'zod';
import { SchemaVersionSchema } from './common';

export const UnitEconomySchema = z
  .object({
    energyMake: z.number(),
    metalMake: z.number(),
    energyUpkeep: z.number(),
    metalUpkeep: z.number(),
    extractsMetal: z.number(),
    windGenerator: z.number(),
    tidalGenerator: z.number(),
    energyStorage: z.number(),
    metalStorage: z.number(),
    converter: z
      .object({
        energyPerSecond: z.number(),
        metalPerEnergy: z.number()
      })
      .strict()
      .nullable()
  })
  .strict();

export type UnitEconomy = z.infer<typeof UnitEconomySchema>;

export const UnitCombatSchema = z
  .object({
    health: z.number(),
    speed: z.number(),
    maxWeaponRange: z.number(),
    sightDistance: z.number(),
    radarDistance: z.number()
  })
  .strict();

export type UnitCombat = z.infer<typeof UnitCombatSchema>;

export const UnitDefRecordSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tooltip: z.string(),
    factionId: z.string().nullable(),
    techLevel: z.number().nullable(),
    unitGroup: z.string().nullable(),
    metalCost: z.number(),
    energyCost: z.number(),
    buildTime: z.number(),
    buildSpeed: z.number(),
    isBuilder: z.boolean(),
    isFactory: z.boolean(),
    isBuilding: z.boolean(),
    isCommander: z.boolean(),
    canFly: z.boolean(),
    canMove: z.boolean(),
    buildOptions: z.array(z.string()),
    economy: UnitEconomySchema,
    combat: UnitCombatSchema,
    missing: z.array(z.string())
  })
  .strict();

export type UnitDefRecord = z.infer<typeof UnitDefRecordSchema>;

export const UnitSnapshotSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    gameVersion: z.string(),
    engineVersion: z.string(),
    exportedAt: z.string(),
    source: z.enum(['widget-export', 'test-fixture']),
    units: z.array(UnitDefRecordSchema)
  })
  .strict();

export type UnitSnapshot = z.infer<typeof UnitSnapshotSchema>;

export const SnapshotIndexSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    default: z.string(),
    available: z.array(
      z
        .object({
          gameVersion: z.string(),
          path: z.string(),
          unitCount: z.number(),
          exportedAt: z.string()
        })
        .strict()
    )
  })
  .strict();

export type SnapshotIndex = z.infer<typeof SnapshotIndexSchema>;
