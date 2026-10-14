import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLiveCandidates, listUrl, sampleDays } from './replay-picker-fetch';
import type { RawReplayDetail } from './replay-picker-types';

const NOW = new Date('2026-10-04T03:00:00Z');

function detail(id: string, day: string, gameVersion: string): RawReplayDetail {
  return {
    id,
    fileName: `${day}_${id}.sdfz`,
    engineVersion: '2026.07.04',
    gameVersion,
    startTime: `${day}T20:00:00.000Z`,
    durationMs: 15 * 60 * 1000,
    gameEndedNormally: true,
    hasBots: false,
    preset: 'duel',
    Map: { fileName: 'isidis_crack_1.1', scriptName: 'Isidis crack 1.1' },
    AllyTeams: [
      { Players: [{ name: `${id}-a`, faction: 'Armada', skill: '[40.1]' }], AIs: [] },
      { Players: [{ name: `${id}-b`, faction: 'Cortex', skill: '[39.9]' }], AIs: [] }
    ]
  };
}

function fakeApi(byDay: Record<string, { version: string; ids: string[] }>): typeof fetch {
  const details = new Map<string, RawReplayDetail>();
  for (const [day, { version, ids }] of Object.entries(byDay)) for (const id of ids) details.set(id, detail(id, day, version));
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const day = url.match(/date=(\d{4}-\d{2}-\d{2})/)?.[1];
    const id = url.match(/\/replays\/([a-z0-9-]+)$/)?.[1];
    const body = id
      ? details.get(id)
      : { data: url.includes('preset=duel') && day ? (byDay[day]?.ids ?? []).map((i) => ({ id: i })) : [] };
    return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404 });
  }) as unknown as typeof fetch;
}

describe('replay picker fetching', () => {
  let cacheDir: string | null = null;
  afterEach(() => {
    if (cacheDir) fs.rmSync(cacheDir, { recursive: true, force: true });
    cacheDir = null;
  });

  it('samples every 3rd day of the window, newest first, excluding today', () => {
    const days = sampleDays(NOW, 60, 3);
    expect(days[0]).toBe('2026-10-03');
    expect(days[1]).toBe('2026-09-30');
    expect(days).toHaveLength(20);
    expect(days.at(-1)).toBe('2026-08-07');
  });

  it('builds a one-day list query with the server-side filters', () => {
    const url = listUrl('duel', '2026-09-30', 40);
    expect(url).toContain('date=2026-09-30&date=2026-10-01');
    expect(url).toContain('durationRangeMins=11&durationRangeMins=180');
    expect(url).toContain('hasBots=false&endedNormally=true');
    expect(url).toContain('limit=40');
  });

  it('skips days on an older version family and caches every response', async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-cache-'));
    const fetchFn = fakeApi({
      '2026-10-03': { version: 'Beyond All Reason test-31479-433a460', ids: ['n1', 'n2'] },
      '2026-09-30': { version: 'Beyond All Reason test-30891-c6b9114', ids: ['o1', 'o2'] }
    });
    const options = { fetchFn, cacheDir, now: NOW, windowDays: 4, everyNthDay: 3 };

    const first = await fetchLiveCandidates(options);
    expect(first.map((r) => r.id).sort()).toEqual(['n1', 'n2']);
    const calls = vi.mocked(fetchFn).mock.calls.map(([u]) => String(u));
    expect(calls.some((u) => u.endsWith('/replays/o2'))).toBe(false);

    vi.mocked(fetchFn).mockClear();
    const again = await fetchLiveCandidates(options);
    expect(again.map((r) => r.id).sort()).toEqual(['n1', 'n2']);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
