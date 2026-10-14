/**
 * Adapter heuristics. All values are estimated rules of thumb, not game facts, and the UI
 * labels adapted plans as such.
 */

// estimated: maps averaging at least 10 wind favour wind turbines; below 6, solar collectors
export const WIND_CLASS = { highMin: 10, lowBelow: 6 } as const;

// estimated: an early energy stall longer than 10 s (in the first 5 minutes) gets one extra energy
// building on the commander, at most 3 times per adaptation
export const STALL_FIX = { windowSec: 300, minStallSec: 10, maxInserts: 3 } as const;

// estimated: mex yield used when the map has no measured value (same fallback as the plan sim graph)
export const FALLBACK_MEX_YIELD = 1.5;
