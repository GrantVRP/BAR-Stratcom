import type { SessionTeamMember } from '../../src/core/schemas/session';
import type { H2ReplayListJson } from './replay-picker-report';

export type ProListReplay = H2ReplayListJson['replays'][number];

export interface ProMatch {
  replay: ProListReplay;
  /** `players`: map + player-name set; `factions`: map + factions per ally team (unique fallback). */
  by: 'players' | 'factions';
}

interface SessionForMatch {
  mapScriptName: string;
  teams: Array<Pick<SessionTeamMember, 'allyTeamId' | 'playerName' | 'factionId'>>;
}

const norm = (s: string): string => s.trim().toLowerCase();

function nameSet(names: string[]): string {
  return names.map(norm).sort().join('\n');
}

/** Ally teams as sorted faction lists, themselves sorted, so ally team numbering does not matter. */
function factionsPerAllyTeam(teams: Array<{ ally: number; faction: string | null }>): string {
  const byAlly = new Map<number, string[]>();
  for (const t of teams) {
    const list = byAlly.get(t.ally) ?? [];
    list.push(norm(t.faction ?? '?'));
    byAlly.set(t.ally, list);
  }
  return [...byAlly.values()]
    .map((l) => l.sort().join(','))
    .sort()
    .join(' | ');
}

/**
 * Finds the H2 list replay a captured session was recorded from (T08.3): same map scriptName and the
 * same player names; otherwise the only list replay on that map with the same factions per ally team.
 */
export function matchProReplay(session: SessionForMatch, list: readonly ProListReplay[]): ProMatch | null {
  const onMap = list.filter((r) => norm(r.map.scriptName) === norm(session.mapScriptName));
  const names = nameSet(session.teams.map((t) => t.playerName));
  const byPlayers = onMap.find((r) => nameSet(r.players.map((p) => p.name)) === names);
  if (byPlayers) return { replay: byPlayers, by: 'players' };

  const factions = factionsPerAllyTeam(session.teams.map((t) => ({ ally: t.allyTeamId, faction: t.factionId })));
  const byFactions = onMap.filter(
    (r) => factionsPerAllyTeam(r.players.map((p) => ({ ally: p.allyTeam, faction: p.faction }))) === factions
  );
  return byFactions.length === 1 ? { replay: byFactions[0]!, by: 'factions' } : null;
}

/** Fixture folder for a pro game: `<played date>-multi-<mode>-pro-<map>-<replay id prefix>`. */
export function proFixtureId(replay: ProListReplay, modeSlug: string, mapSlug: string): string {
  return `${replay.date}-multi-${modeSlug}-pro-${mapSlug}-${replay.id.slice(0, 6)}`;
}

/** Skill of a player in a list replay (case-insensitive name match), or undefined. */
export function playerSkill(replay: ProListReplay, playerName: string): number | undefined {
  return replay.players.find((p) => norm(p.name) === norm(playerName))?.skill;
}
