import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateCuratedPlanGuard } from './curated-guard';
import type { BuildPlan } from '../../src/core/schemas';

describe('validateCuratedPlanGuard (T06.11, S-10)', () => {
  const samplePlan: BuildPlan = {
    schemaVersion: 1,
    id: 'test-sample',
    title: 'Sample Plan',
    factionId: 'cortex',
    gameVersion: 'Beyond All Reason test',
    modes: ['1v1'],
    role: 'front',
    skill: 'intermediate',
    opening: 'vehicle',
    energyStyle: 'solar',
    source: {
      kind: 'own-game',
      sessionId: 'test-session',
      map: 'BarR 1.1',
      capturedAt: '2026-10-01T00:00:00Z'
    },
    steps: []
  };

  it('allows non-curated plans (e.g. sample own-game plans) to pass', () => {
    const res = validateCuratedPlanGuard(samplePlan);
    expect(res.valid).toBe(true);
  });

  it('rejects the deleted fabricated plans that had fake replay IDs', () => {
    const fakeArmadaPlan: BuildPlan = {
      ...samplePlan,
      id: 'armada-rocketeer-1v1',
      source: {
        kind: 'curated',
        replayId: 'fixture-armada-01',
        player: 'BAR Pioneer',
        playerRating: 28,
        playedAt: '2026-09-15T14:30:00Z',
        map: 'Red River v2',
        gameVersion: 'test-31479-433a460',
        reviewedBy: 'StratCom Curators',
        reviewedAt: '2026-09-15T15:00:00Z'
      }
    };

    const resArmada = validateCuratedPlanGuard(fakeArmadaPlan);
    expect(resArmada.valid).toBe(false);
    expect(resArmada.reason).toContain('invalid replayId');

    const fakeCortexPlan: BuildPlan = {
      ...samplePlan,
      id: 'cortex-grunt-1v1',
      source: {
        kind: 'curated',
        replayId: 'fixture-cortex-01',
        player: 'CoreCommander',
        playerRating: 31,
        playedAt: '2026-09-16T18:00:00Z',
        map: 'Red River v2',
        gameVersion: 'test-31479-433a460',
        reviewedBy: 'StratCom Curators',
        reviewedAt: '2026-09-16T18:30:00Z'
      }
    };

    const resCortex = validateCuratedPlanGuard(fakeCortexPlan);
    expect(resCortex.valid).toBe(false);
    expect(resCortex.reason).toContain('invalid replayId');
  });

  it('rejects curated plan when REVIEW-LOG.md is missing', () => {
    const tmpBuilds = fs.mkdtempSync(path.join(os.tmpdir(), 'builds-guard-'));
    try {
      const planWithValidReplayId: BuildPlan = {
        ...samplePlan,
        id: 'curated-valid-replay',
        source: {
          kind: 'curated',
          replayId: '0123456789abcdef0123456789abcdef',
          player: 'ProPlayer',
          playerRating: 35,
          playedAt: '2026-09-15T14:30:00Z',
          map: 'Supreme Isthmus v1.7',
          gameVersion: 'test-31479-433a460',
          reviewedBy: 'Owner',
          reviewedAt: '2026-09-15T15:00:00Z'
        }
      };

      const res = validateCuratedPlanGuard(planWithValidReplayId, tmpBuilds);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('REVIEW-LOG.md does not exist');
    } finally {
      fs.rmSync(tmpBuilds, { recursive: true, force: true });
    }
  });

  it('rejects curated plan when REVIEW-LOG.md does not contain approve record for it', () => {
    const tmpBuilds = fs.mkdtempSync(path.join(os.tmpdir(), 'builds-guard-'));
    try {
      fs.writeFileSync(path.join(tmpBuilds, 'REVIEW-LOG.md'), '# Review Log\n- candidate-1: reject\n');
      const planWithValidReplayId: BuildPlan = {
        ...samplePlan,
        id: 'curated-valid-replay',
        source: {
          kind: 'curated',
          replayId: '0123456789abcdef0123456789abcdef',
          player: 'ProPlayer',
          playerRating: 35,
          playedAt: '2026-09-15T14:30:00Z',
          map: 'Supreme Isthmus v1.7',
          gameVersion: 'test-31479-433a460',
          reviewedBy: 'Owner',
          reviewedAt: '2026-09-15T15:00:00Z'
        }
      };

      const res = validateCuratedPlanGuard(planWithValidReplayId, tmpBuilds);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('does not appear as "approve" in REVIEW-LOG.md');
    } finally {
      fs.rmSync(tmpBuilds, { recursive: true, force: true });
    }
  });

  it('approves curated plan when replayId is 32 hex chars and has approve record in REVIEW-LOG.md', () => {
    const tmpBuilds = fs.mkdtempSync(path.join(os.tmpdir(), 'builds-guard-'));
    try {
      fs.writeFileSync(
        path.join(tmpBuilds, 'REVIEW-LOG.md'),
        '# Review Log\n- curated-valid-replay: approve (verified by owner)\n'
      );
      const planWithValidReplayId: BuildPlan = {
        ...samplePlan,
        id: 'curated-valid-replay',
        source: {
          kind: 'curated',
          replayId: '0123456789abcdef0123456789abcdef',
          player: 'ProPlayer',
          playerRating: 35,
          playedAt: '2026-09-15T14:30:00Z',
          map: 'Supreme Isthmus v1.7',
          gameVersion: 'test-31479-433a460',
          reviewedBy: 'Owner',
          reviewedAt: '2026-09-15T15:00:00Z'
        }
      };

      const res = validateCuratedPlanGuard(planWithValidReplayId, tmpBuilds);
      expect(res.valid).toBe(true);
    } finally {
      fs.rmSync(tmpBuilds, { recursive: true, force: true });
    }
  });
});
