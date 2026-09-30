/**
 * Beyond All Reason (BAR) Public API Client
 * 
 * Free, public, zero-authentication endpoints:
 * - BAR DB REST API: https://api.bar-rts.com
 * - Teiserver Public API: https://server4.beyondallreason.info/teiserver/api/public
 */

// ============================================================================
// Types: Live Battles & Lobby Scouting
// ============================================================================

export interface BarBattlePlayerStatus {
  ingame: boolean;
  away: boolean;
  rank: number;
  moderator: boolean;
  bot: boolean;
}

export interface BarBattlePlayer {
  username: string;
  userId: number;
  country?: string;
  status: BarBattlePlayerStatus;
  skill?: string;           // e.g. "[33.65 ??]"
  skillNumeric?: number;    // parsed OpenSkill float
  gameStatus?: string;      // "Playing" | "Spectating"
  joinedGameAfterStart?: boolean;
  team?: number;
}

export interface BarBattle {
  battleId: number;
  title: string;
  map: string;
  mapHash?: number;
  maxPlayers: number;
  passworded: boolean;
  locked: boolean;
  game: string;
  ip: string;
  port: number;
  rank: number;
  founder: {
    username: string;
    userId: number;
    country: string;
    status: BarBattlePlayerStatus;
  };
  players: BarBattlePlayer[];
}

// ============================================================================
// Types: Leaderboard & Meta
// ============================================================================

export interface BarLeaderboardPlayer {
  id: number;
  name: string;
  rating: number;
}

export interface BarLeaderboardCategory {
  name: "Duel" | "Small Team" | "Large Team" | "FFA" | string;
  players: BarLeaderboardPlayer[];
}

// ============================================================================
// Types: Replays & Match Performance
// ============================================================================

export interface BarReplaySummary {
  id: string;
  startTime: string;
  durationMs: number;
  Map: {
    fileName: string;
    scriptName: string;
    width?: number;
    height?: number;
  };
  AllyTeams: {
    winningTeam: boolean;
    Players: {
      name: string;
      faction?: string;
      countryCode?: string;
      skill?: string;
    }[];
    AIs: {
      shortName: string;
    }[];
  }[];
}

export interface BarReplayDetailAward {
  teamId: number;
  value: number;
}

export interface BarReplayDetailPlayer {
  id: number;
  playerId: number;
  name: string;
  teamId: number;
  faction: string;
  countryCode: string;
  rank: number;
  skill?: string;
  skillUncertainty?: number;
  startPos?: {
    x: number;
    y: number;
    z: number;
  };
  userId: number;
}

export interface BarReplayDetail {
  id: string;
  startTime: string;
  durationMs: number;
  Map: {
    id: number;
    scriptName: string;
    fileName: string;
    width: number;
    height: number;
  };
  gameEndedNormally: boolean;
  hasBots: boolean;
  preset: string;
  awards: {
    fightingUnitsDestroyed?: BarReplayDetailAward[];
    mostResourcesProduced?: BarReplayDetailAward[];
    mostDamageTaken?: BarReplayDetailAward[];
    econDestroyed?: BarReplayDetailAward[];
    resourceEfficiency?: BarReplayDetailAward[];
  };
  AllyTeams: {
    allyTeamId: number;
    winningTeam: boolean;
    startBox?: {
      bottom: number;
      left: number;
      top: number;
      right: number;
    };
    Players: BarReplayDetailPlayer[];
  }[];
}

// ============================================================================
// Types: Balance Changes (Patch Watch)
// ============================================================================

export interface BarBalanceChange {
  sha: string;
  date: string;
  message: string;
  author?: {
    name: string;
  };
  unitDefs?: {
    name: string;
  }[];
}

// ============================================================================
// Types: Map Geodata
// ============================================================================

export interface BarMapGeodata {
  id: number;
  scriptName: string;
  fileName: string;
  fileNameWithExt?: string;
  description?: string;
  minWind: number;
  maxWind: number;
  tidalStrength: number;
  maxMetal: number;
  extractorRadius: number;
  gravity?: number;
  mapHardness?: number;
  width?: number;
  height?: number;
  startPositions?: { x: number; z: number }[];
}

// ============================================================================
// Helper: Extract Numeric OpenSkill from "[33.65 ??]" or "[18.42]"
// ============================================================================

export function parseSkillNumber(skillStr?: string): number {
  if (!skillStr) return 0;
  const match = skillStr.match(/\[?([\d.]+)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  return isNaN(val) ? 0 : val;
}

// ============================================================================
// BAR API Client Methods
// ============================================================================

const BAR_API_BASE = "https://api.bar-rts.com";
const TEISERVER_API_BASE = "https://server4.beyondallreason.info/teiserver/api/public";

/**
 * Fetch all active live battles and lobbies worldwide.
 */
export async function fetchLiveBattles(): Promise<BarBattle[]> {
  try {
    const res = await fetch(`${BAR_API_BASE}/battles`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const battles: BarBattle[] = await res.json();

    // Enrich players with parsed numeric skill for easier math & sorting
    return battles.map((b) => ({
      ...b,
      players: (b.players || []).map((p) => ({
        ...p,
        skillNumeric: parseSkillNumber(p.skill),
      })),
    }));
  } catch (err) {
    console.error("fetchLiveBattles error:", err);
    return [];
  }
}

/**
 * Fetch official Top 100 Leaderboards across Duel, Small Team, Large Team, and FFA.
 */
export async function fetchLeaderboard(season: number = 3): Promise<BarLeaderboardCategory[]> {
  try {
    const res = await fetch(`${TEISERVER_API_BASE}/leaderboard?season=${season}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: BarLeaderboardCategory[] = await res.json();
    return data;
  } catch (err) {
    console.error("fetchLeaderboard error:", err);
    return [];
  }
}

/**
 * Fetch match replays with optional player or map filters.
 */
export async function fetchReplays(options?: {
  players?: string;
  maps?: string;
  hasBots?: boolean;
  limit?: number;
  page?: number;
}): Promise<{ totalResults: number; data: BarReplaySummary[] }> {
  try {
    const params = new URLSearchParams();
    if (options?.players) params.set("players", options.players);
    if (options?.maps) params.set("maps", options.maps);
    if (options?.hasBots !== undefined) params.set("hasBots", String(options.hasBots));
    params.set("limit", String(options?.limit ?? 15));
    if (options?.page) params.set("page", String(options.page));

    const res = await fetch(`${BAR_API_BASE}/replays?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      totalResults: json.totalResults || 0,
      data: json.data || [],
    };
  } catch (err) {
    console.error("fetchReplays error:", err);
    return { totalResults: 0, data: [] };
  }
}

/**
 * Fetch detailed match awards, damage, and economy stats for a single replay.
 */
export async function fetchReplayDetail(replayId: string): Promise<BarReplayDetail | null> {
  try {
    const res = await fetch(`${BAR_API_BASE}/replays/${replayId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`fetchReplayDetail(${replayId}) error:`, err);
    return null;
  }
}

/**
 * Fetch recent unit balance modifications directly from BAR game commits.
 */
export async function fetchBalanceChanges(limit: number = 20): Promise<BarBalanceChange[]> {
  try {
    const res = await fetch(`${BAR_API_BASE}/balance-changes?limit=${limit}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchBalanceChanges error:", err);
    return [];
  }
}

/**
 * Fetch geodata for all or specific BAR maps.
 */
export async function fetchBarMaps(limit: number = 50): Promise<BarMapGeodata[]> {
  try {
    const res = await fetch(`${BAR_API_BASE}/maps?limit=${limit}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchBarMaps error:", err);
    return [];
  }
}

/**
 * Look up official geodata for a specific map by file name (e.g. "supreme_isthmus_v2.1").
 */
export async function fetchBarMapDetail(fileName: string): Promise<BarMapGeodata | null> {
  try {
    const cleanName = fileName.replace(/\.sd7$/, "");
    const res = await fetch(`${BAR_API_BASE}/maps/${encodeURIComponent(cleanName)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}
