import { describe, expect, it } from 'vitest';
import type { AliasesFile, FactionsFile } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';
import { createRegistry, normalizeLookupKey } from './registry';
import snapshotData from './__test__/test-snapshot.json';

const testSnapshot = UnitSnapshotSchema.parse(snapshotData);

const testFactions: FactionsFile = {
  schemaVersion: 1,
  factions: [
    {
      id: 'armada',
      displayName: 'Armada',
      unitPrefix: 'arm',
      enabled: true,
      accent: '#449bed',
      commanderIds: ['armcom']
    },
    {
      id: 'cortex',
      displayName: 'Cortex',
      unitPrefix: 'cor',
      enabled: true,
      accent: '#ff2244',
      commanderIds: ['corcom']
    },
    {
      id: 'legion',
      displayName: 'Legion',
      unitPrefix: 'leg',
      enabled: false,
      accent: '#2ec4b6',
      commanderIds: ['legcom']
    }
  ]
};

const testAliases: AliasesFile = {
  schemaVersion: 1,
  aliases: [
    { alias: 'Pawn', unitId: 'armpw', kind: 'legacy-name' },
    { alias: 'LLT', unitId: 'armllt', kind: 'abbreviation' },
    { alias: 'LLT', unitId: 'corllt', kind: 'abbreviation' },
    { alias: 'Mex', unitId: 'armmex', kind: 'nickname' },
    { alias: 'Mex', unitId: 'cormex', kind: 'nickname' },
    { alias: 'GhostUnit', unitId: 'nonexistent', kind: 'nickname' }
  ]
};

describe('Registry', () => {
  const registry = createRegistry(testSnapshot, testFactions, testAliases);

  it('exposes the gameVersion from the snapshot', () => {
    expect(registry.gameVersion).toBe('Beyond All Reason test-fixture');
  });

  describe('get', () => {
    it('retrieves unit by exact id', () => {
      const unit = registry.get('armpw');
      expect(unit).toBeDefined();
      expect(unit?.id).toBe('armpw');
    });

    it('retrieves unit case-insensitively', () => {
      const unit = registry.get('ARMPW');
      expect(unit).toBeDefined();
      expect(unit?.id).toBe('armpw');
    });

    it('returns undefined for unknown unit', () => {
      expect(registry.get('unknown_unit')).toBeUndefined();
    });
  });

  describe('resolve', () => {
    it('resolves exact unitId', () => {
      const res = registry.resolve('armpw');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.id).toBe('armpw');
      }
    });

    it('resolves exact current name (case-insensitive, whitespace collapsed)', () => {
      const res = registry.resolve('  Light   Laser   Tower  ', 'armada');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.id).toBe('armllt');
      }
    });

    it('resolves exact alias when unique', () => {
      const res = registry.resolve('Pawn');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.id).toBe('armpw');
      }
    });

    it('resolves cross-faction alias when narrowed by faction (03 §3, T01.7)', () => {
      const resArm = registry.resolve('LLT', 'armada');
      expect(resArm.kind).toBe('unit');
      if (resArm.kind === 'unit') {
        expect(resArm.unit.id).toBe('armllt');
      }

      const resCor = registry.resolve('LLT', 'cortex');
      expect(resCor.kind).toBe('unit');
      if (resCor.kind === 'unit') {
        expect(resCor.unit.id).toBe('corllt');
      }
    });

    it('returns ambiguous for cross-faction alias without faction (03 §3, T01.7)', () => {
      const res = registry.resolve('LLT');
      expect(res.kind).toBe('ambiguous');
      if (res.kind === 'ambiguous') {
        expect(res.candidates.map((c) => c.id).sort()).toEqual(['armllt', 'corllt']);
      }
    });

    it('returns none for dropped same-faction ambiguous alias (T01.7)', () => {
      const res = registry.resolve('Raider', 'cortex');
      expect(res.kind).toBe('none');
    });

    it('returns ambiguous when multiple units share the same current name without faction', () => {
      const res = registry.resolve('Metal Extractor');
      expect(res.kind).toBe('ambiguous');
      if (res.kind === 'ambiguous') {
        expect(res.candidates.map((c) => c.id).sort()).toEqual(['armmex', 'cormex']);
      }
    });

    it('narrows ambiguous current name when factionId is provided', () => {
      const resArm = registry.resolve('Metal Extractor', 'armada');
      expect(resArm.kind).toBe('unit');
      if (resArm.kind === 'unit') {
        expect(resArm.unit.id).toBe('armmex');
      }

      const resCor = registry.resolve('Metal Extractor', 'cortex');
      expect(resCor.kind).toBe('unit');
      if (resCor.kind === 'unit') {
        expect(resCor.unit.id).toBe('cormex');
      }
    });

    it('returns ambiguous when multiple units share the same alias without faction', () => {
      const res = registry.resolve('Mex');
      expect(res.kind).toBe('ambiguous');
      if (res.kind === 'ambiguous') {
        expect(res.candidates.map((c) => c.id).sort()).toEqual(['armmex', 'cormex']);
      }
    });

    it('narrows ambiguous alias when factionId is provided', () => {
      const res = registry.resolve('Mex', 'armada');
      expect(res.kind).toBe('unit');
      if (res.kind === 'unit') {
        expect(res.unit.id).toBe('armmex');
      }
    });

    it('returns none when faction narrowing produces 0 candidates', () => {
      const res = registry.resolve('Metal Extractor', 'legion');
      expect(res.kind).toBe('none');
    });

    it('returns none when alias faction narrowing produces 0 candidates', () => {
      const res = registry.resolve('Mex', 'legion');
      expect(res.kind).toBe('none');
    });

    it('returns none for unknown text', () => {
      expect(registry.resolve('NonExistentUnit')).toEqual({ kind: 'none' });
    });

    it('returns none for empty or whitespace-only text', () => {
      expect(registry.resolve('')).toEqual({ kind: 'none' });
      expect(registry.resolve('   ')).toEqual({ kind: 'none' });
    });

    it('does NOT perform substring matching', () => {
      expect(registry.resolve('paw')).toEqual({ kind: 'none' });
      expect(registry.resolve('extrac')).toEqual({ kind: 'none' });
      expect(registry.resolve('laser')).toEqual({ kind: 'none' });
    });

    it('filters exact unitId if factionId does not match', () => {
      expect(registry.resolve('armpw', 'cortex')).toEqual({ kind: 'none' });
      const match = registry.resolve('armpw', 'armada');
      expect(match.kind).toBe('unit');
    });
  });

  describe('byFaction', () => {
    it('returns units matching the given factionId', () => {
      const armadaUnits = registry.byFaction('armada');
      expect(armadaUnits.length).toBeGreaterThan(0);
      expect(armadaUnits.every((u) => u.factionId === 'armada')).toBe(true);

      const cortexUnits = registry.byFaction('cortex');
      expect(cortexUnits.length).toBeGreaterThan(0);
      expect(cortexUnits.every((u) => u.factionId === 'cortex')).toBe(true);
    });

    it('returns empty array for unused faction', () => {
      expect(registry.byFaction('unknown')).toEqual([]);
    });
  });

  describe('commanderOf', () => {
    it('returns commander for armada', () => {
      const com = registry.commanderOf('armada');
      expect(com.id).toBe('armcom');
      expect(com.isCommander).toBe(true);
    });

    it('returns commander for cortex', () => {
      const com = registry.commanderOf('cortex');
      expect(com.id).toBe('corcom');
      expect(com.isCommander).toBe(true);
    });

    it('throws error for unknown faction', () => {
      expect(() => registry.commanderOf('unknown')).toThrow(/Unknown faction/);
    });

    it('throws error if commander unit is not found in snapshot', () => {
      expect(() => registry.commanderOf('legion')).toThrow(/not found in snapshot/);
    });
  });

  describe('canBuild', () => {
    it('returns true if builder has unit in buildOptions', () => {
      expect(registry.canBuild('armlab', 'armpw')).toBe(true);
      expect(registry.canBuild('armlab', 'armck')).toBe(true);
      expect(registry.canBuild('armck', 'armmex')).toBe(true);
    });

    it('returns false if builder does not have unit in buildOptions', () => {
      expect(registry.canBuild('armlab', 'armsolar')).toBe(false);
      expect(registry.canBuild('armpw', 'armck')).toBe(false);
    });

    it('returns false for unknown builder', () => {
      expect(registry.canBuild('unknown', 'armpw')).toBe(false);
    });
  });

  describe('buildersOf', () => {
    it('returns all units capable of building the target', () => {
      const builders = registry.buildersOf('armmex');
      const builderIds = builders.map((b) => b.id).sort();
      expect(builderIds).toEqual(['armck', 'armcom']);
    });

    it('returns empty array for units that cannot be built by anyone', () => {
      expect(registry.buildersOf('armcom')).toEqual([]);
    });
  });

  describe('classify', () => {
    it('classifies commander', () => {
      expect(registry.classify('armcom')).toBe('commander');
      expect(registry.classify('corcom')).toBe('commander');
    });

    it('classifies factory', () => {
      expect(registry.classify('armlab')).toBe('factory');
      expect(registry.classify('corlab')).toBe('factory');
    });

    it('classifies mobile builder', () => {
      expect(registry.classify('armck')).toBe('builder');
    });

    it('classifies stationary build turret', () => {
      expect(registry.classify('armnanotc')).toBe('turret');
    });

    it('classifies eco-metal (metal extractor)', () => {
      expect(registry.classify('armmex')).toBe('eco-metal');
      expect(registry.classify('cormex')).toBe('eco-metal');
    });

    it('classifies converter', () => {
      expect(registry.classify('armmakr')).toBe('converter');
    });

    it('classifies eco-energy (solar / wind / tidal)', () => {
      expect(registry.classify('armsolar')).toBe('eco-energy');
      expect(registry.classify('armwin')).toBe('eco-energy');
    });

    it('classifies storage', () => {
      expect(registry.classify('armmstor')).toBe('storage');
    });

    it('classifies defense', () => {
      expect(registry.classify('armllt')).toBe('defense');
    });

    it('classifies combat', () => {
      expect(registry.classify('armpw')).toBe('combat');
    });

    it('classifies scout', () => {
      expect(registry.classify('armpeep')).toBe('scout');
    });

    it('classifies other', () => {
      expect(registry.classify('armdrag')).toBe('other');
    });

    it('throws error for unknown unit id', () => {
      expect(() => registry.classify('unknown')).toThrow(/Unit not found in registry/);
    });
  });

  describe('normalizeLookupKey helper', () => {
    it('trims, lowercases, and collapses inner whitespace', () => {
      expect(normalizeLookupKey('  ARM   Pw  ')).toBe('arm pw');
    });
  });
});
