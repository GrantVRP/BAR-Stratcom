import { describe, expect, it } from 'vitest';
import { MATRIX_CELLS, coverage, isEligible, selectCandidates, type SelectableCandidate } from './curate-select';

// Synthetic candidates (test-only players).
let n = 0;
function cand(over: Partial<SelectableCandidate>): SelectableCandidate {
  n += 1;
  return {
    key: `k${String(n).padStart(3, '0')}`,
    player: `P${n}`,
    skill: 40,
    faction: 'cortex',
    opening: 'bot',
    modeGroup: '1v1',
    steps: 20,
    firstFactorySec: 60,
    errors: 0,
    ...over
  };
}

describe('curated candidate selection', () => {
  it('requires 12 steps, a factory before 3:00 and 0 validation errors', () => {
    expect(isEligible(cand({}))).toBe(true);
    expect(isEligible(cand({ steps: 11 }))).toBe(false);
    expect(isEligible(cand({ firstFactorySec: 180 }))).toBe(false);
    expect(isEligible(cand({ firstFactorySec: null }))).toBe(false);
    expect(isEligible(cand({ errors: 1 }))).toBe(false);
  });

  it('covers every cell with data before any cell gets a second pick, best skill first', () => {
    const cortexBots = [cand({ skill: 50 }), cand({ skill: 55 }), cand({ skill: 45 })];
    const armadaVeh = cand({ faction: 'armada', opening: 'vehicle', modeGroup: 'team', skill: 30 });
    const picked = selectCandidates([...cortexBots, armadaVeh], { target: 3, minimum: 3 });
    expect(picked.map((c) => c.skill)).toEqual([30, 55, 50]);
  });

  it('picks a player once, and twice only when that is needed to reach the minimum', () => {
    const p = 'SamePlayer';
    const pool = [cand({ player: p, skill: 60 }), cand({ player: p, skill: 59, modeGroup: 'team' }), cand({ skill: 10 })];
    expect(selectCandidates(pool, { target: 3, minimum: 2 }).map((c) => c.skill)).toEqual([60, 10]);
    expect(selectCandidates(pool, { target: 3, minimum: 3 }).map((c) => c.skill)).toEqual([60, 10, 59]);
  });

  it('ignores openings outside the matrix and ineligible candidates', () => {
    const picked = selectCandidates([cand({ opening: 'hover' }), cand({ steps: 3 }), cand({ faction: 'legion' })], {
      target: 5,
      minimum: 1
    });
    expect(picked).toEqual([]);
  });

  it('is deterministic and reports coverage per cell', () => {
    const pool = [cand({ skill: 50 }), cand({ skill: 50 }), cand({ faction: 'armada', opening: 'air' })];
    const a = selectCandidates(pool, { target: 2, minimum: 2 });
    expect(selectCandidates([...pool].reverse(), { target: 2, minimum: 2 })).toEqual(a);
    const cov = coverage(pool, a);
    expect(cov).toHaveLength(MATRIX_CELLS.length);
    expect(cov.find((c) => c.cell === 'cortex/bot/1v1')).toEqual({ cell: 'cortex/bot/1v1', available: 2, picked: 1 });
    expect(cov.find((c) => c.cell === 'cortex/air/team')).toEqual({ cell: 'cortex/air/team', available: 0, picked: 0 });
  });
});
