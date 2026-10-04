import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IntelBalancePageSchema,
  IntelBattlesSchema,
  IntelReplayDetailSchema,
  IntelReplayPageSchema
} from '../../core/schemas/intel';
import battles from './__fixtures__/battles.json';
import balance from './__fixtures__/balance-changes.json';
import season3 from './__fixtures__/leaderboard-season-3.json';
import season4 from './__fixtures__/leaderboard-season-4.json';
import replayDetail from './__fixtures__/replay-detail.json';
import replays from './__fixtures__/replays.json';
import { IntelCache } from './cache';
import { replaysUrl } from './client';
import { TTL_MS } from './constants';
import { discoverSeason } from './seasons';
import { IntelService } from './service';

type Route = { status: number; body: unknown } | Error;

function fakeFetch(routes: Record<string, Route>): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.includes(k));
    const route = key ? routes[key] : { status: 404, body: { message: 'not found' } };
    if (route instanceof Error) throw route;
    return new Response(JSON.stringify(route!.body), { status: route!.status });
  }) as unknown as typeof fetch;
}

const LIVE: Record<string, Route> = {
  '/battles': { status: 200, body: battles },
  'leaderboard?season=4': { status: 400, body: season4 },
  'leaderboard?season=3': { status: 200, body: season3 },
  '/replays?': { status: 200, body: replays },
  '/replays/': { status: 200, body: replayDetail },
  '/balance-changes': { status: 200, body: balance }
};

describe('intel schemas on recorded responses (T10.1)', () => {
  it('parses battles and drops fields the app does not use', () => {
    const parsed = IntelBattlesSchema.parse(battles);
    expect(parsed.length).toBe(2);
    expect(parsed[0]!.players.length).toBeGreaterThan(0);
    expect(parsed[0]).not.toHaveProperty('mapHash');
    expect(parsed[0]!.founder).not.toHaveProperty('userId');
  });

  it('parses replays, a replay detail and the nested balance-change tree', () => {
    expect(IntelReplayPageSchema.parse(replays).data).toHaveLength(2);
    const detail = IntelReplayDetailSchema.parse(replayDetail);
    expect(detail.AllyTeams.flatMap((t) => t.Players).every((p) => typeof p.name === 'string')).toBe(true);
    expect(detail).not.toHaveProperty('hostSettings');
    const page = IntelBalancePageSchema.parse(balance);
    expect(page.data[0]!.changes[0]!.unit.propertyId).toMatch(/^[a-z0-9_]+$/);
    expect(page.data[0]!.changes[0]!.unit.changes?.length).toBeGreaterThan(0);
  });
});

describe('IntelCache (T10.1)', () => {
  let dir: string | null = null;
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it('serves fresh entries, refreshes expired ones, and falls back to stale data offline', async () => {
    let now = 1_000_000;
    const cache = new IntelCache({ dir: null, now: () => now });
    const load = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2').mockRejectedValueOnce(new Error('offline'));

    expect(await cache.get('k', 1000, load)).toEqual({ data: 'v1', fetchedAt: new Date(1_000_000).toISOString(), stale: false });
    now += 500;
    expect((await cache.get('k', 1000, load)).data).toBe('v1');
    expect(load).toHaveBeenCalledTimes(1);

    now += 1000;
    expect((await cache.get('k', 1000, load)).data).toBe('v2');
    now += 5000;
    const offline = await cache.get('k', 1000, load);
    expect(offline).toEqual({ data: 'v2', fetchedAt: new Date(1_001_500).toISOString(), stale: true });
  });

  it('throws when offline with nothing cached, and shares one request between concurrent callers', async () => {
    const cache = new IntelCache({ dir: null });
    await expect(cache.get('x', 1000, () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');

    const load = vi.fn(() => new Promise((r) => setTimeout(() => r('once'), 5)));
    const [a, b] = await Promise.all([cache.get('y', 1000, load), cache.get('y', 1000, load)]);
    expect([a.data, b.data]).toEqual(['once', 'once']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('persists entries to disk for the next app start', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'intel-cache-'));
    await new IntelCache({ dir }).get('battles', 1000, () => Promise.resolve([1, 2]));
    const reopened = new IntelCache({ dir });
    const res = await reopened.get('battles', 60_000, () => Promise.reject(new Error('should not load')));
    expect(res.data).toEqual([1, 2]);
    expect(fs.readdirSync(dir)).toEqual(['intel-battles.json']);
  });
});

describe('leaderboard season discovery (T10.1)', () => {
  it('walks down from the upper bound past "Invalid season" answers', async () => {
    expect(await discoverSeason(fakeFetch(LIVE), 4)).toBe(3);
  });

  it('throws on network errors instead of guessing a season', async () => {
    await expect(discoverSeason(fakeFetch({ leaderboard: new TypeError('fetch failed') }), 4)).rejects.toThrow(
      'fetch failed'
    );
    await expect(discoverSeason(fakeFetch({ leaderboard: { status: 400, body: season4 } }), 2)).rejects.toThrow(
      'No leaderboard season answered'
    );
  });
});

describe('IntelService (T10.1)', () => {
  it('loads every intel feed from the recorded responses', async () => {
    const service = new IntelService(new IntelCache({ dir: null }), fakeFetch(LIVE));
    expect((await service.battles()).data).toHaveLength(2);
    const lb = await service.leaderboard();
    expect(lb.data.season).toBe(3);
    expect(lb.data.categories.map((c) => c.name)).toContain('Duel');
    expect((await service.replays({ preset: 'duel' })).data.data).toHaveLength(2);
    expect((await service.replay(replayDetail.id)).data.id).toBe(replayDetail.id);
    expect((await service.balanceChanges(1)).data.data).toHaveLength(1);
  });

  it('discovers the season once a day, not on every leaderboard load', async () => {
    let now = 0;
    const fetchFn = fakeFetch(LIVE);
    const service = new IntelService(new IntelCache({ dir: null, now: () => now }), fetchFn);
    await service.leaderboard();
    now += TTL_MS.leaderboard + 1;
    await service.leaderboard();
    const seasonProbes = vi.mocked(fetchFn).mock.calls.filter(([u]) => String(u).includes('season=4'));
    expect(seasonProbes).toHaveLength(1);
  });

  it('builds replay searches by map script name and player', () => {
    const url = replaysUrl(
      { page: 2, preset: 'duel', map: 'Isidis crack 1.1', player: 'Some Player' },
      new Date('2026-10-04T03:00:00Z')
    );
    expect(url).toContain('date=2026-09-04&date=2026-10-05');
    expect(replaysUrl({ preset: 'duel' })).not.toContain('date=');
    expect(url).toContain('page=2');
    expect(url).toContain('preset=duel');
    expect(url).toContain('maps=Isidis+crack+1.1');
    expect(url).toContain('players=Some+Player');
    expect(url).toContain('hasBots=false');
  });
});
