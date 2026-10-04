import { describe, expect, it } from 'vitest';
import { DECISION_TEMPLATE, hasOwnerDecisions, renderReview, type ReviewCandidate } from './curate-review';

// Synthetic candidate (test-only names).
const cand: ReviewCandidate = {
  key: 'pro-cortex-bot-test-map-0123ab-t0',
  player: 'TestPro',
  skill: 51.25,
  faction: 'cortex',
  opening: 'bot',
  modeGroup: '1v1',
  steps: 30,
  firstFactorySec: 52,
  errors: 0,
  title: 'Bot wind // Test Map',
  modeDetail: '1v1',
  map: 'Test Map 1.0',
  playedAt: '2026-09-12',
  replayUrl: 'https://bar-rts.com/replays/0123abcd0123abcd0123abcd0123abcd',
  opponents: ['OtherPro'],
  firstFactory: { unitId: 'corlab', name: 'Bot Lab', sec: 52 },
  sim: { energyStallSec: 12.4, metalStallSec: 0, flags: ['mexYieldEstimated'] }
};

describe('curation review sheet (T08.3)', () => {
  const md = renderReview({
    generatedAt: '2026-10-04T21:00:00.000Z',
    games: 1,
    teamsConsidered: 2,
    candidates: [cand],
    eligible: [cand],
    unmatched: [{ sessionId: '20261004-181322-eb04', map: 'Test Map 1.0', players: ['A', 'B'] }]
  });

  it('lists each candidate with its replay link, summary and a decision line', () => {
    expect(md).toContain('### 1. Bot wind // Test Map');
    expect(md).toContain(cand.replayUrl);
    expect(md).toContain('30 steps · first factory Bot Lab (`corlab`) at 0:52');
    expect(md).toContain('energy stall 12 s · metal stall 0 s (mexYieldEstimated)');
    expect(md.split('\n').filter((l) => l === DECISION_TEMPLATE)).toHaveLength(1);
  });

  it('shows coverage with the empty cells as gaps, and the unmatched sessions', () => {
    expect(md).toContain('| Cortex bot | 1 (1) | 0 (0) |');
    expect(md).toContain('**Gaps:** no eligible opening for armada bot 1v1,');
    expect(md).toContain('- `20261004-181322-eb04` · Test Map 1.0 · A vs B');
  });

  it('says when the raw recordings are not available', () => {
    expect(renderReview({ generatedAt: 'x', games: 0, teamsConsidered: 0, candidates: [], eligible: [], unmatched: null })).toContain(
      'Raw H2 recordings are not on this machine'
    );
  });

  it('detects owner decisions so a rerun does not overwrite them', () => {
    expect(hasOwnerDecisions(md)).toBe(false);
    // the template also appears inside the "How to review" text; only DECISION lines count
    expect(hasOwnerDecisions(md.replaceAll(DECISION_TEMPLATE, 'DECISION: approve'))).toBe(true);
    expect(hasOwnerDecisions(md.replaceAll(DECISION_TEMPLATE, 'DECISION: reject — reason: too greedy'))).toBe(true);
  });
});
