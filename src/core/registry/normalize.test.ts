import { describe, expect, it } from 'vitest';
import type { FactionsFile, RawUnitdefsExport } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';
import { normalizeRawUnit, normalizeRawUnitdefs } from './normalize';

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
    }
  ]
};

describe('normalizeRawUnitdefs', () => {
  it('normalizes a complete raw export into a valid UnitSnapshot', () => {
    const raw: RawUnitdefsExport = {
      protocol: 1,
      kind: 'unitdefs',
      gameVersion: 'Beyond All Reason test-31450',
      engineVersion: '2026.07.04',
      missingFields: [],
      units: [
        {
          name: 'armpw',
          translatedHumanName: 'Pawn',
          translatedTooltip: 'Fast light bot',
          metalCost: 50,
          energyCost: 700,
          buildTime: 1000,
          buildSpeed: 0,
          isBuilder: false,
          isFactory: false,
          isBuilding: false,
          canFly: false,
          canMove: true,
          speed: 2.2,
          health: 320,
          maxWeaponRange: 200,
          sightDistance: 350,
          radarDistance: 0,
          energyMake: 0,
          metalMake: 0,
          energyUpkeep: 0,
          metalUpkeep: 0,
          extractsMetal: 0,
          windGenerator: 0,
          tidalGenerator: 0,
          energyStorage: 0,
          metalStorage: 0,
          buildOptions: [],
          customParams: {
            techlevel: '1',
            unitgroup: 'bots'
          }
        }
      ]
    };

    const snapshot = normalizeRawUnitdefs(raw, testFactions);
    expect(snapshot.gameVersion).toBe('Beyond All Reason test-31450');
    expect(snapshot.units).toHaveLength(1);
    const unit = snapshot.units[0];
    expect(unit).toBeDefined();
    if (!unit) throw new Error('Unit missing');
    expect(unit.id).toBe('armpw');
    expect(unit.name).toBe('Pawn');
    expect(unit.factionId).toBe('armada');
    expect(unit.techLevel).toBe(1);
    expect(unit.unitGroup).toBe('bots');
    expect(unit.missing).toEqual([]);

    // Ensure it strictly validates against UnitSnapshotSchema
    expect(() => UnitSnapshotSchema.parse(snapshot)).not.toThrow();
  });

  it('handles fallbacks for losRadius and radarRadius when sightDistance/radarDistance are omitted', () => {
    const rawUnit = {
      name: 'corak',
      translatedHumanName: 'Grunt',
      losRadius: 330,
      radarRadius: 600
    };

    const unit = normalizeRawUnit(rawUnit, [], testFactions);
    expect(unit.combat.sightDistance).toBe(330);
    expect(unit.combat.radarDistance).toBe(600);
    expect(unit.missing).not.toContain('sightDistance');
    expect(unit.missing).not.toContain('radarDistance');
  });

  it('records missing fields accurately when both field and fallback are absent', () => {
    const rawUnit = {
      name: 'corgun',
      // missing metalCost, energyCost, sightDistance, losRadius, etc.
      translatedHumanName: 'Gunner'
    };

    const unit = normalizeRawUnit(rawUnit, ['globalMissingField'], testFactions);
    expect(unit.missing).toContain('metalCost');
    expect(unit.missing).toContain('energyCost');
    expect(unit.missing).toContain('sightDistance');
    expect(unit.missing).toContain('radarDistance');
    expect(unit.missing).toContain('globalMissingField');
  });

  it('converts customParams converter fields into economy.converter', () => {
    const rawUnit = {
      name: 'armmakr',
      translatedHumanName: 'Energy Converter',
      customParams: {
        energyconv_capacity: '70',
        energyconv_efficiency: '0.014'
      }
    };

    const unit = normalizeRawUnit(rawUnit, [], testFactions);
    expect(unit.economy.converter).toEqual({
      energyPerSecond: 70,
      metalPerEnergy: 0.014
    });
  });

  it('leaves converter as null when converter fields are absent or NaN', () => {
    const rawUnit1 = {
      name: 'armmakr',
      customParams: {}
    };
    expect(normalizeRawUnit(rawUnit1, [], testFactions).economy.converter).toBeNull();

    const rawUnit2 = {
      name: 'armmakr',
      customParams: {
        energyconv_capacity: 'invalid',
        energyconv_efficiency: '0.014'
      }
    };
    expect(normalizeRawUnit(rawUnit2, [], testFactions).economy.converter).toBeNull();
  });

  it('handles customParams iscommander in various representations', () => {
    expect(
      normalizeRawUnit({ name: 'com1', customParams: { iscommander: '1' } }, [], testFactions).isCommander
    ).toBe(true);
    expect(
      normalizeRawUnit({ name: 'com2', customParams: { iscommander: 1 } }, [], testFactions).isCommander
    ).toBe(true);
    expect(
      normalizeRawUnit({ name: 'com3', customParams: { iscommander: true } }, [], testFactions).isCommander
    ).toBe(true);
    expect(
      normalizeRawUnit({ name: 'com4', customParams: { iscommander: 'true' } }, [], testFactions).isCommander
    ).toBe(true);
    expect(
      normalizeRawUnit({ name: 'com5', customParams: { iscommander: '0' } }, [], testFactions).isCommander
    ).toBe(false);
    expect(normalizeRawUnit({ name: 'com6', customParams: {} }, [], testFactions).isCommander).toBe(false);
  });

  it('resolves faction by explicit customParams.faction override', () => {
    const rawUnit = {
      name: 'custom_unit',
      customParams: {
        faction: 'cortex'
      }
    };
    const unit = normalizeRawUnit(rawUnit, [], testFactions);
    expect(unit.factionId).toBe('cortex');
  });

  it('resolves factionId to null when unit id has unknown prefix and no faction param', () => {
    const rawUnit = {
      name: 'neutral_rock'
    };
    const unit = normalizeRawUnit(rawUnit, [], testFactions);
    expect(unit.factionId).toBeNull();
  });
});
