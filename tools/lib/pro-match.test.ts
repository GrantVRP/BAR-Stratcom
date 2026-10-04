import { describe, expect, it } from 'vitest';
import { matchProReplay, playerSkill, proFixtureId, type ProListReplay } from './pro-match';

// Synthetic list entries (test-only names), shaped like docs/plan/reports/h2-replay-list.json.
function replay(id: string, map: string, players: Array<[string, string, number, number]>): ProListReplay {
  return {
    id,
    url: `https://bar-rts.com/replays/${id}`,
    date: '2026-09-12',
    mode: players.length === 2 ? '1v1' : 'small-team',
    modeDetail: players.length === 2 ? '1v1' : '2v2',
    map: { scriptName: map, fileName: map.toLowerCase().replace(/ /g, '_') },
    gameVersion: 'Beyond All Reason test-1-abc',
    durationSec: 900,
    meanSkill: 40,
    players: players.map(([name, faction, skill, allyTeam]) => ({ name, faction, skill, allyTeam }))
  };
}

const A = replay('a'.repeat(32), 'Test Map 1.0', [
  ['Alpha', 'Cortex', 50.5, 0],
  ['Bravo', 'Armada', 44.1, 1]
]);
const B = replay('b'.repeat(32), 'Test Map 1.0', [
  ['Charlie', 'Cortex', 41, 0],
  ['Delta', 'Cortex', 39, 1]
]);
const C = replay('c'.repeat(32), 'Other Map 2.1', [
  ['Alpha', 'Cortex', 50.5, 0],
  ['Bravo', 'Armada', 44.1, 1]
]);
const LIST = [A, B, C];

const team = (playerName: string, factionId: string | null, allyTeamId: number) => ({ playerName, factionId, allyTeamId });

describe('pro replay matching (T08.3)', () => {
  it('matches by map and player names, ignoring order and case', () => {
    const m = matchProReplay({ mapScriptName: 'test map 1.0', teams: [team('bravo', 'armada', 1), team('ALPHA', 'cortex', 0)] }, LIST);
    expect(m).toEqual({ replay: A, by: 'players' });
  });

  it('needs the same map: the same players on another map are another replay', () => {
    const m = matchProReplay({ mapScriptName: 'Other Map 2.1', teams: [team('Alpha', 'cortex', 0), team('Bravo', 'armada', 1)] }, LIST);
    expect(m?.replay.id).toBe(C.id);
  });

  it('falls back to factions per ally team when the names differ, only if unique', () => {
    // Armada vs Cortex on Test Map: only replay A
    const m = matchProReplay({ mapScriptName: 'Test Map 1.0', teams: [team('Renamed1', 'armada', 3), team('Renamed2', 'cortex', 7)] }, LIST);
    expect(m).toEqual({ replay: A, by: 'factions' });
    // Cortex vs Cortex: only replay B
    expect(matchProReplay({ mapScriptName: 'Test Map 1.0', teams: [team('X', 'cortex', 0), team('Y', 'cortex', 1)] }, LIST)?.replay.id).toBe(B.id);
  });

  it('returns null when nothing or more than one replay fits', () => {
    expect(matchProReplay({ mapScriptName: 'Unknown Map', teams: [team('Alpha', 'cortex', 0)] }, LIST)).toBeNull();
    const twins = [A, { ...A, id: 'd'.repeat(32), players: A.players.map((p) => ({ ...p, name: `${p.name}2` })) }];
    expect(matchProReplay({ mapScriptName: 'Test Map 1.0', teams: [team('Q', 'armada', 0), team('R', 'cortex', 1)] }, twins)).toBeNull();
  });

  it('names pro fixtures by played date, mode, map and replay id prefix', () => {
    expect(proFixtureId(A, '1v1', 'test-map')).toBe('2026-09-12-multi-1v1-pro-test-map-aaaaaa');
  });

  it('looks up a player skill from the list', () => {
    expect(playerSkill(A, 'alpha')).toBe(50.5);
    expect(playerSkill(A, 'Nobody')).toBeUndefined();
  });
});
