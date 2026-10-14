import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { FetchFn } from './client';

/** STRATCOM_FAKE_INTEL=1 answers intel requests from the recorded fixtures, in non-packaged builds only (e2e tests). */
export function fakeIntelEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.STRATCOM_FAKE_INTEL !== '1') return false;
  try {
    return !app.isPackaged;
  } catch {
    return false; // outside Electron: treat as packaged
  }
}

/** URL fragment → recorded response (recorded fixtures: real API answers trimmed by tools/record-intel-samples.ts). */
const ROUTES: ReadonlyArray<{ match: string; status: number; file: string }> = [
  { match: '/battles', status: 200, file: 'battles.json' },
  { match: 'leaderboard?season=4', status: 400, file: 'leaderboard-season-4.json' },
  { match: 'leaderboard?season=3', status: 200, file: 'leaderboard-season-3.json' },
  { match: '/replays?', status: 200, file: 'replays.json' },
  { match: '/replays/', status: 200, file: 'replay-detail.json' },
  { match: '/balance-changes', status: 200, file: 'balance-changes.json' },
  { match: 'map_list.validated.json', status: 200, file: 'map-list.json' }
];

export function fixtureFetch(dir: string): FetchFn {
  return (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    const route = ROUTES.find((r) => url.includes(r.match));
    if (!route) return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    return new Response(fs.readFileSync(path.join(dir, route.file), 'utf-8'), { status: route.status });
  }) as FetchFn;
}
