import type { UnitDefRecord } from '../schemas';
import type { ResourceFlow } from './economy';

export interface ActiveConstruction {
  id: string;
  unitDef: UnitDefRecord;
  buildPower: number;
  assistingBuildPower?: number;
  progress: number; // fraction 0 to 1
}

export interface AssistTask {
  actorId: string;
  targetConstructionId: string;
  buildPower: number;
}

export interface ActiveReclaim {
  id: string;
  metal: number;
  energy: number;
  durationSec: number;
  elapsedSec: number;
}

export interface ConstructionTickInput {
  constructions: readonly ActiveConstruction[];
  dt: number;
  available?: ResourceFlow;
  stored?: ResourceFlow;
  income?: ResourceFlow;
}

export interface ConstructionTickResult {
  updatedConstructions: ActiveConstruction[];
  completedConstructions: ActiveConstruction[];
  spent: ResourceFlow;
  scale: number;
  totalNeed: ResourceFlow;
  stallMetal: boolean;
  stallEnergy: boolean;
}

export interface ReclaimTickResult {
  updatedReclaims: ActiveReclaim[];
  completedReclaims: ActiveReclaim[];
  yielded: ResourceFlow;
}

export interface BuildPowerActor {
  actorId: string;
  buildPower: number;
  hasActiveTask: boolean;
}

export interface BuildPowerStats {
  totalBp: number;
  activeBp: number;
  idleBp: number;
}

/**
 * Returns total effective build power (primary + assisters) for an active construction.
 */
export function getEffectiveBuildPower(construction: ActiveConstruction): number {
  return construction.buildPower + (construction.assistingBuildPower ?? 0);
}

/**
 * Attaches assisting actors to active constructions, summing assisting build power.
 */
export function attachAssists(
  constructions: readonly ActiveConstruction[],
  assists: readonly AssistTask[]
): ActiveConstruction[] {
  if (assists.length === 0) {
    return constructions.map((c) => ({ ...c }));
  }

  const assistMap = new Map<string, number>();
  for (const assist of assists) {
    const current = assistMap.get(assist.targetConstructionId) ?? 0;
    assistMap.set(assist.targetConstructionId, current + assist.buildPower);
  }

  return constructions.map((c) => ({
    ...c,
    assistingBuildPower: assistMap.get(c.id) ?? 0
  }));
}

/**
 * Advances active constructions by one simulation tick dt.
 * Sums the resource needs of all constructions and scales progress by
 * min(1, availM/needM, availE/needE). Resources are consumed proportionally.
 */
export function tickConstructions(input: ConstructionTickInput): ConstructionTickResult {
  const { constructions, dt } = input;

  if (constructions.length === 0 || dt <= 0) {
    return {
      updatedConstructions: [],
      completedConstructions: [],
      spent: { metal: 0, energy: 0 },
      scale: 1,
      totalNeed: { metal: 0, energy: 0 },
      stallMetal: false,
      stallEnergy: false
    };
  }

  // Calculate available resources (either explicit available or stored + income * dt)
  let availM = 0;
  let availE = 0;
  if (input.available) {
    availM = Math.max(0, input.available.metal);
    availE = Math.max(0, input.available.energy);
  } else {
    const storedM = input.stored?.metal ?? 0;
    const storedE = input.stored?.energy ?? 0;
    const incomeM = input.income?.metal ?? 0;
    const incomeE = input.income?.energy ?? 0;
    availM = Math.max(0, storedM + incomeM * dt);
    availE = Math.max(0, storedE + incomeE * dt);
  }

  // 1. Calculate unconstrained resource needs for each active construction
  interface NeedsEntry {
    construction: ActiveConstruction;
    progressNeeded: number;
    metalNeed: number;
    energyNeed: number;
  }

  const entries: NeedsEntry[] = [];
  let totalNeedM = 0;
  let totalNeedE = 0;

  for (const c of constructions) {
    if (c.progress >= 1.0) {
      continue;
    }

    const bp = getEffectiveBuildPower(c);
    const buildTime = Math.max(1e-6, c.unitDef.buildTime);
    const unconstrainedDelta = (bp * dt) / buildTime;
    const progressNeeded = Math.min(1.0 - c.progress, unconstrainedDelta);

    const metalNeed = c.unitDef.metalCost * progressNeeded;
    const energyNeed = c.unitDef.energyCost * progressNeeded;

    totalNeedM += metalNeed;
    totalNeedE += energyNeed;

    entries.push({
      construction: c,
      progressNeeded,
      metalNeed,
      energyNeed
    });
  }

  // 2. Compute global scaling ratio and stall flags
  const ratioM = totalNeedM > 0 ? Math.min(1.0, availM / totalNeedM) : 1.0;
  const ratioE = totalNeedE > 0 ? Math.min(1.0, availE / totalNeedE) : 1.0;
  const scale = Math.min(1.0, ratioM, ratioE);

  const stallMetal = totalNeedM > 0 && ratioM < 1.0;
  const stallEnergy = totalNeedE > 0 && ratioE < 1.0;

  // 3. Apply scaled progress and compute actual resources spent
  const updatedConstructions: ActiveConstruction[] = [];
  const completedConstructions: ActiveConstruction[] = [];
  let totalSpentM = 0;
  let totalSpentE = 0;

  for (const entry of entries) {
    const actualDelta = entry.progressNeeded * scale;
    const newProgress = Math.min(1.0, entry.construction.progress + actualDelta);

    const spentM = entry.construction.unitDef.metalCost * actualDelta;
    const spentE = entry.construction.unitDef.energyCost * actualDelta;
    totalSpentM += spentM;
    totalSpentE += spentE;

    const updated: ActiveConstruction = {
      ...entry.construction,
      progress: newProgress
    };

    // Finished if progress is virtually 1.0 (floating point safety margin)
    if (newProgress >= 1.0 - 1e-9) {
      completedConstructions.push({ ...updated, progress: 1.0 });
    } else {
      updatedConstructions.push(updated);
    }
  }

  return {
    updatedConstructions,
    completedConstructions,
    spent: {
      metal: totalSpentM,
      energy: totalSpentE
    },
    scale,
    totalNeed: {
      metal: totalNeedM,
      energy: totalNeedE
    },
    stallMetal,
    stallEnergy
  };
}

/**
 * Advances active reclaim tasks linearly over durationSec, yielding metal and energy.
 */
export function tickReclaims(
  reclaims: readonly ActiveReclaim[],
  dt: number
): ReclaimTickResult {
  if (reclaims.length === 0 || dt <= 0) {
    return {
      updatedReclaims: [],
      completedReclaims: [],
      yielded: { metal: 0, energy: 0 }
    };
  }

  const updatedReclaims: ActiveReclaim[] = [];
  const completedReclaims: ActiveReclaim[] = [];
  let yieldedM = 0;
  let yieldedE = 0;

  for (const r of reclaims) {
    const duration = Math.max(1e-6, r.durationSec);
    const remaining = Math.max(0, duration - r.elapsedSec);
    const effectiveDt = Math.min(dt, remaining);

    const fraction = effectiveDt / duration;
    yieldedM += r.metal * fraction;
    yieldedE += r.energy * fraction;

    const newElapsed = r.elapsedSec + effectiveDt;

    if (newElapsed >= duration - 1e-9) {
      completedReclaims.push({
        ...r,
        elapsedSec: duration
      });
    } else {
      updatedReclaims.push({
        ...r,
        elapsedSec: newElapsed
      });
    }
  }

  return {
    updatedReclaims,
    completedReclaims,
    yielded: {
      metal: yieldedM,
      energy: yieldedE
    }
  };
}

/**
 * Computes build power statistics for a list of actors.
 */
export function computeBuildPowerStats(actors: readonly BuildPowerActor[]): BuildPowerStats {
  let totalBp = 0;
  let activeBp = 0;

  for (const actor of actors) {
    totalBp += actor.buildPower;
    if (actor.hasActiveTask) {
      activeBp += actor.buildPower;
    }
  }

  return {
    totalBp,
    activeBp,
    idleBp: Math.max(0, totalBp - activeBp)
  };
}
