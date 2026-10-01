import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import legacyUnitsData from '../../../legacy/data/bar_units_database.json';
import { AliasesFileSchema, FactionsFileSchema } from '../schemas';
import { normalizeLookupKey } from './registry';

describe('data/aliases.json validation and invariants (03 §3, T01.4)', () => {
  const aliasesFile = AliasesFileSchema.parse(aliasesData);
  const factionsFile = FactionsFileSchema.parse(factionsData);
  const legacyUnits = legacyUnitsData as Array<{ slug: string; name: string }>;

  it('validates against AliasesFileSchema', () => {
    expect(aliasesFile.schemaVersion).toBe(1);
    expect(aliasesFile.aliases.length).toBeGreaterThan(0);
  });

  it('enforces that all aliases are unique after normalization', () => {
    const seen = new Map<string, string>();
    for (const entry of aliasesFile.aliases) {
      const norm = normalizeLookupKey(entry.alias);
      expect(
        seen.has(norm),
        `Duplicate alias found after normalization: "${entry.alias}" (key: "${norm}") already mapped to ${seen.get(norm)}`
      ).toBe(false);
      seen.set(norm, entry.unitId);
    }
  });

  it("enforces that no alias equals another unit's current name", () => {
    // Map normalized current display names to their slugs
    const currentNameMap = new Map<string, Set<string>>();
    for (const u of legacyUnits) {
      const normName = normalizeLookupKey(u.name);
      if (!currentNameMap.has(normName)) {
        currentNameMap.set(normName, new Set());
      }
      currentNameMap.get(normName)!.add(u.slug);
    }

    for (const entry of aliasesFile.aliases) {
      const normAlias = normalizeLookupKey(entry.alias);
      if (currentNameMap.has(normAlias)) {
        const conflictingSlugs = Array.from(currentNameMap.get(normAlias)!);
        // An alias is allowed to match its own unit name if identical, but must NOT match a different unit's name
        const conflictingOtherUnits = conflictingSlugs.filter((s) => s !== entry.unitId);
        expect(
          conflictingOtherUnits.length,
          `Alias "${entry.alias}" for ${entry.unitId} collides with current name of other unit(s): ${conflictingOtherUnits.join(', ')}`
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
