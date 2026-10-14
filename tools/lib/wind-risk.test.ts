import { describe, expect, it } from 'vitest';
import { parseWindFunctions, withRiskTable } from './wind-risk';

// shaped like BAR's common/wind_functions.lua (test values)
const lua = `
local averageWindLookup = {
	[0] = {
		[1] = "0.8",
		[2] = "1.5",
	},
}
local windRiskLookup = {
	[0] = {
		[1] = "100",
		[2] = "97.5",
	},
}
local windFunctions = {}
return windFunctions`;

describe('wind risk import', () => {
  it('reads both BAR lookups as numbers', () => {
    expect(parseWindFunctions(lua)).toEqual({ average: { 0: { 1: 0.8, 2: 1.5 } }, risk: { 0: { 1: 100, 2: 97.5 } } });
  });

  it('adds the risk table only when our averages match the same game file', () => {
    const file = { schemaVersion: 1 as const, gameVersion: 'test-1', table: { '0': { '1': 0.80000001, '2': 1.5 } } };
    expect(withRiskTable(file, lua).riskTable).toEqual({ 0: { 1: 100, 2: 97.5 } });
    expect(() => withRiskTable({ ...file, table: { '0': { '1': 0.9 } } }, lua)).toThrow('wrong game version');
    expect(() => withRiskTable({ ...file, table: { '5': { '9': 4 } } }, lua)).toThrow('missing');
    expect(() => withRiskTable(file, lua.replace('"97.5"', '"170"'))).toThrow('not a percentage');
  });
});
