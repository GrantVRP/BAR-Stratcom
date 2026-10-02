import { describe, expect, it } from 'vitest';
import type { UnitDefRecord } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';
import syntheticSnapshotData from '../registry/__test__/test-snapshot.json';
import realSnapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import {
  applyStorage,
  computeIncome,
  computeTotalStorage,
  createEconomyState,
  runConverters,
  type EconomyState,
  type SimMapEco
} from './economy';
import { DEFAULT_CONVERTER_THRESHOLD } from './constants';

const syntheticSnapshot = UnitSnapshotSchema.parse(syntheticSnapshotData);
const realSnapshot = UnitSnapshotSchema.parse(realSnapshotData);

function getSyntheticUnit(id: string): UnitDefRecord {
  const found = syntheticSnapshot.units.find((u) => u.id === id);
  if (!found) throw new Error(`Unit not found in synthetic snapshot: ${id}`);
  return found;
}

function getRealUnit(id: string): UnitDefRecord {
  const found = realSnapshot.units.find((u) => u.id === id);
  if (!found) throw new Error(`Unit not found in real snapshot: ${id}`);
  return found;
}

describe('Sim: economy', () => {
  const baseMap: SimMapEco = {
    mexYield: 2.0,
    tidalStrength: 15,
    windAvg: 12,
    windMin: 5,
    windMax: 25,
    mexYieldProvenance: 'estimated'
  };

  describe('computeIncome', () => {
    it('handles solar only with negative upkeep (energyUpkeep: -20 -> +20 E/s)', () => {
      const syntheticSolar = getSyntheticUnit('armsolar');
      const negativeUpkeepSolar: UnitDefRecord = {
        ...syntheticSolar,
        economy: { ...syntheticSolar.economy, energyMake: 0, energyUpkeep: -20 }
      };

      const result = computeIncome([negativeUpkeepSolar], baseMap, 10);
      expect(result.metal).toBe(0);
      expect(result.energy).toBe(20);
      expect(result.breakdown.energy.make).toBe(0);
      expect(result.breakdown.energy.upkeep).toBe(-20);
      expect(result.breakdown.energy.total).toBe(20);
      expect(result.flags.windUnknown).toBe(false);
    });

    it('computes income for 2 mex + commander correctly', () => {
      // Commander: metalMake 1, energyMake 25. Mex: extracts 0.001, upkeep 3.
      // Metal = 1 + 2 * 2.2 = 5.4. Energy = 25 - 2 * 3 = 19.
      const commander = getSyntheticUnit('armcom');
      const mex = getSyntheticUnit('armmex');
      const map: SimMapEco = { ...baseMap, mexYield: 2.2 };

      const result = computeIncome([commander, mex, mex], map, 10);
      expect(result.metal).toBeCloseTo(5.4, 5);
      expect(result.energy).toBe(19);
      expect(result.breakdown.metal.make).toBe(1);
      expect(result.breakdown.metal.extractors).toBeCloseTo(4.4, 5);
      expect(result.breakdown.metal.upkeep).toBe(0);
      expect(result.breakdown.energy.make).toBe(25);
      expect(result.breakdown.energy.upkeep).toBe(6);
    });

    it('scales metal extractors proportionally by extractsMetal ratio for T2', () => {
      const mex = getSyntheticUnit('armmex');
      const t2Mex: UnitDefRecord = {
        ...mex,
        economy: { ...mex.economy, extractsMetal: 0.004, energyUpkeep: 20 }
      };
      const map: SimMapEco = { ...baseMap, mexYield: 2.5 };
      const result = computeIncome([t2Mex], map, 10);
      // 2.5 * (0.004 / 0.001) = 10 M/s, upkeep 20 E/s
      expect(result.metal).toBe(10);
      expect(result.energy).toBe(-20);
    });

    it('respects custom baseMexExtractsMetal in options', () => {
      const mex = getSyntheticUnit('armmex');
      const map: SimMapEco = { ...baseMap, mexYield: 3.0 };
      const result = computeIncome([mex], map, 10, { baseMexExtractsMetal: 0.002 });
      expect(result.metal).toBe(1.5);
    });

    it('evaluates wind generation at avg 8 vs capped at generator cap of 25 with wind 30', () => {
      const windTurbine = getSyntheticUnit('armwin'); // cap 25
      const resultAt8 = computeIncome([windTurbine], baseMap, 8);
      expect(resultAt8.energy).toBe(8);
      expect(resultAt8.breakdown.energy.wind).toBe(8);
      expect(resultAt8.flags.windUnknown).toBe(false);

      const resultAt30 = computeIncome([windTurbine], baseMap, 30);
      expect(resultAt30.energy).toBe(25);
      expect(resultAt30.breakdown.energy.wind).toBe(25);
      expect(resultAt30.flags.windUnknown).toBe(false);
    });

    it('flags windUnknown and sets wind income to 0 when windNow is null', () => {
      const windTurbine = getSyntheticUnit('armwin');
      const result = computeIncome([windTurbine], baseMap, null);
      expect(result.energy).toBe(0);
      expect(result.breakdown.energy.wind).toBe(0);
      expect(result.flags.windUnknown).toBe(true);
    });

    it('falls back to map.windAvg when windNow is undefined, flagging unknown if null', () => {
      const windTurbine = getSyntheticUnit('armwin');
      const mapWithoutWind: SimMapEco = { ...baseMap, windAvg: null };
      const result = computeIncome([windTurbine], mapWithoutWind, undefined);
      expect(result.energy).toBe(0);
      expect(result.flags.windUnknown).toBe(true);
    });

    it('computes tidal generation based on map tidalStrength', () => {
      const armsolar = getSyntheticUnit('armsolar');
      const tidalGen: UnitDefRecord = {
        ...armsolar,
        id: 'armtide',
        name: 'Tidal Generator',
        economy: { ...armsolar.economy, energyMake: 0, energyUpkeep: 0, tidalGenerator: 1 }
      };
      const result = computeIncome([tidalGen], { ...baseMap, tidalStrength: 18 }, 0);
      expect(result.energy).toBe(18);
      expect(result.breakdown.energy.tidal).toBe(18);
    });
  });

  describe('runConverters', () => {
    const converter = getSyntheticUnit('armmakr'); // 70 E/s, 0.014 M/E

    it('remains OFF when energy is below threshold', () => {
      const state: EconomyState = {
        metal: { current: 100, storage: 1000 },
        energy: { current: 899, storage: 1000 }
      };
      const result = runConverters(state, [converter], 1.0, DEFAULT_CONVERTER_THRESHOLD);
      expect(result.energyConverted).toBe(0);
      expect(result.metalProduced).toBe(0);
      expect(result.state.energy.current).toBe(899);
      expect(result.state.metal.current).toBe(100);
    });

    it('turns ON when energy is at or above threshold and converts energy to metal', () => {
      const state: EconomyState = {
        metal: { current: 100, storage: 1000 },
        energy: { current: 950, storage: 1000 }
      };
      const result = runConverters(state, [converter], 1.0, DEFAULT_CONVERTER_THRESHOLD);
      expect(result.energyConverted).toBe(70);
      expect(result.metalProduced).toBeCloseTo(0.98, 5);
      expect(result.state.energy.current).toBe(880);
      expect(result.state.metal.current).toBeCloseTo(100.98, 5);
    });

    it('scales conversion proportionally with timestep dt', () => {
      const state: EconomyState = {
        metal: { current: 100, storage: 1000 },
        energy: { current: 950, storage: 1000 }
      };
      const result = runConverters(state, [converter], 0.5, DEFAULT_CONVERTER_THRESHOLD);
      expect(result.energyConverted).toBe(35);
      expect(result.metalProduced).toBeCloseTo(0.49, 5);
      expect(result.state.energy.current).toBe(915);
      expect(result.state.metal.current).toBeCloseTo(100.49, 5);
    });

    it('caps conversion to available energy when energy < total demand', () => {
      const state: EconomyState = {
        metal: { current: 0, storage: 1000 },
        energy: { current: 50, storage: 50 }
      };
      const result = runConverters(state, [converter], 1.0, 0.9);
      expect(result.energyConverted).toBe(50);
      expect(result.metalProduced).toBeCloseTo(50 * 0.014, 5);
      expect(result.state.energy.current).toBe(0);
      expect(result.state.metal.current).toBeCloseTo(0.7, 5);
    });

    it('returns zero conversion when energy.current is 0 even if threshold is 0', () => {
      const state: EconomyState = {
        metal: { current: 100, storage: 1000 },
        energy: { current: 0, storage: 1000 }
      };
      const result = runConverters(state, [converter], 1.0, 0);
      expect(result.energyConverted).toBe(0);
      expect(result.metalProduced).toBe(0);
      expect(result.state.energy.current).toBe(0);
    });

    it('returns zero conversion when list has no converters or demand is 0', () => {
      const state: EconomyState = {
        metal: { current: 100, storage: 1000 },
        energy: { current: 1000, storage: 1000 }
      };
      const commander = getSyntheticUnit('armcom');
      const result = runConverters(state, [commander], 1.0);
      expect(result.energyConverted).toBe(0);
      expect(result.metalProduced).toBe(0);
      expect(result.state).toBe(state);
    });

    it('clamps metal to metalStorage if conversion exceeds capacity', () => {
      const state: EconomyState = {
        metal: { current: 999.5, storage: 1000 },
        energy: { current: 950, storage: 1000 }
      };
      const result = runConverters(state, [converter], 1.0);
      expect(result.energyConverted).toBe(70);
      expect(result.metalProduced).toBeCloseTo(0.98, 5);
      expect(result.state.metal.current).toBe(1000);
    });
  });

  describe('applyStorage', () => {
    it('discards overflow above storage and flags float when storage >= 99% and net income > 0', () => {
      const state: EconomyState = {
        metal: { current: 995, storage: 1000 },
        energy: { current: 500, storage: 1000 }
      };
      const result = applyStorage(state, 1.0, { metal: 10, energy: 0 }, { metal: 0, energy: 0 });
      expect(result.state.metal.current).toBe(1000);
      expect(result.overflow.metal).toBe(5);
      expect(result.overflow.energy).toBe(0);
      expect(result.float.metal).toBe(true);
      expect(result.float.energy).toBe(false);
    });

    it('flags energy float and discards energy overflow', () => {
      const state: EconomyState = {
        metal: { current: 500, storage: 1000 },
        energy: { current: 998, storage: 1000 }
      };
      const result = applyStorage(state, 1.0, { metal: 0, energy: 20 }, { metal: 0, energy: 0 });
      expect(result.state.energy.current).toBe(1000);
      expect(result.overflow.energy).toBe(18);
      expect(result.float.energy).toBe(true);
      expect(result.float.metal).toBe(false);
    });

    it('does not flag float when resources decrease even if stored level is high', () => {
      const state: EconomyState = {
        metal: { current: 995, storage: 1000 },
        energy: { current: 995, storage: 1000 }
      };
      const result = applyStorage(state, 1.0, { metal: 5, energy: 0 }, { metal: 20, energy: 50 });
      expect(result.state.metal.current).toBe(980);
      expect(result.state.energy.current).toBe(945);
      expect(result.float.metal).toBe(false);
      expect(result.float.energy).toBe(false);
    });

    it('does not flag float when stored is below 99% threshold', () => {
      const state: EconomyState = {
        metal: { current: 500, storage: 1000 },
        energy: { current: 500, storage: 1000 }
      };
      const result = applyStorage(state, 1.0, { metal: 10, energy: 10 });
      expect(result.state.metal.current).toBe(510);
      expect(result.state.energy.current).toBe(510);
      expect(result.float.metal).toBe(false);
      expect(result.float.energy).toBe(false);
    });

    it('clamps current resources at zero when spend exceeds storage', () => {
      const state: EconomyState = {
        metal: { current: 10, storage: 1000 },
        energy: { current: 5, storage: 1000 }
      };
      const result = applyStorage(state, 1.0, { metal: 0, energy: 0 }, { metal: 50, energy: 20 });
      expect(result.state.metal.current).toBe(0);
      expect(result.state.energy.current).toBe(0);
    });
  });

  describe('computeTotalStorage and createEconomyState', () => {
    it('accumulates storage from completed units', () => {
      const commander = getSyntheticUnit('armcom'); // 500 M, 500 E
      const mex = getSyntheticUnit('armmex'); // 50 M, 50 E
      const mstor = getSyntheticUnit('armmstor'); // 1000 M
      const storage = computeTotalStorage(
        { metalStorage: 1000, energyStorage: 1000 },
        [commander, mex, mstor]
      );
      expect(storage.metalStorage).toBe(2550);
      expect(storage.energyStorage).toBe(1550);
    });

    it('initializes EconomyState clamping start resources to storage capacity', () => {
      const state = createEconomyState({
        metal: 2000,
        energy: 500,
        metalStorage: 1000,
        energyStorage: 1000
      });
      expect(state.metal.current).toBe(1000);
      expect(state.metal.storage).toBe(1000);
      expect(state.energy.current).toBe(500);
      expect(state.energy.storage).toBe(1000);
    });

    it('initializes EconomyState with completed units contributing storage capacity', () => {
      const commander = getSyntheticUnit('armcom'); // 500 M, 500 E storage
      const state = createEconomyState(
        { metal: 1200, energy: 1200, metalStorage: 1000, energyStorage: 1000 },
        [commander]
      );
      expect(state.metal.storage).toBe(1500);
      expect(state.energy.storage).toBe(1500);
      expect(state.metal.current).toBe(1200);
      expect(state.energy.current).toBe(1200);
    });
  });

  describe('real snapshot regression checks', () => {
    it('verifies real armsolar produces +20 E/s via negative energyUpkeep: -20', () => {
      const realSolar = getRealUnit('armsolar');
      expect(realSolar.economy.energyMake).toBe(0);
      expect(realSolar.economy.energyUpkeep).toBe(-20);
      const result = computeIncome([realSolar], baseMap, 10);
      expect(result.energy).toBe(20);
    });

    it('verifies real armtide generates tidal energy via tidalGenerator', () => {
      const realTide = getRealUnit('armtide');
      expect(realTide.economy.tidalGenerator).toBe(1);
      const result = computeIncome([realTide], { ...baseMap, tidalStrength: 22 }, 10);
      expect(result.energy).toBe(22);
    });

    it('verifies real armcom produces +2 M/s and +30 E/s', () => {
      const realCom = getRealUnit('armcom');
      expect(realCom.economy.metalMake).toBe(2);
      expect(realCom.economy.energyMake).toBe(30);
      const result = computeIncome([realCom], baseMap, 10);
      expect(result.metal).toBe(2);
      expect(result.energy).toBe(30);
    });

    it('verifies real armmakr conversion rate 70 E/s -> 1 M/s (approx)', () => {
      const realMakr = getRealUnit('armmakr');
      expect(realMakr.economy.converter).not.toBeNull();
      expect(realMakr.economy.converter?.energyPerSecond).toBe(70);
      expect(realMakr.economy.converter?.metalPerEnergy).toBeCloseTo(0.01429, 4);

      const state: EconomyState = {
        metal: { current: 100, storage: 1000 },
        energy: { current: 950, storage: 1000 }
      };

      const result = runConverters(state, [realMakr], 1.0);
      expect(result.energyConverted).toBe(70);
      expect(result.metalProduced).toBeCloseTo(1.0, 1);
    });
  });
});
