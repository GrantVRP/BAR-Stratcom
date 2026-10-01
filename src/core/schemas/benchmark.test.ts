import { describe, expect, it } from 'vitest';
import { BenchmarkFileSchema, BenchmarkModeSchema, PercentilesSchema } from './benchmark';

describe('benchmark schemas', () => {
  const validP = { p25: 10, p50: 15, p75: 20 };

  const validSeriesPoint = {
    t: 30,
    metalIncome: validP,
    energyIncome: validP,
    buildPower: validP,
    armyMetal: validP
  };

  const validBenchmarkFile = {
    schemaVersion: 1,
    factionId: 'arm',
    mode: '1v1' as const,
    gameVersions: ['105.1.1-2550'],
    sampleCount: 12,
    sources: [
      {
        sessionId: 'session-1',
        player: 'ProPlayer',
        replayId: 'rep-1'
      }
    ],
    series: [validSeriesPoint]
  };

  describe('BenchmarkModeSchema', () => {
    it('accepts 1v1, small-team, large-team', () => {
      expect(BenchmarkModeSchema.parse('1v1')).toBe('1v1');
      expect(BenchmarkModeSchema.parse('small-team')).toBe('small-team');
      expect(BenchmarkModeSchema.parse('large-team')).toBe('large-team');
    });

    it('rejects invalid mode', () => {
      expect(BenchmarkModeSchema.safeParse('ffa').success).toBe(false);
    });
  });

  describe('PercentilesSchema', () => {
    it('accepts valid percentiles', () => {
      expect(PercentilesSchema.parse(validP)).toEqual(validP);
    });

    it('rejects missing percentile values', () => {
      expect(PercentilesSchema.safeParse({ p25: 10, p50: 15 }).success).toBe(false);
    });
  });

  describe('BenchmarkFileSchema', () => {
    it('accepts valid benchmark file', () => {
      expect(BenchmarkFileSchema.parse(validBenchmarkFile)).toEqual(validBenchmarkFile);
    });

    it('rejects negative sampleCount or invalid schemaVersion', () => {
      expect(BenchmarkFileSchema.safeParse({ ...validBenchmarkFile, sampleCount: -1 }).success).toBe(false);
      expect(BenchmarkFileSchema.safeParse({ ...validBenchmarkFile, schemaVersion: 2 }).success).toBe(false);
    });
  });
});
