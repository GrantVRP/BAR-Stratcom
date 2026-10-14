import { describe, expect, it } from 'vitest';
import { FALLBACK_MEX_YIELD } from '../../core/plans/constants';
import { UNKNOWN_SIM_MAP, simMapFor } from './sim-map';

describe('simulator map input from real map data', () => {
  it('uses the map record and BAR’s wind table for a known map', () => {
    expect(simMapFor('Supreme Isthmus v2.1')).toMatchObject({ windMin: 1, windMax: 19, tidalStrength: 21, mexYieldProvenance: 'estimated' });
    expect(simMapFor('Supreme Isthmus v2.1').windAvg).toBeCloseTo(14.2, 1);
  });

  it('says unknown (no invented wind) when the map is not known', () => {
    expect(simMapFor('Not A Real Map 9.9')).toEqual(UNKNOWN_SIM_MAP);
    expect(simMapFor(null)).toEqual({ windAvg: null, windMin: 0, windMax: 0, tidalStrength: 0, mexYield: FALLBACK_MEX_YIELD, mexYieldProvenance: 'estimated' });
  });
});
