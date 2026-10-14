import { readLuaTable, type LuaTable } from '../bar3d/lua-table';
import type { AvgWindFile } from '../../src/core/schemas/maps';

type WindTable = Record<string, Record<string, number>>;

/** BAR keeps both lookups in common/wind_functions.lua as `[min] = { [max] = "value" }` with string values. */
function toTable(lua: LuaTable, what: string): WindTable {
  const out: WindTable = {};
  for (const [min, row] of Object.entries(lua)) {
    if (!row || typeof row !== 'object') throw new Error(`${what}: row ${min} is not a table`);
    out[min] = {};
    for (const [max, value] of Object.entries(row)) {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error(`${what}: [${min}][${max}] is not a number`);
      out[min]![max] = n;
    }
  }
  return out;
}

export function parseWindFunctions(lua: string): { average: WindTable; risk: WindTable } {
  return {
    average: toTable(readLuaTable(lua, 'local averageWindLookup ='), 'averageWindLookup'),
    risk: toTable(readLuaTable(lua, 'local windRiskLookup ='), 'windRiskLookup')
  };
}

/**
 * Adds BAR's wind-risk table (percent of time the wind is below 6) to data/wind/avg-wind.json.
 * The file's averages must match the same game file's `averageWindLookup`, which proves the risk table
 * comes from the game version the averages were exported from.
 */
export function withRiskTable(file: AvgWindFile, lua: string): AvgWindFile {
  const { average, risk } = parseWindFunctions(lua);
  for (const [min, row] of Object.entries(file.table)) {
    for (const [max, value] of Object.entries(row)) {
      const theirs = average[min]?.[max];
      if (theirs === undefined || Math.abs(theirs - value) > 1e-4) {
        throw new Error(`avg-wind.json [${min}][${max}] = ${value} does not match this game's averageWindLookup (${theirs ?? 'missing'}); wrong game version?`);
      }
    }
  }
  for (const [min, row] of Object.entries(risk)) {
    for (const [max, value] of Object.entries(row)) {
      if (value < 0 || value > 100) throw new Error(`windRiskLookup [${min}][${max}] = ${value} is not a percentage`);
    }
  }
  return { ...file, riskTable: risk };
}
