export const BAR_API = 'https://api.bar-rts.com';
export const TEISERVER_API = 'https://server4.beyondallreason.info/teiserver/api/public';

/** Per-request timeout (T10.1). */
export const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Leaderboard season discovery starts here and walks down until a season answers. Keep this one
 * ahead of the current season (season 3 on 2026-10-04; seasons 4+ answer 400 "Invalid season").
 */
export const LEADERBOARD_SEASON_UPPER_BOUND = 4;

export const TTL_MS = {
  battles: 20_000,
  leaderboard: 60 * 60_000,
  season: 24 * 60 * 60_000,
  replays: 5 * 60_000,
  balance: 60 * 60_000
} as const;
