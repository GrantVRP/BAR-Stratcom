/**
 * Heuristic constants for the economy simulator and plan execution.
 * Game facts come from snapshots; constants here are documented heuristics.
 */

// estimated: standard simulation timestep in seconds (2 Hz) provides sufficient resolution
export const DEFAULT_SIM_DT = 0.5;

// estimated: standard 15-minute simulation horizon for openings and early-game build plans
export const DEFAULT_SIM_HORIZON = 900;

// estimated: standard BAR energy converter turn-on threshold at 90% energy storage capacity
export const DEFAULT_CONVERTER_THRESHOLD = 0.9;

// estimated: standard competitive starting resources in Beyond All Reason (1000 M / 1000 E)
export const DEFAULT_START_RESOURCES = {
  metal: 1000,
  energy: 1000,
  metalStorage: 1000,
  energyStorage: 1000
} as const;

// estimated: storage at or above 99% with positive net income is classified as resource floating
export const FLOAT_STORAGE_RATIO = 0.99;

// estimated: standard T1 metal extractor extractsMetal value (0.001) across all BAR factions
export const BASE_MEX_EXTRACTS_METAL = 0.001;
