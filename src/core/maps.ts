import type { MapRecord } from './schemas';

/**
 * Strips a trailing version suffix like " v2.1", " 1.8", " V1", "_v2.0" from a map script name.
 */
export function stripMapVersionSuffix(scriptName: string): string {
  return scriptName.replace(/[_\s]+[vV]?\d+(\.\d+)*$/i, '').trim();
}

/**
 * Finds a map in the given map list by its engine scriptName.
 * Matches exact scriptName first (case-insensitive, trimmed).
 * If no exact match is found, falls back to matching with trailing version suffixes stripped.
 */
export function findMapByScriptName(maps: MapRecord[], scriptName: string): MapRecord | undefined {
  const trimmed = scriptName.trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  // 1. Exact match (case-insensitive)
  const exact = maps.find((m) => m.scriptName.trim().toLowerCase() === trimmed);
  if (exact) {
    return exact;
  }

  // 2. Exact without trailing version suffix
  const strippedTarget = stripMapVersionSuffix(trimmed).toLowerCase();
  if (!strippedTarget) {
    return undefined;
  }

  return maps.find((m) => stripMapVersionSuffix(m.scriptName).toLowerCase() === strippedTarget);
}

/**
 * Looks up the measured average wind value for a map from a wind lookup table.
 * Returns null if the lookup table is missing or does not contain an entry for [min][max].
 * IMPORTANT: This NEVER computes a naive arithmetic mean (min + max) / 2 (04 §2.3).
 */
export function avgWindFor(
  map: MapRecord,
  windTable?: Record<string, Record<string, number>> | null
): number | null {
  if (!windTable) {
    return null;
  }

  const minKey = String(map.wind.min);
  const maxKey = String(map.wind.max);

  const val = windTable[minKey]?.[maxKey];
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return val;
  }

  return null;
}

/**
 * BAR's wind risk for a map (percent of the time the wind is below 6), from the risk table imported with
 * the averages (Q-06). Null when the table or the [min][max] entry is missing; never estimated.
 */
export function windRiskFor(map: MapRecord, riskTable?: Record<string, Record<string, number>> | null): number | null {
  return avgWindFor(map, riskTable);
}
