import type {
  Cached,
  IntelBalancePage,
  IntelBattle,
  IntelLeaderboard,
  IntelReplayDetail,
  IntelReplayPage,
  IntelReplaysRequest
} from '../../core/schemas/intel';
import { IntelCache } from './cache';
import {
  fetchBalanceChanges,
  fetchBattles,
  fetchLeaderboard,
  fetchReplay,
  fetchReplays,
  replaysUrl,
  type FetchFn
} from './client';
import { TTL_MS } from './constants';
import { discoverSeason } from './seasons';

/** BAR public data for the Intel views, fetched by main (the renderer has no network access). */
export class IntelService {
  constructor(
    private readonly cache: IntelCache,
    private readonly fetchFn: FetchFn = globalThis.fetch
  ) {}

  battles(): Promise<Cached<IntelBattle[]>> {
    return this.cache.get('battles', TTL_MS.battles, () => fetchBattles(this.fetchFn));
  }

  async leaderboard(): Promise<Cached<IntelLeaderboard>> {
    const season = await this.cache.get('leaderboard-season', TTL_MS.season, () => discoverSeason(this.fetchFn));
    return this.cache.get(`leaderboard-${season.data}`, TTL_MS.leaderboard, () =>
      fetchLeaderboard(this.fetchFn, season.data)
    );
  }

  replays(req: IntelReplaysRequest): Promise<Cached<IntelReplayPage>> {
    return this.cache.get(`replays-${replaysUrl(req)}`, TTL_MS.replays, () => fetchReplays(this.fetchFn, req));
  }

  replay(id: string): Promise<Cached<IntelReplayDetail>> {
    return this.cache.get(`replay-${id}`, TTL_MS.replays, () => fetchReplay(this.fetchFn, id));
  }

  balanceChanges(page: number): Promise<Cached<IntelBalancePage>> {
    return this.cache.get(`balance-${page}`, TTL_MS.balance, () => fetchBalanceChanges(this.fetchFn, page));
  }
}
