import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import defaultSnapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema } from '../schemas';
import { normalizeLookupKey } from './registry';

describe('data/aliases.json validation and invariants against real snapshot (03 §3, T01.4, T03.4)', () => {
  const aliasesFile = AliasesFileSchema.parse(aliasesData);
  const factionsFile = FactionsFileSchema.parse(factionsData);
  const snapshot = UnitSnapshotSchema.parse(defaultSnapshotData);

  it('validates against AliasesFileSchema', () => {
    expect(aliasesFile.schemaVersion).toBe(1);
    expect(aliasesFile.aliases.length).toBeGreaterThan(0);
  });

  function factionOf(unitId: string): string {
    const lower = unitId.toLowerCase();
    for (const f of factionsFile.factions) {
      if (lower.startsWith(f.unitPrefix.toLowerCase())) return f.id;
    }
    return 'unknown';
  }

  it('enforces that all alias unitIds exist in the real snapshot', () => {
    const snapshotIds = new Set(snapshot.units.map((u) => u.id.toLowerCase()));
    for (const entry of aliasesFile.aliases) {
      expect(
        snapshotIds.has(entry.unitId.toLowerCase()),
        `Alias "${entry.alias}" references unitId "${entry.unitId}" which does not exist in real snapshot`
      ).toBe(true);
    }
  });

  it('enforces that all aliases are unique per (normalized alias, faction)', () => {
    const seen = new Map<string, string>();
    for (const entry of aliasesFile.aliases) {
      const norm = normalizeLookupKey(entry.alias);
      const faction = factionOf(entry.unitId);
      const key = `${norm}::${faction}`;
      expect(
        seen.has(key),
        `Duplicate alias found for faction ${faction}: "${entry.alias}" (key: "${norm}") already mapped to ${seen.get(key)}`
      ).toBe(false);
      seen.set(key, entry.unitId);
    }
  });

  it('enforces that no alias maps to two units within one faction', () => {
    const aliasToFactions = new Map<string, Map<string, Set<string>>>();
    for (const entry of aliasesFile.aliases) {
      const norm = normalizeLookupKey(entry.alias);
      const faction = factionOf(entry.unitId);
      if (!aliasToFactions.has(norm)) {
        aliasToFactions.set(norm, new Map());
      }
      const factionMap = aliasToFactions.get(norm)!;
      if (!factionMap.has(faction)) {
        factionMap.set(faction, new Set());
      }
      factionMap.get(faction)!.add(entry.unitId);
    }

    for (const [norm, factionMap] of aliasToFactions.entries()) {
      for (const [faction, units] of factionMap.entries()) {
        expect(
          units.size,
          `Alias "${norm}" maps to multiple units in faction ${faction}: ${Array.from(units).join(', ')}`
        ).toBe(1);
      }
    }
  });

  it("enforces that no alias equals another unit's current name in the real snapshot", () => {
    const currentNameMap = new Map<string, Set<string>>();
    for (const u of snapshot.units) {
      const normName = normalizeLookupKey(u.name);
      if (!currentNameMap.has(normName)) {
        currentNameMap.set(normName, new Set());
      }
      currentNameMap.get(normName)!.add(u.id.toLowerCase());
    }

    for (const entry of aliasesFile.aliases) {
      const normAlias = normalizeLookupKey(entry.alias);
      if (currentNameMap.has(normAlias)) {
        const conflictingSlugs = Array.from(currentNameMap.get(normAlias)!);
        // An alias is allowed to match its own unit name if identical, but must NOT match a different unit's name
        const conflictingOtherUnits = conflictingSlugs.filter((s) => s !== entry.unitId.toLowerCase());
        expect(
          conflictingOtherUnits.length,
          `Alias "${entry.alias}" for ${entry.unitId} collides with current real name of other unit(s): ${conflictingOtherUnits.join(', ')}`
        ).toBe(0);
      }
    }
  });

  it('enforces that every unitId has a known faction prefix', () => {
    const knownPrefixes = factionsFile.factions.map((f) => f.unitPrefix.toLowerCase());

    for (const entry of aliasesFile.aliases) {
      const lowerId = entry.unitId.toLowerCase();
      const hasKnownPrefix = knownPrefixes.some((p) => lowerId.startsWith(p));
      expect(
        hasKnownPrefix,
        `Unit ID "${entry.unitId}" for alias "${entry.alias}" does not start with any known prefix: ${knownPrefixes.join(', ')}`
      ).toBe(true);
    }
  });
});
