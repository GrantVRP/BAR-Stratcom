import { describe, it, expect } from 'vitest';
import { analyze, interpolatePercentile } from './analyze';
import type { SessionMeta } from '../schemas/session';
import type { StateDoc, WidgetEvent } from '../schemas/protocol';
import type { BuildPlan } from '../schemas/plans';
import type { BenchmarkFile } from '../schemas/benchmark';
import type { SimResult } from '../sim/types';
import { SessionReportSchema } from '../schemas/report';

describe('analyze (04 §4, T07.2)', () => {
  const baseMeta: SessionMeta = {
    schemaVersion: 1,
    sessionId: 'test-pure-session',
    mode: 'player',
    gameVersion: 'test-version',
    engineVersion: '105.1.1',
    mapScriptName: 'Test_Map',
    durationSec: 100,
    startedAt: '2026-10-01T12:00:00.000Z',
    teams: [
      { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true }
    ],
    start: null,
    source: 'live',
    anonymized: false
  };

  const sampleState: StateDoc = {
    protocol: 1,
    sessionId: 'test-pure-session',
    seq: 1,
    frame: 30,
    gameSeconds: 1,
    wind: { current: 10 },
    me: { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', startUnitId: 'corcom' },
    res: {
      metal: { current: 500, storage: 1000, pull: 10, income: 10, expense: 10, share: 0.9, sent: 0, received: 0 },
      energy: { current: 500, storage: 1000, pull: 20, income: 20, expense: 20, share: 0.9, sent: 0, received: 0 }
    },
    counts: {},
    builders: { total: 1, idle: 0 },
    factories: { total: 0, idle: 0 },
    commander: { alive: true, idle: false },
    bp: { total: 300, active: 300 },
    enemies: {}
  };

  it('evaluates cleanly with a simulated plan', () => {
    const plan: BuildPlan = {
      schemaVersion: 1,
      id: 'test-plan',
      title: 'Test Plan',
      factionId: 'cortex',
      gameVersion: 'test-version',
      modes: ['1v1'],
      role: 'any',
      skill: 'intermediate',
      opening: 'vehicle',
      energyStyle: 'wind',
      source: { kind: 'manual', createdAt: '2026-10-01T12:00:00.000Z' },
      steps: [
        { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'cormex', count: 1, targetTime: 10 }
      ]
    };

    const sim: SimResult = {
      steps: [{ stepId: 's1', start: 0, finish: 10 }],
      intervals: { energyStall: [], metalStall: [], energyFloat: [], metalFloat: [] },
      flags: [],
      samples: [],
      totals: { energyStallSec: 0, metalStallSec: 0, idleBpSec: 0 }
    };

    const events: WidgetEvent[] = [
      { f: 300, e: 'finished', u: 10, d: 'cormex', tm: 0 }
    ];

    const report = analyze(
      { meta: baseMeta, states: [sampleState], events },
      plan,
      sim,
      null,
      'intermediate'
    );

    expect(report.sessionId).toBe('test-pure-session');
    expect(report.planId).toBe('test-plan');
    expect(report.adherence).toBe(1.0);
    expect(report.steps.length).toBe(1);
    expect(report.steps[0]?.actualFinish).toBe(10);
    expect(report.steps[0]?.deltaSec).toBe(0);
    expect(SessionReportSchema.safeParse(report).success).toBe(true);
  });

  it('evaluates cleanly without an active plan', () => {
    const report = analyze(
      { meta: baseMeta, states: [sampleState], events: [] },
      null,
      null,
      null,
      'intermediate'
    );

    expect(report.steps).toEqual([]);
    expect(report.adherence).toBe(1.0);
    expect(report.planId).toBeUndefined();
    expect(report.grade).toBe('S');
    expect(SessionReportSchema.safeParse(report).success).toBe(true);
  });

  it('evaluates benchmark percentiles when benchmark file is provided', () => {
    const stateAt300: StateDoc = {
      ...sampleState,
      frame: 9000,
      gameSeconds: 300,
      res: {
        ...sampleState.res!,
        metal: { ...sampleState.res!.metal, income: 15 }
      }
    };

    const mockBenchmark: BenchmarkFile = {
      schemaVersion: 1,
      factionId: 'cortex',
      mode: '1v1',
      gameVersions: ['test-version'],
      sampleCount: 10,
      sources: [],
      series: [
        {
          t: 300,
          metalIncome: { p25: 10, p50: 15, p75: 25 },
          energyIncome: { p25: 100, p50: 200, p75: 300 },
          buildPower: { p25: 300, p50: 400, p75: 500 },
          armyMetal: { p25: 500, p50: 1000, p75: 1500 }
        }
      ]
    };

    const metaLong: SessionMeta = { ...baseMeta, durationSec: 350 };
    const report = analyze(
      { meta: metaLong, states: [sampleState, stateAt300], events: [] },
      null,
      null,
      mockBenchmark,
      'intermediate'
    );

    expect(report.benchmark).not.toBeNull();
    // Metal income at 300s is 15, which exactly equals p50=15 -> percentile 50
    expect(report.benchmark?.percentileMetalAt300).toBe(50);
    expect(report.benchmark?.percentileMetalAt600).toBeNull();
  });

  it('handles plan with only non-build steps cleanly', () => {
    const nonBuildPlan: BuildPlan = {
      schemaVersion: 1,
      id: 'plan-nonbuild',
      title: 'Note Plan',
      factionId: 'cortex',
      gameVersion: 'test-version',
      modes: ['1v1'],
      role: 'any',
      skill: 'beginner',
      opening: 'mixed',
      energyStyle: 'solar',
      source: { kind: 'manual', createdAt: '2026-10-01T12:00:00.000Z' },
      steps: [
        { id: 's1', actor: { kind: 'commander' }, action: 'note', count: 1, targetTime: 5, text: 'Rally' }
      ]
    };

    const sim: SimResult = {
      steps: [{ stepId: 's1', start: 0, finish: 5 }],
      intervals: { energyStall: [], metalStall: [], energyFloat: [], metalFloat: [] },
      flags: [],
      samples: [],
      totals: { energyStallSec: 0, metalStallSec: 0, idleBpSec: 0 }
    };

    const report = analyze({ meta: baseMeta, states: [], events: [] }, nonBuildPlan, sim, null, 'intermediate');
    expect(report.adherence).toBe(1.0);
    expect(report.steps.length).toBe(1);
    expect(report.steps[0]?.actualFinish).toBeNull();
  });

  describe('interpolatePercentile (04 §4.1)', () => {
    const percentiles = { p25: 10, p50: 20, p75: 35 };

    it('interpolates known percentile checkpoints exactly', () => {
      expect(interpolatePercentile(percentiles, 0)).toBe(0);
      expect(interpolatePercentile(percentiles, 10)).toBe(25);
      expect(interpolatePercentile(percentiles, 20)).toBe(50);
      expect(interpolatePercentile(percentiles, 35)).toBe(75);
    });

    it('interpolates values between checkpoints linearly', () => {
      expect(interpolatePercentile(percentiles, 5)).toBe(13);
      expect(interpolatePercentile(percentiles, 15)).toBe(38);
      expect(interpolatePercentile(percentiles, 27.5)).toBe(63);
    });

    it('clamps values below 0 and above max to [0, 100]', () => {
      expect(interpolatePercentile(percentiles, -10)).toBe(0);
      expect(interpolatePercentile(percentiles, 1000)).toBe(100);
    });
  });
});
