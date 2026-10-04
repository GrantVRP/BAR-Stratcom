export interface RawPlayer {
  id?: number;
  name: string;
  faction?: string;
  skill?: string;
  rank?: number;
}

export interface RawAllyTeam {
  winningTeam?: boolean;
  Players?: RawPlayer[];
  AIs?: Array<{ shortName: string }>;
}

export interface RawReplayDetail {
  id: string;
  fileName: string;
  engineVersion: string;
  gameVersion: string;
  startTime: string;
  durationMs: number;
  gameEndedNormally: boolean;
  hasBots: boolean;
  preset: string;
  Map?: { fileName?: string; scriptName?: string };
  AllyTeams: RawAllyTeam[];
}

export interface ProcessedPlayer {
  name: string;
  faction: string;
  skill: number;
}

export interface ProcessedReplay {
  id: string;
  fileName: string;
  startTime: string;
  date: string;
  durationMs: number;
  durationFormatted: string;
  mapName: string;
  mapFileName: string;
  mode: '1v1' | 'small-team' | 'large-team' | 'other';
  modeDetail: string;
  meanSkill: number;
  players: ProcessedPlayer[];
  hasArmada: boolean;
  hasCortex: boolean;
  gameVersion: string;
}

export interface FilterOptions {
  minDurationMs?: number;
  maxAgeDays?: number;
  versionFamily?: string;
}

export interface PickMixResult {
  picked: ProcessedReplay[];
  duels: ProcessedReplay[];
  smallTeams: ProcessedReplay[];
  largeTeams: ProcessedReplay[];
  notes: string[];
}

/** Parses a skill string like "[33.65]" into a numeric float. */
export function parseSkill(skillStr: string | null | undefined): number {
  if (!skillStr || typeof skillStr !== 'string') return 0;
  const match = skillStr.match(/\[?([\d.]+)\]?/);
  return match && match[1] ? parseFloat(match[1]) : 0;
}

/** Formats durationMs as m:ss. */
export function formatDuration(durationMs: number): string {
  const totalSec = Math.round(durationMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

/** Direct CDN download URL for replay .sdfz file. */
export function getDirectDownloadUrl(fileName: string | undefined): string {
  const enc = encodeURIComponent(fileName || '');
  return `https://storage.uk.cloud.ovh.net/v1/AUTH_10286efc0d334efd917d476d7183232e/BAR/demos/${enc}`;
}

/** Classifies match mode per 04 §7: 1v1 -> '1v1', <=4 per ally team -> 'small-team', else 'large-team'. */
export function classifyMode(allyTeams: RawAllyTeam[]): '1v1' | 'small-team' | 'large-team' | 'other' {
  if (!allyTeams || allyTeams.length < 2) return 'other';
  const teamSizes = allyTeams.map((at) => (at.Players || []).length);
  const totalPlayers = teamSizes.reduce((a, b) => a + b, 0);
  if (totalPlayers < 2) return 'other';

  const maxTeam = Math.max(...teamSizes);
  const minTeam = Math.min(...teamSizes);

  if (teamSizes.length === 2 && teamSizes[0] === 1 && teamSizes[1] === 1) {
    return '1v1';
  }
  if (maxTeam <= 4 && minTeam >= 1) {
    return 'small-team';
  }
  if (maxTeam > 4) {
    return 'large-team';
  }
  return 'other';
}

/** Checks whether a replay meets filtering criteria. */
export function filterReplayCandidate(detail: RawReplayDetail, options: FilterOptions = {}): boolean {
  const minDurationMs = options.minDurationMs ?? 480000; // 8 minutes
  const maxAgeDays = options.maxAgeDays ?? 60;
  const versionFamily = options.versionFamily ?? 'test-31';

  if (!detail.gameEndedNormally) return false;
  if (detail.hasBots) return false;
  if (detail.durationMs < minDurationMs) return false;

  const hasAIs = (detail.AllyTeams || []).some((at) => (at.AIs || []).length > 0);
  if (hasAIs) return false;

  const startTime = new Date(detail.startTime).getTime();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  if (Number.isNaN(startTime) || startTime < cutoff) return false;

  if (versionFamily && !detail.gameVersion?.includes(versionFamily)) return false;

  return true;
}

/** Converts a raw replay detail to a processed record. */
export function processReplayDetail(detail: RawReplayDetail): ProcessedReplay {
  const players: ProcessedPlayer[] = [];
  const teamSizes: number[] = [];

  for (const at of detail.AllyTeams || []) {
    const list = at.Players || [];
    teamSizes.push(list.length);
    for (const p of list) {
      players.push({
        name: p.name || 'Unknown',
        faction: p.faction || 'Unknown',
        skill: parseSkill(p.skill)
      });
    }
  }

  const meanSkill = players.length
    ? Number((players.reduce((sum, p) => sum + p.skill, 0) / players.length).toFixed(2))
    : 0;

  const mode = classifyMode(detail.AllyTeams || []);
  const modeDetail = mode === '1v1' ? '1v1' : `${teamSizes.join('v')}`;
  const factions = players.map((p) => p.faction.toLowerCase());

  return {
    id: detail.id,
    fileName: detail.fileName,
    startTime: detail.startTime,
    date: detail.startTime ? detail.startTime.slice(0, 10) : 'Unknown',
    durationMs: detail.durationMs,
    durationFormatted: formatDuration(detail.durationMs),
    mapName: detail.Map?.scriptName || detail.Map?.fileName || 'Unknown',
    mapFileName: detail.Map?.fileName || '',
    mode,
    modeDetail,
    meanSkill,
    players,
    hasArmada: factions.includes('armada'),
    hasCortex: factions.includes('cortex'),
    gameVersion: detail.gameVersion
  };
}
