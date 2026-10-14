import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import snapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../registry';
import { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema } from '../schemas';
import { factoryDomain, iconSpecFor, type IconSpec } from './icon-spec';

const snapshot = UnitSnapshotSchema.parse(snapshotData);
const registry = createRegistry(snapshot, FactionsFileSchema.parse(factionsData), AliasesFileSchema.parse(aliasesData));

function spec(unitId: string): Pick<IconSpec, 'base' | 'badge'> {
  const unit = registry.get(unitId);
  if (!unit) throw new Error(`missing ${unitId}`);
  const { base, badge } = iconSpecFor(unit, registry);
  return { base, badge };
}

describe('iconSpecFor on the real snapshot', () => {
  it('maps every factory of both factions to its type', () => {
    const factories = snapshot.units.filter((u) => u.isFactory && (u.factionId === 'armada' || u.factionId === 'cortex'));
    expect(factories.length).toBeGreaterThan(30);
    expect(factories.filter((f) => factoryDomain(f.id) === null).map((f) => f.id)).toEqual([]);
    expect([factoryDomain('armlab'), factoryDomain('coravp'), factoryDomain('armplat'), factoryDomain('corasy')]).toEqual([
      'bot',
      'vehicle',
      'air',
      'ship'
    ]);
    expect([factoryDomain('armfhp'), factoryDomain('coramsub'), factoryDomain('corgant'), factoryDomain('armshltxuw')]).toEqual([
      'hover',
      'amphib',
      'gantry',
      'gantry'
    ]);
  });

  it('draws units by body and role', () => {
    expect(spec('armcom')).toEqual({ base: 'commander', badge: null });
    expect(spec('armlab')).toEqual({ base: 'factory', badge: 'bot' });
    expect(spec('armck')).toEqual({ base: 'bot', badge: 'build' });
    expect(spec('corcv')).toEqual({ base: 'vehicle', badge: 'build' });
    expect(spec('armpw')).toEqual({ base: 'bot', badge: null });
    expect(spec('armfast')).toEqual({ base: 'bot', badge: null });
    expect(spec('corpyro')).toEqual({ base: 'bot', badge: null });
    expect(spec('armflash').base).toBe('vehicle');
  });

  it('draws economy and defence buildings from their stats', () => {
    expect(spec('armmex')).toEqual({ base: 'mex', badge: null });
    expect(spec('armsolar')).toEqual({ base: 'solar', badge: null });
    expect(spec('armwin')).toEqual({ base: 'wind', badge: null });
    expect(spec('armfus')).toEqual({ base: 'reactor', badge: null });
    expect(spec('armmakr')).toEqual({ base: 'converter', badge: null });
    expect(spec('armestor')).toEqual({ base: 'storage-energy', badge: null });
    expect(spec('armmstor')).toEqual({ base: 'storage-metal', badge: null });
    expect(spec('armllt')).toEqual({ base: 'turret', badge: null });
    expect(spec('armrl')).toEqual({ base: 'turret', badge: 'aa' });
    expect(spec('armnanotc')).toEqual({ base: 'nano', badge: null });
    expect(spec('armrad')).toEqual({ base: 'radar', badge: null });
    expect(spec('armamd')).toEqual({ base: 'shield', badge: null });
  });

  it('gives every Armada and Cortex unit an icon, with tech level and faction', () => {
    const units = snapshot.units.filter((u) => u.factionId === 'armada' || u.factionId === 'cortex');
    const specs = units.map((u) => iconSpecFor(u, registry));
    expect(specs.every((s) => typeof s.base === 'string')).toBe(true);
    expect(new Set(specs.map((s) => s.base)).size).toBeGreaterThanOrEqual(18);
    const t2 = iconSpecFor(registry.get('armalab')!, registry);
    expect(t2).toMatchObject({ tech: registry.get('armalab')!.techLevel, factionId: 'armada' });
  });
});
