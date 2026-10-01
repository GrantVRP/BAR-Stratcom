import { describe, expect, it } from 'vitest';
import {
  SnapshotIndexSchema,
  UnitCombatSchema,
  UnitDefRecordSchema,
  UnitEconomySchema,
  UnitSnapshotSchema
} from './units';

describe('units schemas', () => {
  const validEconomy = {
    energyMake: 25,
    metalMake: 1.5,
    energyUpkeep: 0,
    metalUpkeep: 0,
    extractsMetal: 0,
    windGenerator: 0,
    tidalGenerator: 0,
    energyStorage: 500,
    metalStorage: 500,
    converter: {
      energyPerSecond: 100,
      metalPerEnergy: 0.01
    }
  };

  const validCombat = {
    health: 3000,
    speed: 1.25,
    maxWeaponRange: 300,
    sightDistance: 450,
    radarDistance: 0
  };

  const validUnitDef = {
    id: 'armcom',
    name: 'Commander',
    tooltip: 'Base commander unit',
    factionId: 'arm',
    techLevel: 1,
    unitGroup: 'commander',
    metalCost: 2000,
    energyCost: 10000,
    buildTime: 5000,
    buildSpeed: 300,
    isBuilder: true,
    isFactory: false,
    isBuilding: false,
    isCommander: true,
    canFly: false,
    canMove: true,
    buildOptions: ['armsolar', 'armmex'],
    economy: validEconomy,
    combat: validCombat,
    missing: []
  };

  const validSnapshot = {
    schemaVersion: 1,
    gameVersion: '105.1.1-2550-g422201b',
    engineVersion: '2026.01.1',
    exportedAt: '2026-10-01T12:00:00Z',
    source: 'test-fixture' as const,
    units: [validUnitDef]
  };

  const validSnapshotIndex = {
    schemaVersion: 1,
    default: '105.1.1-2550-g422201b',
    available: [
      {
        gameVersion: '105.1.1-2550-g422201b',
        path: 'snapshots/105.1.1-2550-g422201b.json',
        unitCount: 1,
        exportedAt: '2026-10-01T12:00:00Z'
      }
    ]
  };

  it('accepts valid economy and converter nullable', () => {
    expect(UnitEconomySchema.parse(validEconomy)).toEqual(validEconomy);
    const withoutConverter = { ...validEconomy, converter: null };
    expect(UnitEconomySchema.parse(withoutConverter).converter).toBeNull();
  });

  it('rejects invalid economy records', () => {
    expect(UnitEconomySchema.safeParse({ ...validEconomy, energyMake: 'high' }).success).toBe(false);
    expect(UnitEconomySchema.safeParse({ ...validEconomy, extraProp: 1 }).success).toBe(false);
    expect(UnitEconomySchema.safeParse({ ...validEconomy, converter: { unknown: true } }).success).toBe(
      false
    );
  });

  it('accepts valid combat', () => {
    expect(UnitCombatSchema.parse(validCombat)).toEqual(validCombat);
  });

  it('rejects invalid combat records', () => {
    expect(UnitCombatSchema.safeParse({ ...validCombat, health: 'low' }).success).toBe(false);
    expect(UnitCombatSchema.safeParse({ ...validCombat, extra: 1 }).success).toBe(false);
  });

  it('accepts valid unitDef and nullable fields', () => {
    expect(UnitDefRecordSchema.parse(validUnitDef)).toEqual(validUnitDef);
    const withNulls = {
      ...validUnitDef,
      factionId: null,
      techLevel: null,
      unitGroup: null
    };
    expect(UnitDefRecordSchema.parse(withNulls)).toEqual(withNulls);
  });

  it('rejects invalid unit def records', () => {
    const invalidCases: Array<{ name: string; value: unknown; path: string }> = [
      { name: 'missing id', value: { ...validUnitDef, id: undefined }, path: 'id' },
      {
        name: 'missing buildOptions',
        value: { ...validUnitDef, buildOptions: undefined },
        path: 'buildOptions'
      },
      { name: 'invalid buildSpeed type', value: { ...validUnitDef, buildSpeed: 'fast' }, path: 'buildSpeed' },
      { name: 'extra property', value: { ...validUnitDef, unknownKey: true }, path: 'unknownKey' }
    ];

    for (const testCase of invalidCases) {
      const res = UnitDefRecordSchema.safeParse(testCase.value);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(
          res.error.issues.some(
            (issue) =>
              issue.path.includes(testCase.path) ||
              ((issue as { keys?: string[] }).keys?.includes(testCase.path) ?? false)
          )
        ).toBe(true);
      }
    }
  });

  it('accepts valid snapshot', () => {
    expect(UnitSnapshotSchema.parse(validSnapshot)).toEqual(validSnapshot);
  });

  it('rejects invalid snapshot', () => {
    expect(UnitSnapshotSchema.safeParse({ ...validSnapshot, schemaVersion: 2 }).success).toBe(false);
    expect(UnitSnapshotSchema.safeParse({ ...validSnapshot, source: 'invalid-source' }).success).toBe(false);
    expect(UnitSnapshotSchema.safeParse({ ...validSnapshot, extra: 'not-allowed' }).success).toBe(false);
  });

  it('accepts valid snapshot index', () => {
    expect(SnapshotIndexSchema.parse(validSnapshotIndex)).toEqual(validSnapshotIndex);
  });

  it('rejects invalid snapshot index', () => {
    expect(SnapshotIndexSchema.safeParse({ ...validSnapshotIndex, schemaVersion: 0 }).success).toBe(false);
    expect(SnapshotIndexSchema.safeParse({ ...validSnapshotIndex, default: 123 }).success).toBe(false);
    expect(
      SnapshotIndexSchema.safeParse({
        ...validSnapshotIndex,
        available: [{ gameVersion: 'v1' }]
      }).success
    ).toBe(false);
  });
});
