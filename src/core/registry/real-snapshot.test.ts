import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import defaultSnapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import goldenP02 from './__golden__/p02-regression.json';
import goldenSummary from './__golden__/snapshot-summary.json';
import { classifyUnit, createRegistry } from './registry';
import {
  AliasesFileSchema,
  FactionsFileSchema,
  UnitSnapshotSchema,
  type UnitSnapshot
} from '../schemas';

describe('Real-data tests for the registry', () => {
  const snapshot: UnitSnapshot = UnitSnapshotSchema.parse(defaultSnapshotData);
  const factions = FactionsFileSchema.parse(factionsData);
  const aliases = AliasesFileSchema.parse(aliasesData);

  const registry = createRegistry(snapshot, factions, aliases);

  describe('Default real snapshot and commander invariants', () => {
    it('has armcom as armada commander and corcom as cortex commander', () => {
      expect(registry.commanderOf('armada').id).toBe('armcom');
      expect(registry.commanderOf('cortex').id).toBe('corcom');
    });

    it('enforces that every enabled faction has >= 1 factory, builder, eco-metal and eco-energy unit', () => {
      const enabledFactions = factions.factions.filter((f) => f.enabled);
      expect(enabledFactions.length).toBeGreaterThanOrEqual(2);

      for (const faction of enabledFactions) {
        const units = registry.byFaction(faction.id);
        const classes = units.map((u) => classifyUnit(u));

        const factoryCount = classes.filter((c) => c === 'factory').length;
        const builderCount = classes.filter((c) => c === 'builder').length;
        const ecoMetalCount = classes.filter((c) => c === 'eco-metal').length;
        const ecoEnergyCount = classes.filter((c) => c === 'eco-energy').length;

        expect(
          factoryCount,
          `Faction ${faction.id} must have >= 1 factory, found ${factoryCount}`
        ).toBeGreaterThanOrEqual(1);
        expect(
          builderCount,
          `Faction ${faction.id} must have >= 1 builder, found ${builderCount}`
        ).toBeGreaterThanOrEqual(1);
        expect(
          ecoMetalCount,
          `Faction ${faction.id} must have >= 1 eco-metal, found ${ecoMetalCount}`
        ).toBeGreaterThanOrEqual(1);
        expect(
          ecoEnergyCount,
          `Faction ${faction.id} must have >= 1 eco-energy, found ${ecoEnergyCount}`
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('matches the golden summary of counts per faction x class', () => {
      const actualSummary: Record<string, Record<string, number>> = {};

      for (const u of snapshot.units) {
        const faction = u.factionId ?? 'neutral';
        const cls = classifyUnit(u);

        if (!actualSummary[faction]) {
          actualSummary[faction] = {};
        }
        actualSummary[faction][cls] = (actualSummary[faction][cls] ?? 0) + 1;
      }

      // Sort keys
      const sortedActual: Record<string, Record<string, number>> = {};
      for (const faction of Object.keys(actualSummary).sort()) {
        sortedActual[faction] = {};
        for (const cls of Object.keys(actualSummary[faction]!).sort()) {
          sortedActual[faction][cls] = actualSummary[faction]![cls]!;
        }
      }

      expect(sortedActual).toEqual(goldenSummary);
    });
  });

  describe('old-name regression tests against snapshot truth', () => {
    const p02Keys = [
      'armflash',
      'armkam',
      'corwolv',
      'armliche',
      'armzeus',
      'armrectr',
      'cornecro'
    ] as const;

    for (const unitId of p02Keys) {
      it(`asserts real name and faction for audited unit: ${unitId}`, () => {
        const unit = registry.get(unitId);
        expect(unit, `Unit ${unitId} must exist in real snapshot`).toBeDefined();

        const expected = goldenP02[unitId];
        expect(expected, `Golden record for ${unitId} must exist`).toBeDefined();

        expect(unit?.name).toBe(expected.name);
        expect(unit?.factionId).toBe(expected.factionId);
      });
    }

    it('proves the old-name corrections against the real snapshot', () => {
      // Blitz is Armada (armflash), not Cortex
      const armflash = registry.get('armflash');
      expect(armflash?.name).toBe('Blitz');
      expect(armflash?.factionId).toBe('armada');

      // Banshee is Armada (armkam), not Cortex
      const armkam = registry.get('armkam');
      expect(armkam?.name).toBe('Banshee');
      expect(armkam?.factionId).toBe('armada');

      // Wolverine is Cortex (corwolv), not Armada
      const corwolv = registry.get('corwolv');
      expect(corwolv?.name).toBe('Wolverine');
      expect(corwolv?.factionId).toBe('cortex');

      // Liche is Armada (armliche), not Cortex
      const armliche = registry.get('armliche');
      expect(armliche?.name).toBe('Liche');
      expect(armliche?.factionId).toBe('armada');

      // Welder is Armada (armzeus), not Cortex
      const armzeus = registry.get('armzeus');
      expect(armzeus?.name).toBe('Welder');
      expect(armzeus?.factionId).toBe('armada');

      // Lazarus is armrectr (Armada), not armlatnk
      const armrectr = registry.get('armrectr');
      expect(armrectr?.name).toBe('Lazarus');
      expect(armrectr?.factionId).toBe('armada');

      // Graverobber is Cortex (cornecro)
      const cornecro = registry.get('cornecro');
      expect(cornecro?.name).toBe('Graverobber');
      expect(cornecro?.factionId).toBe('cortex');
    });
  });

  describe('Registry resolution on real snapshot data', () => {
    it('resolves by unitId', () => {
      const res = registry.resolve('armflash');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.name).toBe('Blitz');
        expect(res.unit.factionId).toBe('armada');
      }
    });

    it('resolves by current display name', () => {
      const res = registry.resolve('Blitz');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.id).toBe('armflash');
      }
    });

    it('resolves by legacy alias with faction filter', () => {
      const res = registry.resolve('Flash', 'armada');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.id).toBe('armflash');
      }
    });

    it('resolves cross-faction alias narrowed by faction', () => {
      const armRes = registry.resolve('LLT', 'armada');
      expect(armRes.kind).toBe('unit');
      if (armRes.kind === 'unit') {
        expect(armRes.unit.id).toBe('armllt');
      }

      const corRes = registry.resolve('LLT', 'cortex');
      expect(corRes.kind).toBe('unit');
      if (corRes.kind === 'unit') {
        expect(corRes.unit.id).toBe('corllt');
      }

      const ambigRes = registry.resolve('LLT');
      expect(ambigRes.kind).toBe('ambiguous');
    });
  });
});
