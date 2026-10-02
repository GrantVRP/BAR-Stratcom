import { describe, expect, it } from 'vitest';
import type { UnitDefRecord } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';
import syntheticSnapshotData from '../registry/__test__/test-snapshot.json';
import {
  attachAssists,
  computeBuildPowerStats,
  getEffectiveBuildPower,
  tickConstructions,
  tickReclaims,
  type ActiveConstruction,
  type ActiveReclaim
} from './construction';

const syntheticSnapshot = UnitSnapshotSchema.parse(syntheticSnapshotData);

function getSyntheticUnit(id: string): UnitDefRecord {
  const found = syntheticSnapshot.units.find((u) => u.id === id);
  if (!found) throw new Error(`Unit not found in synthetic snapshot: ${id}`);
  return found;
}

describe('Sim: construction', () => {
  const armlab = getSyntheticUnit('armlab'); // metalCost 600, energyCost 1200, buildTime 1000

  describe('getEffectiveBuildPower and attachAssists', () => {
    it('returns primary build power when no assisters exist', () => {
      const construction: ActiveConstruction = {
        id: 'c1',
        unitDef: armlab,
        buildPower: 100,
        progress: 0
      };
      expect(getEffectiveBuildPower(construction)).toBe(100);
    });

    it('attaches assister build power correctly to target constructions', () => {
      const c1: ActiveConstruction = { id: 'c1', unitDef: armlab, buildPower: 100, progress: 0 };
      const c2: ActiveConstruction = { id: 'c2', unitDef: armlab, buildPower: 50, progress: 0 };

      const assists = [
        { actorId: 'a1', targetConstructionId: 'c1', buildPower: 100 },
        { actorId: 'a2', targetConstructionId: 'c1', buildPower: 50 },
        { actorId: 'a3', targetConstructionId: 'c2', buildPower: 75 }
      ];

      const attached = attachAssists([c1, c2], assists);
      const first = attached[0];
      const second = attached[1];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      if (!first || !second) throw new Error('Expected 2 attached constructions');

      expect(getEffectiveBuildPower(first)).toBe(250); // 100 + 100 + 50
      expect(getEffectiveBuildPower(second)).toBe(125); // 50 + 75
    });

    it('returns cloned constructions when assists array is empty', () => {
      const c1: ActiveConstruction = { id: 'c1', unitDef: armlab, buildPower: 100, progress: 0 };
      const attached = attachAssists([c1], []);
      const first = attached[0];
      expect(first).toBeDefined();
      if (!first) throw new Error('Expected 1 attached construction');
      expect(first.buildPower).toBe(100);
    });
  });

  describe('tickConstructions', () => {
    it('finishes a single builder with ample resources at exactly buildTime/b', () => {
      // Unit buildTime: 1000, buildPower: 100 -> exactly 10.0 seconds
      // dt = 0.5 s -> 20 ticks
      const unitDef: UnitDefRecord = {
        ...armlab,
        buildTime: 1000,
        metalCost: 500,
        energyCost: 1000
      };

      let active: ActiveConstruction[] = [
        { id: 'step-1', unitDef, buildPower: 100, progress: 0 }
      ];
      let totalSpentM = 0;
      let totalSpentE = 0;
      let ticks = 0;
      let completedAtSec = -1;

      const dt = 0.5;
      const ample = { metal: 10000, energy: 10000 };

      while (active.length > 0 && ticks < 50) {
        ticks += 1;
        const res = tickConstructions({
          constructions: active,
          dt,
          available: ample
        });

        expect(res.stallMetal).toBe(false);
        expect(res.stallEnergy).toBe(false);
        expect(res.scale).toBe(1);

        totalSpentM += res.spent.metal;
        totalSpentE += res.spent.energy;

        if (res.completedConstructions.length > 0) {
          completedAtSec = ticks * dt;
        }
        active = res.updatedConstructions;
      }

      expect(ticks).toBe(20);
      expect(completedAtSec).toBe(10.0);
      expect(totalSpentM).toBeCloseTo(500, 5);
      expect(totalSpentE).toBeCloseTo(1000, 5);
      expect(active).toHaveLength(0);
    });

    it('takes about 2x longer when metal is at 0 and income is 1/2 of need', () => {
      // Unit buildTime: 1000, metalCost: 1000, energyCost: 0, bp: 100
      // Normal unconstrained rate: (100 / 1000) * 1000 = 100 M/s
      // Stored metal = 0, metal income = 50 M/s (1/2 need).
      // dt = 0.5 s: each tick need is 50 M, available is 25 M -> scale = 0.5
      // Expected time: 10.0s * 2 = 20.0s (40 ticks).
      const unitDef: UnitDefRecord = {
        ...armlab,
        buildTime: 1000,
        metalCost: 1000,
        energyCost: 0
      };

      let active: ActiveConstruction[] = [
        { id: 'step-2', unitDef, buildPower: 100, progress: 0 }
      ];
      const dt = 0.5;
      let ticks = 0;
      let completedAtSec = -1;

      while (active.length > 0 && ticks < 100) {
        ticks += 1;
        const res = tickConstructions({
          constructions: active,
          dt,
          stored: { metal: 0, energy: 1000 },
          income: { metal: 50, energy: 0 }
        });

        if (res.completedConstructions.length === 0) {
          expect(res.stallMetal).toBe(true);
          expect(res.stallEnergy).toBe(false);
          expect(res.scale).toBeCloseTo(0.5, 5);
        }

        if (res.completedConstructions.length > 0) {
          completedAtSec = ticks * dt;
        }
        active = res.updatedConstructions;
      }

      expect(ticks).toBe(40);
      expect(completedAtSec).toBe(20.0);
    });

    it('shares scarcity proportionally between two parallel constructions', () => {
      // Construction 1: metalCost 600, buildTime 1000, bp 100 -> need 60 M/s
      // Construction 2: metalCost 400, buildTime 1000, bp 100 -> need 40 M/s
      // Total need = 100 M/s
      // Available = 50 M (at dt = 1.0)
      // Scale = 50 / 100 = 0.5
      // C1 gets 30 M, C2 gets 20 M (proportional: 30 / 20 === 60 / 40)
      const unit1: UnitDefRecord = { ...armlab, buildTime: 1000, metalCost: 600, energyCost: 0 };
      const unit2: UnitDefRecord = { ...armlab, buildTime: 1000, metalCost: 400, energyCost: 0 };

      const c1: ActiveConstruction = { id: 'c1', unitDef: unit1, buildPower: 100, progress: 0 };
      const c2: ActiveConstruction = { id: 'c2', unitDef: unit2, buildPower: 100, progress: 0 };

      const res = tickConstructions({
        constructions: [c1, c2],
        dt: 1.0,
        available: { metal: 50, energy: 1000 }
      });

      expect(res.scale).toBeCloseTo(0.5, 5);
      expect(res.stallMetal).toBe(true);
      expect(res.totalNeed.metal).toBeCloseTo(100, 5);

      const u1 = res.updatedConstructions[0];
      const u2 = res.updatedConstructions[1];
      expect(u1).toBeDefined();
      expect(u2).toBeDefined();
      expect(u1?.progress).toBeCloseTo(0.05, 5);
      expect(u2?.progress).toBeCloseTo(0.05, 5);
      expect(res.spent.metal).toBeCloseTo(50, 5);
    });

    it('halves completion time when an assisting builder matches primary build power', () => {
      // Unit buildTime 1000. Builder 1: bp 100. Builder 2 (assisting): bp 100.
      // Total effective BP = 200.
      // Expected time: 1000 / 200 = 5.0 s (10 ticks of dt = 0.5).
      const unitDef: UnitDefRecord = { ...armlab, buildTime: 1000, metalCost: 100, energyCost: 100 };
      const c1: ActiveConstruction = {
        id: 'c1',
        unitDef,
        buildPower: 100,
        assistingBuildPower: 100,
        progress: 0
      };

      let active: ActiveConstruction[] = [c1];
      const dt = 0.5;
      let ticks = 0;
      let completedAtSec = -1;

      while (active.length > 0 && ticks < 50) {
        ticks += 1;
        const res = tickConstructions({
          constructions: active,
          dt,
          available: { metal: 10000, energy: 10000 }
        });
        if (res.completedConstructions.length > 0) {
          completedAtSec = ticks * dt;
        }
        active = res.updatedConstructions;
      }

      expect(ticks).toBe(10);
      expect(completedAtSec).toBe(5.0);
    });

    it('handles energy stall and picks minimum of metal and energy scaling', () => {
      const unitDef: UnitDefRecord = {
        ...armlab,
        buildTime: 1000,
        metalCost: 1000,
        energyCost: 2000
      };
      const c: ActiveConstruction = { id: 'c', unitDef, buildPower: 100, progress: 0 };

      // At dt = 1.0: metal need = 100, energy need = 200
      // Available: metal = 80 (ratio 0.8), energy = 50 (ratio 0.25)
      // Scale should be min(0.8, 0.25) = 0.25
      const res = tickConstructions({
        constructions: [c],
        dt: 1.0,
        available: { metal: 80, energy: 50 }
      });

      expect(res.stallMetal).toBe(true);
      expect(res.stallEnergy).toBe(true);
      expect(res.scale).toBeCloseTo(0.25, 5);
      expect(res.spent.metal).toBeCloseTo(100 * 0.25, 5);
      expect(res.spent.energy).toBeCloseTo(200 * 0.25, 5);
    });

    it('ignores constructions that are already 100% complete', () => {
      const finished: ActiveConstruction = { id: 'done', unitDef: armlab, buildPower: 100, progress: 1.0 };
      const res = tickConstructions({
        constructions: [finished],
        dt: 1.0,
        available: { metal: 100, energy: 100 }
      });
      expect(res.updatedConstructions).toHaveLength(0);
      expect(res.completedConstructions).toHaveLength(0);
      expect(res.spent.metal).toBe(0);
    });

    it('defaults stored and income to 0 when not provided in input', () => {
      const c: ActiveConstruction = { id: 'c', unitDef: armlab, buildPower: 100, progress: 0 };
      const res = tickConstructions({
        constructions: [c],
        dt: 1.0
      });
      expect(res.scale).toBe(0);
      expect(res.stallMetal).toBe(true);
      expect(res.stallEnergy).toBe(true);
    });

    it('returns empty result when constructions list is empty or dt is zero', () => {
      const emptyRes = tickConstructions({ constructions: [], dt: 1.0 });
      expect(emptyRes.updatedConstructions).toHaveLength(0);
      expect(emptyRes.scale).toBe(1);

      const zeroDtRes = tickConstructions({
        constructions: [{ id: 'c', unitDef: armlab, buildPower: 100, progress: 0 }],
        dt: 0
      });
      expect(zeroDtRes.scale).toBe(1);
    });
  });

  describe('tickReclaims', () => {
    it('adds resources linearly over durationSec and completes', () => {
      // Reclaim task: metal 300, energy 600, duration 6 s
      // Each 1 s tick yields exactly 50 M and 100 E
      const reclaim: ActiveReclaim = {
        id: 'rec-1',
        metal: 300,
        energy: 600,
        durationSec: 6,
        elapsedSec: 0
      };

      let active: ActiveReclaim[] = [reclaim];
      let totalYieldedM = 0;
      let totalYieldedE = 0;
      let ticks = 0;

      while (active.length > 0 && ticks < 20) {
        ticks += 1;
        const res = tickReclaims(active, 1.0);
        totalYieldedM += res.yielded.metal;
        totalYieldedE += res.yielded.energy;

        expect(res.yielded.metal).toBeCloseTo(50, 5);
        expect(res.yielded.energy).toBeCloseTo(100, 5);

        active = res.updatedReclaims;
        const firstCompleted = res.completedReclaims[0];
        if (firstCompleted) {
          expect(firstCompleted.elapsedSec).toBe(6);
        }
      }

      expect(ticks).toBe(6);
      expect(totalYieldedM).toBeCloseTo(300, 5);
      expect(totalYieldedE).toBeCloseTo(600, 5);
      expect(active).toHaveLength(0);
    });

    it('returns empty result when reclaims list is empty or dt <= 0', () => {
      const res = tickReclaims([], 1.0);
      expect(res.updatedReclaims).toHaveLength(0);
      expect(res.yielded.metal).toBe(0);

      const zeroDt = tickReclaims(
        [{ id: 'r', metal: 100, energy: 100, durationSec: 5, elapsedSec: 0 }],
        0
      );
      expect(zeroDt.yielded.metal).toBe(0);
    });
  });

  describe('computeBuildPowerStats', () => {
    it('computes total, active, and idle build power accurately', () => {
      const actors = [
        { actorId: 'com', buildPower: 300, hasActiveTask: true },
        { actorId: 'con1', buildPower: 100, hasActiveTask: false },
        { actorId: 'con2', buildPower: 100, hasActiveTask: true }
      ];

      const stats = computeBuildPowerStats(actors);
      expect(stats.totalBp).toBe(500);
      expect(stats.activeBp).toBe(400);
      expect(stats.idleBp).toBe(100);
    });
  });
});
