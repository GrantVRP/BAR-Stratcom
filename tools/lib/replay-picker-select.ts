import type { PickMixResult, ProcessedReplay } from './replay-picker-types';

/** Diversity caps for the pro replay list. */
export interface PickCaps {
  /** A player may appear in at most this many 1v1 picks. */
  duelPlayerMax: number;
  /** The same two players may meet at most this many times. */
  duelPairMax: number;
  /** A player may appear in at most this many team picks (small + large). */
  teamPlayerMax: number;
  /** At most this many picks (all modes) from one calendar day. */
  dayMax: number;
}

export const DEFAULT_CAPS: PickCaps = { duelPlayerMax: 2, duelPairMax: 1, teamPlayerMax: 3, dayMax: 2 };

export const TARGET = { duels: 12, smallTeams: 8, largeTeams: 4 } as const;
export const DUEL_QUOTA = { armada: 5, cortex: 5, maps: 4 } as const;

const PLAYABLE = new Set(['armada', 'cortex']);

function counter(): { get: (k: string) => number; add: (k: string) => void } {
  const m = new Map<string, number>();
  return { get: (k) => m.get(k) ?? 0, add: (k) => m.set(k, (m.get(k) ?? 0) + 1) };
}

/** Same map and same set of player names: two such picks cannot be told apart after capture. */
export function mapPlayerKey(r: ProcessedReplay): string {
  const names = r.players.map((p) => p.name.toLowerCase()).sort();
  return `${(r.mapFileName || r.mapName).toLowerCase()}|${names.join(',')}`;
}

function isPlayableDuel(r: ProcessedReplay): boolean {
  return r.mode === '1v1' && r.players.length === 2 && r.players.every((p) => PLAYABLE.has(p.faction.toLowerCase()));
}

interface Shared {
  caps: PickCaps;
  perDay: ReturnType<typeof counter>;
  keys: Set<string>;
}

function sharedOk(r: ProcessedReplay, s: Shared): boolean {
  return s.perDay.get(r.date) < s.caps.dayMax && !s.keys.has(mapPlayerKey(r));
}

function take(r: ProcessedReplay, s: Shared): void {
  s.perDay.add(r.date);
  s.keys.add(mapPlayerKey(r));
}

/**
 * Picks the 12 duels by skill, within the caps, while keeping the quotas (≥ 5 involving Armada,
 * ≥ 5 involving Cortex, ≥ 4 maps) reachable: a duel that does not help an open quota is skipped
 * once the remaining slots are only just enough to close the quotas.
 */
function pickDuels(sorted: ProcessedReplay[], s: Shared): ProcessedReplay[] {
  const picked: ProcessedReplay[] = [];
  const perPlayer = counter();
  const perPair = counter();
  const maps = new Set<string>();
  let armada = 0;
  let cortex = 0;

  for (const r of sorted.filter(isPlayableDuel)) {
    if (picked.length >= TARGET.duels) break;
    const names = r.players.map((p) => p.name.toLowerCase());
    const pair = [...names].sort().join('|');
    if (names.some((n) => perPlayer.get(n) >= s.caps.duelPlayerMax)) continue;
    if (perPair.get(pair) >= s.caps.duelPairMax || !sharedOk(r, s)) continue;

    const map = (r.mapFileName || r.mapName).toLowerCase();
    const after = {
      armada: armada + (r.hasArmada ? 1 : 0),
      cortex: cortex + (r.hasCortex ? 1 : 0),
      maps: maps.size + (maps.has(map) ? 0 : 1)
    };
    const slotsLeft = TARGET.duels - picked.length - 1;
    const stillNeeded = Math.max(
      DUEL_QUOTA.armada - after.armada,
      DUEL_QUOTA.cortex - after.cortex,
      DUEL_QUOTA.maps - after.maps,
      0
    );
    if (stillNeeded > slotsLeft) continue;

    picked.push(r);
    names.forEach((n) => perPlayer.add(n));
    perPair.add(pair);
    maps.add(map);
    armada = after.armada;
    cortex = after.cortex;
    take(r, s);
  }
  return picked;
}

function pickTeams(
  sorted: ProcessedReplay[],
  mode: 'small-team' | 'large-team',
  target: number,
  perPlayer: ReturnType<typeof counter>,
  s: Shared
): ProcessedReplay[] {
  const picked: ProcessedReplay[] = [];
  for (const r of sorted) {
    if (picked.length >= target) break;
    if (r.mode !== mode || !sharedOk(r, s)) continue;
    const names = r.players.map((p) => p.name.toLowerCase());
    if (names.some((n) => perPlayer.get(n) >= s.caps.teamPlayerMax)) continue;
    picked.push(r);
    names.forEach((n) => perPlayer.add(n));
    take(r, s);
  }
  return picked;
}

/** Picks the target mix: 12 × 1v1, 8 × small team, 4 × large team, ranked by mean skill within the caps. */
export function pickTargetMix(candidates: ProcessedReplay[], caps: PickCaps = DEFAULT_CAPS): PickMixResult {
  const sorted = [...candidates].sort((a, b) => b.meanSkill - a.meanSkill || a.id.localeCompare(b.id));
  const shared: Shared = { caps, perDay: counter(), keys: new Set() };

  const duels = pickDuels(sorted, shared);
  const teamPlayers = counter();
  const largeTeams = pickTeams(sorted, 'large-team', TARGET.largeTeams, teamPlayers, shared);
  const smallTeams = pickTeams(sorted, 'small-team', TARGET.smallTeams, teamPlayers, shared);

  const notes: string[] = [];
  const armada = duels.filter((d) => d.hasArmada).length;
  const cortex = duels.filter((d) => d.hasCortex).length;
  const maps = new Set(duels.map((d) => d.mapFileName || d.mapName)).size;
  if (duels.length < TARGET.duels) notes.push(`Only ${duels.length}/${TARGET.duels} 1v1 games fit the caps.`);
  if (armada < DUEL_QUOTA.armada) notes.push(`Only ${armada} 1v1 games involve Armada (target ${DUEL_QUOTA.armada}).`);
  if (cortex < DUEL_QUOTA.cortex) notes.push(`Only ${cortex} 1v1 games involve Cortex (target ${DUEL_QUOTA.cortex}).`);
  if (maps < DUEL_QUOTA.maps) notes.push(`1v1 games cover only ${maps} maps (target ${DUEL_QUOTA.maps}).`);
  if (smallTeams.length < TARGET.smallTeams) notes.push(`Only ${smallTeams.length}/${TARGET.smallTeams} small team games fit the caps.`);
  if (largeTeams.length < TARGET.largeTeams) notes.push(`Only ${largeTeams.length}/${TARGET.largeTeams} large team games fit the caps.`);

  return { picked: [...duels, ...smallTeams, ...largeTeams], duels, smallTeams, largeTeams, notes };
}
