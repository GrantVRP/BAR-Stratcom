import { describe, expect, it } from 'vitest';
import { SessionReportGradeSchema, SessionReportMetricsSchema, SessionReportSchema } from './report';

describe('report schemas', () => {
  const validMetrics = {
    durationSec: 620,
    energyStallSec: 15,
    metalStallSec: 0,
    metalFloatSec: 25,
    energyFloatSec: 0,
    idleFactorySec: 5,
    idleBuilderSec: 10,
    idleCommanderSec: 4,
    bpUtilisation: 0.85,
    timeToFirstFactory: 45,
    timeToT2: 480,
    incomeAt: {
      '180': { metal: 12, energy: 150 },
      '300': { metal: 25, energy: 320 },
      '480': { metal: 45, energy: 750 },
      '600': { metal: 70, energy: 1200 }
    }
  };

  const validStep = {
    stepId: 'step-1',
    plannedFinish: 30,
    actualFinish: 28,
    deltaSec: -2
  };

  const validReport = {
    schemaVersion: 1,
    sessionId: 'session-123',
    planId: 'plan-abc',
    profile: 'intermediate' as const,
    factionId: 'arm',
    metrics: validMetrics,
    steps: [validStep],
    adherence: 0.9,
    benchmark: {
      percentileMetalAt300: 65,
      percentileMetalAt600: 72
    },
    tips: [
      {
        id: 'tip.metal-float',
        severity: 'warn' as const,
        text: 'Floated metal for 25s.'
      }
    ],
    grade: 'A' as const,
    profileSuggestion: {
      to: 'advanced' as const,
      reason: 'Consistently high adherence'
    }
  };

  describe('SessionReportGradeSchema', () => {
    it('accepts grades S, A, B, C, D', () => {
      const grades = ['S', 'A', 'B', 'C', 'D'] as const;
      for (const grade of grades) {
        expect(SessionReportGradeSchema.parse(grade)).toBe(grade);
      }
    });

    it('rejects invalid grade', () => {
      expect(SessionReportGradeSchema.safeParse('F').success).toBe(false);
    });
  });

  describe('SessionReportMetricsSchema', () => {
    it('accepts valid metrics and nullable fields', () => {
      expect(SessionReportMetricsSchema.parse(validMetrics)).toEqual(validMetrics);
      const withNulls = {
        ...validMetrics,
        timeToFirstFactory: null,
        timeToT2: null,
        incomeAt: {
          '180': null,
          '300': null,
          '480': null,
          '600': null
        }
      };
      expect(SessionReportMetricsSchema.parse(withNulls)).toEqual(withNulls);
    });

    it('rejects bpUtilisation out of 0..1 bounds', () => {
      expect(SessionReportMetricsSchema.safeParse({ ...validMetrics, bpUtilisation: 1.1 }).success).toBe(
        false
      );
      expect(SessionReportMetricsSchema.safeParse({ ...validMetrics, bpUtilisation: -0.1 }).success).toBe(
        false
      );
    });
  });

  describe('SessionReportSchema', () => {
    it('accepts valid session report', () => {
      expect(SessionReportSchema.parse(validReport)).toEqual(validReport);
    });

    it('accepts null profileSuggestion and benchmark', () => {
      const reportWithNulls = {
        ...validReport,
        profileSuggestion: null,
        benchmark: null,
        factionId: null
      };
      expect(SessionReportSchema.parse(reportWithNulls)).toEqual(reportWithNulls);
    });

    it('rejects tips array exceeding 3 tips', () => {
      const tooManyTips = [
        { id: '1', severity: 'info' as const, text: 't1' },
        { id: '2', severity: 'info' as const, text: 't2' },
        { id: '3', severity: 'info' as const, text: 't3' },
        { id: '4', severity: 'info' as const, text: 't4' }
      ];
      expect(SessionReportSchema.safeParse({ ...validReport, tips: tooManyTips }).success).toBe(false);
    });

    it('rejects adherence out of 0..1 bounds', () => {
      expect(SessionReportSchema.safeParse({ ...validReport, adherence: 1.5 }).success).toBe(false);
    });
  });
});
