import { describe, it, expect } from 'vitest';
import { suggestProfile, type ReportCandidate } from './suggest';

describe('suggestProfile', () => {
  describe('insufficient reports (< 3)', () => {
    it('returns null for empty report list', () => {
      expect(suggestProfile([], 'intermediate')).toBeNull();
    });

    it('returns null for 1 or 2 reports', () => {
      const single: ReportCandidate[] = [{ grade: 'S', adherence: 1.0 }];
      expect(suggestProfile(single, 'intermediate')).toBeNull();

      const pair: ReportCandidate[] = [
        { grade: 'S', adherence: 1.0 },
        { grade: 'A', adherence: 0.9 }
      ];
      expect(suggestProfile(pair, 'intermediate')).toBeNull();
    });

    it('returns null when fewer than 3 reports match currentProfile', () => {
      const reports: ReportCandidate[] = [
        { grade: 'S', adherence: 1.0, profile: 'intermediate' },
        { grade: 'S', adherence: 1.0, profile: 'intermediate' },
        { grade: 'S', adherence: 1.0, profile: 'beginner' }
      ];
      expect(suggestProfile(reports, 'intermediate')).toBeNull();
    });
  });

  describe('suggest moving up (all >= A and adherence >= 0.8)', () => {
    const perfectReports: ReportCandidate[] = [
      { grade: 'S', adherence: 0.95 },
      { grade: 'A', adherence: 0.85 },
      { grade: 'S', adherence: 0.80 }
    ];

    it('suggests moving up from beginner to intermediate', () => {
      const res = suggestProfile(perfectReports, 'beginner');
      expect(res).not.toBeNull();
      expect(res?.to).toBe('intermediate');
      expect(res?.reason).toContain('beginner');
      expect(res?.reason).toContain('grade A or higher');
    });

    it('suggests moving up from intermediate to advanced', () => {
      const res = suggestProfile(perfectReports, 'intermediate');
      expect(res).not.toBeNull();
      expect(res?.to).toBe('advanced');
      expect(res?.reason).toContain('intermediate');
      expect(res?.reason).toContain('grade A or higher');
    });

    it('returns null when already at advanced profile', () => {
      const res = suggestProfile(perfectReports, 'advanced');
      expect(res).toBeNull();
    });

    it('respects exact adherence boundary (0.80 qualifies, 0.79 does not)', () => {
      const onBoundary: ReportCandidate[] = [
        { grade: 'A', adherence: 0.80 },
        { grade: 'A', adherence: 0.80 },
        { grade: 'A', adherence: 0.80 }
      ];
      expect(suggestProfile(onBoundary, 'beginner')?.to).toBe('intermediate');

      const justBelow: ReportCandidate[] = [
        { grade: 'A', adherence: 0.80 },
        { grade: 'A', adherence: 0.80 },
        { grade: 'A', adherence: 0.79 }
      ];
      expect(suggestProfile(justBelow, 'beginner')).toBeNull();
    });

    it('rejects Grade B even with perfect adherence', () => {
      const withGradeB: ReportCandidate[] = [
        { grade: 'A', adherence: 1.0 },
        { grade: 'A', adherence: 1.0 },
        { grade: 'B', adherence: 1.0 }
      ];
      expect(suggestProfile(withGradeB, 'beginner')).toBeNull();
    });
  });

  describe('suggest moving down (all <= C or adherence < 0.4)', () => {
    const lowGradeReports: ReportCandidate[] = [
      { grade: 'C', adherence: 0.6 },
      { grade: 'D', adherence: 0.7 },
      { grade: 'C', adherence: 0.5 }
    ];

    const lowAdherenceReports: ReportCandidate[] = [
      { grade: 'B', adherence: 0.2 },
      { grade: 'B', adherence: 0.35 },
      { grade: 'B', adherence: 0.1 }
    ];

    const mixedStruggles: ReportCandidate[] = [
      { grade: 'C', adherence: 0.7 },
      { grade: 'B', adherence: 0.2 },
      { grade: 'D', adherence: 0.1 }
    ];

    it('suggests moving down from advanced to intermediate', () => {
      const res = suggestProfile(lowGradeReports, 'advanced');
      expect(res).not.toBeNull();
      expect(res?.to).toBe('intermediate');
      expect(res?.reason).toContain('advanced');
    });

    it('suggests moving down from intermediate to beginner', () => {
      const res = suggestProfile(lowAdherenceReports, 'intermediate');
      expect(res).not.toBeNull();
      expect(res?.to).toBe('beginner');
      expect(res?.reason).toContain('intermediate');
    });

    it('handles mixed low grade and low adherence across 3 games', () => {
      const res = suggestProfile(mixedStruggles, 'advanced');
      expect(res).not.toBeNull();
      expect(res?.to).toBe('intermediate');
    });

    it('returns null when already at beginner profile', () => {
      const res = suggestProfile(lowGradeReports, 'beginner');
      expect(res).toBeNull();
    });

    it('respects adherence threshold for down (< 0.40 triggers, 0.40 does not)', () => {
      const justUnder: ReportCandidate[] = [
        { grade: 'B', adherence: 0.39 },
        { grade: 'B', adherence: 0.35 },
        { grade: 'B', adherence: 0.20 }
      ];
      expect(suggestProfile(justUnder, 'intermediate')?.to).toBe('beginner');

      const onThreshold: ReportCandidate[] = [
        { grade: 'B', adherence: 0.40 },
        { grade: 'B', adherence: 0.35 },
        { grade: 'B', adherence: 0.20 }
      ];
      expect(suggestProfile(onThreshold, 'intermediate')).toBeNull();
    });
  });

  describe('middle / non-triggering cases', () => {
    it('returns null for consistent B-tier performance', () => {
      const bTier: ReportCandidate[] = [
        { grade: 'B', adherence: 0.7 },
        { grade: 'B', adherence: 0.65 },
        { grade: 'B', adherence: 0.72 }
      ];
      expect(suggestProfile(bTier, 'intermediate')).toBeNull();
    });

    it('only considers the most recent 3 reports for the profile', () => {
      const fourReports: ReportCandidate[] = [
        { grade: 'S', adherence: 0.9 },
        { grade: 'A', adherence: 0.85 },
        { grade: 'A', adherence: 0.8 },
        { grade: 'D', adherence: 0.1 } // 4th older game was bad, but top 3 are great
      ];
      expect(suggestProfile(fourReports, 'beginner')?.to).toBe('intermediate');
    });
  });
});
