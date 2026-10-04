import type { z } from 'zod';
import {
  IntelBalancePageSchema,
  IntelBattlesSchema,
  IntelReplayDetailSchema,
  IntelReplayPageSchema,
  type IntelBalancePage,
  type IntelBattle,
  type IntelLeaderboard,
  type IntelReplayDetail,
  type IntelReplayPage,
  type IntelReplaysRequest
} from '../../core/schemas/intel';
import { BAR_API, REQUEST_TIMEOUT_MS, TEISERVER_API } from './constants';
import { IntelLeaderboardCategoriesSchema } from './seasons';

export type FetchFn = typeof fetch;

export class IntelHttpError extends Error {
  constructor(
    readonly status: number,
    url: string
  ) {
    super(`HTTP ${status} from ${new URL(url).host}`);
  }
}

/** GET + zod validation with the 8 s timeout. Network, HTTP and shape errors all throw. */
export async function getJson<S extends z.ZodTypeAny>(fetchFn: FetchFn, url: string, schema: S): Promise<z.infer<S>> {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new IntelHttpError(res.status, url);
  return schema.parse(await res.json()) as z.infer<S>;
}

export function fetchBattles(fetchFn: FetchFn): Promise<IntelBattle[]> {
  return getJson(fetchFn, `${BAR_API}/battles`, IntelBattlesSchema);
}

const DAY_MS = 86_400_000;
const SEARCH_WINDOW_DAYS = 30;

/**
 * Replay search URL. Map and player searches are limited to the last 30 days: without a date range
 * the API needs 25–35 s for a map search (measured 2026-10-04), with it about 1 s.
 */
export function replaysUrl(req: IntelReplaysRequest, now: Date = new Date()): string {
  const q = new URLSearchParams({ limit: '24', page: String(req.page ?? 1), hasBots: 'false', endedNormally: 'true' });
  if (req.preset) q.set('preset', req.preset);
  if (req.map) q.set('maps', req.map);
  if (req.player) q.set('players', req.player);
  if (req.map || req.player) {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    q.append('date', new Date(today - SEARCH_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10));
    q.append('date', new Date(today + DAY_MS).toISOString().slice(0, 10));
  }
  return `${BAR_API}/replays?${q.toString()}`;
}

export function fetchReplays(fetchFn: FetchFn, req: IntelReplaysRequest): Promise<IntelReplayPage> {
  return getJson(fetchFn, replaysUrl(req), IntelReplayPageSchema);
}

export function fetchReplay(fetchFn: FetchFn, id: string): Promise<IntelReplayDetail> {
  return getJson(fetchFn, `${BAR_API}/replays/${encodeURIComponent(id)}`, IntelReplayDetailSchema);
}

export function fetchBalanceChanges(fetchFn: FetchFn, page: number): Promise<IntelBalancePage> {
  return getJson(fetchFn, `${BAR_API}/balance-changes?limit=20&page=${page}`, IntelBalancePageSchema);
}

export async function fetchLeaderboard(fetchFn: FetchFn, season: number): Promise<IntelLeaderboard> {
  const categories = await getJson(
    fetchFn,
    `${TEISERVER_API}/leaderboard?season=${season}`,
    IntelLeaderboardCategoriesSchema
  );
  return { season, categories };
}
