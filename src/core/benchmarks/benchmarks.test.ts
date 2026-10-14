import { describe, expect, it } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import snapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../registry';
import { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema, type BenchmarkFile } from '../schemas';
import {
  bandAt,
  benchmarkFileName,
  benchmarkKeyFor,
  isEarlyData,
  percentileAt,
  percentiles,
  teamMetrics
} from './index';

const P = (p25: number, p50: number, p75: number): { p25: number; p50: number; p75: number } => ({ p25, p50, p75 });

// Synthetic benchmark (hand-computed numbers).
const bench: BenchmarkFile = {
  schemaVersion: 1,
  factionId: 'cortex',
  mode: '1v1',
  gameVersions: ['test-1'],
  sampleCount: 4,
  sources: [],
  series: [
    { t: 0, metalIncome: P(0, 0, 0), energyIncome: P(0, 0, 0), buildPower: P(300, 300, 300), armyMetal: P(0, 0, 0) },
    { t: 30, metalIncome: P(2, 4, 6), energyIncome: P(20, 30, 40), buildPower: P(300, 300, 300), armyMetal: P(0, 0, 0) },
    { t: 60, metalIncome: P(4, 8, 12), energyIncome: P(40, 60, 80), buildPower: P(400, 500, 600), armyMetal: P(0, 100, 200) }
  ]
};

describe('benchmark maths', () => {
  it('computes p25/p50/p75 with linear interpolation between ranks', () => {
    expect(percentiles([10])).toEqual(P(10, 10, 10));
    expect(percentiles([4, 1, 3, 2])).toEqual(P(1.75, 2.5, 3.25));
    expect(percentiles([0, 10, 20, 30, 40])).toEqual(P(10, 20, 30));
    expect(() => percentiles([])).toThrow();
  });

  it('reads the band at a series point and interpolates between points', () => {
    expect(bandAt(bench, 'metalIncome', 30)).toEqual(P(2, 4, 6));
    expect(bandAt(bench, 'metalIncome', 45)).toEqual(P(3, 6, 9));
    expect(bandAt(bench, 'buildPower', 0)).toEqual(P(300, 300, 300));
  });

  it('has no band outside the recorded series', () => {
    expect(bandAt(bench, 'metalIncome', 61)).toBeNull();
    expect(bandAt(bench, 'metalIncome', -1)).toBeNull();
    expect(bandAt({ ...bench, series: [] }, 'metalIncome', 0)).toBeNull();
  });

  it('places a value among pro games at time t', () => {
    expect(percentileAt(bench, 'metalIncome', 60, 4)).toBe(25);
    expect(percentileAt(bench, 'metalIncome', 60, 8)).toBe(50);
    expect(percentileAt(bench, 'metalIncome', 60, 10)).toBe(63);
    expect(percentileAt(bench, 'metalIncome', 45, 9)).toBe(75);
    expect(percentileAt(bench, 'metalIncome', 600, 9)).toBeNull();
  });

  it('labels fewer than 5 samples as early data', () => {
    expect(isEarlyData(bench)).toBe(true);
    expect(isEarlyData({ sampleCount: 5 })).toBe(false);
  });
});

describe('benchmark key and metrics', () => {
  it('uses my faction and the team layout', () => {
    const duel = [
      { teamId: 0, allyTeamId: 0, factionId: 'cortex', isMe: true },
      { teamId: 1, allyTeamId: 1, factionId: 'armada', isMe: false }
    ];
    expect(benchmarkKeyFor(duel)).toEqual({ factionId: 'cortex', mode: '1v1' });
    const fourVsFour = Array.from({ length: 8 }, (_, i) => ({ teamId: i, allyTeamId: i % 2, factionId: 'armada', isMe: i === 3 }));
    expect(benchmarkKeyFor(fourVsFour)).toEqual({ factionId: 'armada', mode: 'small-team' });
    const eightVsEight = Array.from({ length: 16 }, (_, i) => ({ teamId: i, allyTeamId: i % 2, factionId: 'armada', isMe: i === 0 }));
    expect(benchmarkKeyFor(eightVsEight)?.mode).toBe('large-team');
    expect(benchmarkFileName({ factionId: 'armada', mode: 'large-team' })).toBe('armada-large-team.json');
  });

  it('has no key for spectators or an unknown faction', () => {
    expect(benchmarkKeyFor([{ teamId: 0, allyTeamId: 0, factionId: 'cortex', isMe: false }])).toBeNull();
    expect(benchmarkKeyFor([{ teamId: 0, allyTeamId: 0, factionId: null, isMe: true }])).toBeNull();
  });

  it('counts only combat units in army metal', () => {
    const registry = createRegistry(
      UnitSnapshotSchema.parse(snapshotData),
      FactionsFileSchema.parse(factionsData),
      AliasesFileSchema.parse(aliasesData)
    );
    const pawn = registry.get('armpw')!;
    const team = {
      res: { metal: { income: 7.5 }, energy: { income: 120 } },
      bp: { total: 450 },
      counts: { armpw: { alive: 3 }, armmex: { alive: 4 }, armcom: { alive: 1 }, armlab: { alive: 1 } }
    };
    expect(teamMetrics(team, registry)).toEqual({
      metalIncome: 7.5,
      energyIncome: 120,
      buildPower: 450,
      armyMetal: 3 * pawn.metalCost
    });
  });
});
