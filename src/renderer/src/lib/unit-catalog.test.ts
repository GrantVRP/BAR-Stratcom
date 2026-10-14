import { describe, expect, it } from 'vitest';
import aliasesData from '../../../../data/aliases.json';
import factionsData from '../../../../data/factions.json';
import snapshotData from '../../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../../../core/registry';
import { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema } from '../../../core/schemas';
import { buildableFrom, filterCatalog, techLevelsOf, type CatalogFilter } from './unit-catalog';

const registry = createRegistry(
  UnitSnapshotSchema.parse(snapshotData),
  FactionsFileSchema.parse(factionsData),
  AliasesFileSchema.parse(aliasesData)
);
const base: CatalogFilter = { factionId: 'armada', unitClass: 'all', tech: 'all', query: '' };

describe('unit catalog filtering', () => {
  it('lists one faction with tech levels in rising order (T1, T1.5, T2, T3)', () => {
    const all = filterCatalog(registry, base);
    expect(all.length).toBe(registry.byFaction('armada').length);
    expect(all.every((e) => e.unit.factionId === 'armada')).toBe(true);
    const techs = all.map((e) => e.unit.techLevel ?? 9);
    expect(techs).toEqual([...techs].sort((a, b) => a - b));
    expect(new Set(techs)).toEqual(new Set([1, 1.5, 2, 3]));
  });

  it('finds a unit by its legacy name and shows it first under the current name', () => {
    const hits = filterCatalog(registry, { ...base, query: 'Rocko' });
    expect(hits[0]).toMatchObject({ match: 'exact', unit: { id: 'armrock' } });
    expect(hits[0]!.unit.name).toBe(registry.get('armrock')!.name);
  });

  it('matches part of a name or id, and filters by class and tech', () => {
    const solar = filterCatalog(registry, { ...base, query: 'solar' });
    expect(solar.map((e) => e.unit.id)).toEqual(expect.arrayContaining(['armsolar']));
    expect(filterCatalog(registry, { ...base, query: 'armmex' })[0]!.unit.id).toBe('armmex');

    const energy = filterCatalog(registry, { ...base, unitClass: 'eco-energy' });
    expect(energy.map((e) => e.unit.id)).toEqual(expect.arrayContaining(['armsolar', 'armwin']));
    expect(energy.every((e) => e.unitClass === 'eco-energy')).toBe(true);

    const t2 = filterCatalog(registry, { ...base, tech: 2 });
    expect(t2.length).toBeGreaterThan(0);
    expect(t2.every((e) => e.unit.techLevel === 2)).toBe(true);
  });

  it('returns nothing for a search with no match, and lists the tech levels present', () => {
    expect(filterCatalog(registry, { ...base, query: 'zzzz-no-such-unit' })).toEqual([]);
    expect(techLevelsOf(registry, 'cortex')).toEqual(expect.arrayContaining([1, 2]));
  });
});

describe('buildable units', () => {
  it('keeps the commander and its build tree, and drops game-mode variants', () => {
    const buildable = buildableFrom(registry, ['armcom']);
    expect(buildable.has('armcom')).toBe(true);
    expect(buildable.has('armlab')).toBe(true);
    expect(buildable.has('armrock')).toBe(true);
    expect(buildable.has('armcomlvl2')).toBe(false);
    const listed = filterCatalog(registry, { ...base, only: buildable });
    expect(listed.length).toBe(buildable.size);
    expect(listed.filter((e) => e.unitClass === 'commander').map((e) => e.unit.id)).toEqual(['armcom']);
  });
});
