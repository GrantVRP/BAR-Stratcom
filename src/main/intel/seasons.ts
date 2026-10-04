import { IntelLeaderboardSchema } from '../../core/schemas/intel';
import { LEADERBOARD_SEASON_UPPER_BOUND, REQUEST_TIMEOUT_MS, TEISERVER_API } from './constants';

export const IntelLeaderboardCategoriesSchema = IntelLeaderboardSchema.shape.categories;

/**
 * Finds the newest leaderboard season: walks down from the upper bound and returns the first season
 * that answers with categories. Teiserver answers 400 "Invalid season parameter" for future seasons.
 * Network failures throw (so the caller can fall back to the cached season) instead of walking on.
 */
export async function discoverSeason(
  fetchFn: typeof fetch,
  upperBound = LEADERBOARD_SEASON_UPPER_BOUND
): Promise<number> {
  for (let season = upperBound; season >= 1; season--) {
    const url = `${TEISERVER_API}/leaderboard?season=${season}`;
    const res = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (res.status === 400 || res.status === 404) continue;
    if (!res.ok) throw new Error(`Leaderboard season ${season}: HTTP ${res.status}`);
    const parsed = IntelLeaderboardCategoriesSchema.safeParse(await res.json());
    if (parsed.success && parsed.data.length > 0) return season;
  }
  throw new Error('No leaderboard season answered');
}
