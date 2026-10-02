import type { UnitDefRecord } from '../schemas';
import {
  BASE_MEX_EXTRACTS_METAL,
  DEFAULT_CONVERTER_THRESHOLD,
  FLOAT_STORAGE_RATIO
} from './constants';

export interface ResourceState {
  current: number;
  storage: number;
}

export interface EconomyState {
  metal: ResourceState;
  energy: ResourceState;
}

export interface ResourceFlow {
  metal: number;
  energy: number;
}

export interface SimMapEco {
  mexYield: number;
  tidalStrength: number;
  windAvg?: number | null;
  windMin?: number;
  windMax?: number;
  mexYieldProvenance?: 'measured' | 'estimated';
}

export interface IncomeBreakdown {
  metal: {
    make: number;
    extractors: number;
    upkeep: number;
    total: number;
  };
  energy: {
    make: number;
    wind: number;
    tidal: number;
    upkeep: number;
    total: number;
  };
}

export interface IncomeResult {
  metal: number;
  energy: number;
  breakdown: IncomeBreakdown;
  flags: {
    windUnknown: boolean;
  };
}

export interface StorageResult {
  state: EconomyState;
  overflow: ResourceFlow;
  float: {
    metal: boolean;
    energy: boolean;
  };
}

export interface ConverterResult {
  state: EconomyState;
  energyConverted: number;
  metalProduced: number;
}

export interface ComputeIncomeOptions {
  baseMexExtractsMetal?: number;
}

/**
 * Computes metal and energy income for a collection of completed units on a map.
 * Upkeep is subtracted directly without clamping: in real BAR data, solar collectors
 * produce energy via negative upkeep (energyMake 0, energyUpkeep -20 -> +20 E/s).
 */
export function computeIncome(
  completed: Iterable<UnitDefRecord>,
  map: SimMapEco,
  windNow?: number | null,
  options?: ComputeIncomeOptions
): IncomeResult {
  const baseExtracts = options?.baseMexExtractsMetal ?? BASE_MEX_EXTRACTS_METAL;
  const effectiveWind = windNow !== undefined ? windNow : (map.windAvg ?? null);
  const windUnknown = effectiveWind === null;

  let metalMake = 0;
  let energyMake = 0;
  let metalExtractors = 0;
  let windEnergy = 0;
  let tidalEnergy = 0;
  let metalUpkeep = 0;
  let energyUpkeep = 0;

  for (const unit of completed) {
    const eco = unit.economy;
    metalMake += eco.metalMake;
    energyMake += eco.energyMake;

    if (eco.extractsMetal > 0) {
      metalExtractors += map.mexYield * (eco.extractsMetal / baseExtracts);
    }

    if (eco.windGenerator > 0 && effectiveWind !== null) {
      windEnergy += Math.min(effectiveWind, eco.windGenerator);
    }

    if (eco.tidalGenerator > 0) {
      tidalEnergy += eco.tidalGenerator * map.tidalStrength;
    }

    // Negative upkeep represents net generation in BAR (e.g. armsolar / corsolar).
    // Never clamp or use Math.abs on upkeep.
    metalUpkeep += eco.metalUpkeep;
    energyUpkeep += eco.energyUpkeep;
  }

  const totalMetal = metalMake + metalExtractors - metalUpkeep;
  const totalEnergy = energyMake + windEnergy + tidalEnergy - energyUpkeep;

  return {
    metal: totalMetal,
    energy: totalEnergy,
    breakdown: {
      metal: {
        make: metalMake,
        extractors: metalExtractors,
        upkeep: metalUpkeep,
        total: totalMetal
      },
      energy: {
        make: energyMake,
        wind: windEnergy,
        tidal: tidalEnergy,
        upkeep: energyUpkeep,
        total: totalEnergy
      }
    },
    flags: {
      windUnknown
    }
  };
}

/**
 * Applies a simulation tick of resource flow to storage.
 * Any resource accumulation beyond storage capacity is lost as overflow.
 * Ticks where resources sit at >= 99% storage with positive net income count as float.
 */
export function applyStorage(
  state: EconomyState,
  dt: number,
  income: ResourceFlow,
  spend: ResourceFlow = { metal: 0, energy: 0 }
): StorageResult {
  const netMetal = income.metal - spend.metal;
  const netEnergy = income.energy - spend.energy;

  const rawMetal = state.metal.current + netMetal * dt;
  const rawEnergy = state.energy.current + netEnergy * dt;

  const overflowMetal = Math.max(0, rawMetal - state.metal.storage);
  const overflowEnergy = Math.max(0, rawEnergy - state.energy.storage);

  const clampedMetal = Math.max(0, Math.min(state.metal.storage, rawMetal));
  const clampedEnergy = Math.max(0, Math.min(state.energy.storage, rawEnergy));

  const floatMetal =
    state.metal.storage > 0 &&
    clampedMetal >= FLOAT_STORAGE_RATIO * state.metal.storage &&
    netMetal > 0;

  const floatEnergy =
    state.energy.storage > 0 &&
    clampedEnergy >= FLOAT_STORAGE_RATIO * state.energy.storage &&
    netEnergy > 0;

  return {
    state: {
      metal: {
        current: clampedMetal,
        storage: state.metal.storage
      },
      energy: {
        current: clampedEnergy,
        storage: state.energy.storage
      }
    },
    overflow: {
      metal: overflowMetal,
      energy: overflowEnergy
    },
    float: {
      metal: floatMetal,
      energy: floatEnergy
    }
  };
}

/**
 * Runs converters if energy storage is at or above the threshold fraction.
 * Converts up to energyPerSecond * dt energy into metal according to metalPerEnergy.
 */
export function runConverters(
  state: EconomyState,
  converters: Iterable<UnitDefRecord>,
  dt: number,
  threshold = DEFAULT_CONVERTER_THRESHOLD
): ConverterResult {
  const thresholdEnergy = threshold * state.energy.storage;

  if (state.energy.current < thresholdEnergy) {
    return {
      state,
      energyConverted: 0,
      metalProduced: 0
    };
  }

  let totalDemand = 0;
  const activeConverters: Array<{ energyPerSecond: number; metalPerEnergy: number }> = [];

  for (const unit of converters) {
    if (unit.economy.converter) {
      totalDemand += unit.economy.converter.energyPerSecond * dt;
      activeConverters.push(unit.economy.converter);
    }
  }

  if (activeConverters.length === 0 || totalDemand <= 0) {
    return {
      state,
      energyConverted: 0,
      metalProduced: 0
    };
  }

  const energyConverted = Math.min(totalDemand, state.energy.current);
  if (energyConverted <= 0) {
    return {
      state,
      energyConverted: 0,
      metalProduced: 0
    };
  }

  const scale = energyConverted / totalDemand;
  let metalProduced = 0;

  for (const conv of activeConverters) {
    const e = conv.energyPerSecond * dt * scale;
    metalProduced += e * conv.metalPerEnergy;
  }

  const newEnergy = Math.max(0, state.energy.current - energyConverted);
  const newMetal = Math.min(state.metal.storage, state.metal.current + metalProduced);

  return {
    state: {
      metal: {
        current: newMetal,
        storage: state.metal.storage
      },
      energy: {
        current: newEnergy,
        storage: state.energy.storage
      }
    },
    energyConverted,
    metalProduced
  };
}

/**
 * Computes total storage capacity by combining start storage with storage from completed units.
 */
export function computeTotalStorage(
  start: { metalStorage: number; energyStorage: number },
  completed: Iterable<UnitDefRecord>
): { metalStorage: number; energyStorage: number } {
  let metalStorage = start.metalStorage;
  let energyStorage = start.energyStorage;
  for (const unit of completed) {
    metalStorage += unit.economy.metalStorage;
    energyStorage += unit.economy.energyStorage;
  }
  return { metalStorage, energyStorage };
}

/**
 * Initializes pure EconomyState from start values and optional completed units.
 */
export function createEconomyState(
  start: { metal: number; energy: number; metalStorage: number; energyStorage: number },
  completed?: Iterable<UnitDefRecord>
): EconomyState {
  const storage = completed
    ? computeTotalStorage(start, completed)
    : { metalStorage: start.metalStorage, energyStorage: start.energyStorage };
  return {
    metal: {
      current: Math.min(storage.metalStorage, Math.max(0, start.metal)),
      storage: storage.metalStorage
    },
    energy: {
      current: Math.min(storage.energyStorage, Math.max(0, start.energy)),
      storage: storage.energyStorage
    }
  };
}
