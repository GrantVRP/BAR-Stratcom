import { describe, expect, it } from 'vitest';
import type { ProcessedReplay } from './replay-picker-types';
import { mapPlayerKey, pickTargetMix } from './replay-picker-select';

type Side = [name: string, faction: string];

let seq = 0;
function replay(
  mode: ProcessedReplay['mode'],
  meanSkill: number,
  sides: Side[],
  opts: { map?: string; date?: string } = {}
): ProcessedReplay {
  seq += 1;
  const map = opts.map ?? 'Map A';
  const date = opts.date ?? `2026-09-${String((seq % 28) + 1).padStart(2, '0')}`;
  const players = sides.map(([name, faction], i) => ({
    name,
    faction,
    skill: meanSkill,
    allyTeam: mode === '1v1' ? i : i % 2
  }));
  const factions = sides.map(([, f]) => f.toLowerCase());
  return {
    id: `r${String(seq).padStart(4, '0')}`,
    fileName: `r${seq}.sdfz`,
    startTime: `${date}T12:00:00.000Z`,
    date,
    durationMs: 900000,
    durationFormatted: '15m 00s',
    mapName: map,
    mapFileName: map.toLowerCase().replace(/\s+/g, '_'),
    mode,
    modeDetail: mode,
    meanSkill,
    players,
    hasArmada: factions.includes('armada'),
    hasCortex: factions.includes('cortex'),
    hasLegion: factions.includes('legion'),
    gameVersion: 'Beyond All Reason test-31479-433a460'
  };
}

const MAPS = ['Map A', 'Map B', 'Map C', 'Map D', 'Map E'];

function duelPool(): ProcessedReplay[] {
  const pool: ProcessedReplay[] = [];
  // One dominant player who would fill the list without caps
  for (let i = 0; i < 8; i++) {
    pool.push(replay('1v1', 60 - i * 0.1, [['Star', 'Armada'], ['Rival', 'Cortex']], { map: MAPS[i % 5] }));
  }
  for (let i = 0; i < 30; i++) {
    const f1 = i % 3 === 0 ? 'Cortex' : 'Armada';
    const f2 = i % 2 === 0 ? 'Cortex' : 'Armada';
    pool.push(replay('1v1', 50 - i * 0.2, [[`A${i}`, f1], [`B${i}`, f2]], { map: MAPS[i % 5] }));
  }
  pool.push(replay('1v1', 70, [['LegionFan', 'Legion'], ['Other', 'Cortex']]));
  return pool;
}

describe('pickTargetMix caps', () => {
  it('limits a player to 2 duels and a pairing to 1, and never picks a Legion duel', () => {
    const result = pickTargetMix(duelPool());
    expect(result.duels).toHaveLength(12);
    const appearances = new Map<string, number>();
    for (const d of result.duels) for (const p of d.players) appearances.set(p.name, (appearances.get(p.name) ?? 0) + 1);
    expect(Math.max(...appearances.values())).toBeLessThanOrEqual(2);
    expect(appearances.get('Star')).toBe(1); // Star always meets Rival: one pairing only
    expect(result.duels.some((d) => d.hasLegion)).toBe(false);
  });

  it('keeps the Armada, Cortex and map quotas reachable', () => {
    const pool: ProcessedReplay[] = [];
    // The 20 strongest duels are Armada mirrors on one map
    for (let i = 0; i < 20; i++) pool.push(replay('1v1', 60 - i * 0.1, [[`X${i}`, 'Armada'], [`Y${i}`, 'Armada']]));
    for (let i = 0; i < 10; i++) {
      pool.push(replay('1v1', 30 - i * 0.1, [[`C${i}`, 'Cortex'], [`D${i}`, 'Cortex']], { map: MAPS[i % 5] }));
    }
    const result = pickTargetMix(pool);
    expect(result.duels).toHaveLength(12);
    expect(result.duels.filter((d) => d.hasCortex).length).toBeGreaterThanOrEqual(5);
    expect(new Set(result.duels.map((d) => d.mapName)).size).toBeGreaterThanOrEqual(4);
    expect(result.notes).toEqual(expect.arrayContaining([expect.stringContaining('small team')]));
  });

  it('allows at most 2 picks per day and no two picks with the same map and players', () => {
    const pool = duelPool().map((r, i) => ({ ...r, date: `2026-09-${String((i % 6) + 1).padStart(2, '0')}` }));
    const result = pickTargetMix(pool);
    const perDay = new Map<string, number>();
    for (const r of result.picked) perDay.set(r.date, (perDay.get(r.date) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2);
    expect(new Set(result.picked.map(mapPlayerKey)).size).toBe(result.picked.length);
  });

  it('limits a player to 3 team picks and fills small and large team slots by skill', () => {
    const pool: ProcessedReplay[] = [];
    for (let i = 0; i < 10; i++) {
      const first: Side = i < 5 ? ['Regular', 'Armada'] : [`S${i}`, 'Armada'];
      pool.push(replay('small-team', 40 - i, [first, [`S${i}a`, 'Cortex'], [`S${i}b`, 'Armada'], [`S${i}c`, 'Cortex']]));
    }
    for (let i = 0; i < 6; i++) {
      const sides: Side[] = Array.from({ length: 16 }, (_, k) => [`L${i}-${k}`, k % 2 ? 'Cortex' : 'Armada']);
      pool.push(replay('large-team', 45 - i, sides));
    }
    const result = pickTargetMix(pool);
    expect(result.largeTeams.map((r) => r.meanSkill)).toEqual([45, 44, 43, 42]);
    expect(result.smallTeams).toHaveLength(8);
    expect(result.smallTeams.filter((r) => r.players.some((p) => p.name === 'Regular'))).toHaveLength(3);
    // Regular's 4th and 5th games (skill 37, 36) are skipped for the cap
    expect(result.smallTeams.map((r) => r.meanSkill)).toEqual([40, 39, 38, 35, 34, 33, 32, 31]);
    expect(result.notes).toContain('Only 0/12 1v1 games fit the caps.');
  });
});
