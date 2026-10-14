import { avgWindFor, findMapByScriptName } from '../../core/maps';
import { FALLBACK_MEX_YIELD } from '../../core/plans/constants';
import type { MapRecord } from '../../core/schemas';
import type { SimInput } from '../../core/sim/types';
import { loadAvgWindTable, loadMaps } from './loader';

export type SimMap = SimInput['map'];

/**
 * The simulator's map input when the map is unknown: no wind (flagged `windUnknown`), no tide, the
 * estimated fallback mex yield. Never a made-up "typical" wind.
 */
export const UNKNOWN_SIM_MAP: SimMap = {
  windAvg: null,
  windMin: 0,
  windMax: 0,
  tidalStrength: 0,
  mexYield: FALLBACK_MEX_YIELD,
  mexYieldProvenance: 'estimated'
};

export function simMapOf(map: MapRecord, windTable: Record<string, Record<string, number>> | null): SimMap {
  return {
    windAvg: avgWindFor(map, windTable),
    windMin: map.wind.min,
    windMax: map.wind.max,
    tidalStrength: map.tidalStrength,
    mexYield: map.mexYield?.value ?? FALLBACK_MEX_YIELD,
    mexYieldProvenance: map.mexYield?.provenance ?? 'estimated'
  };
}

/** The map a game was played on (by script name) as simulator input: real values from data/maps and BAR's wind table. */
export function simMapFor(
  scriptName: string | null | undefined,
  maps: MapRecord[] = loadMaps(),
  windTable: Record<string, Record<string, number>> | null = loadAvgWindTable()
): SimMap {
  const map = scriptName ? findMapByScriptName(maps, scriptName) : undefined;
  return map ? simMapOf(map, windTable) : UNKNOWN_SIM_MAP;
}
