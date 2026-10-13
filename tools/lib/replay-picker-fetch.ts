import fs from 'node:fs';
import path from 'node:path';
import {
  type ProcessedReplay,
  type RawReplayDetail,
  filterReplayCandidate,
  MIN_DURATION_MS,
  processReplayDetail
} from './replay-picker-types';

const API = 'https://api.bar-rts.com/replays';
const DAY_MS = 86_400_000;

export interface FetchOptions {
  fetchFn?: typeof fetch;
  /** Responses are cached here so reruns do not hit the API again (git-ignored `scratch/`). */
  cacheDir?: string;
  now?: Date;
  windowDays?: number;
  everyNthDay?: number;
  duelsPerDay?: number;
  teamGamesPerDay?: number;
  concurrency?: number;
  versionFamily?: string;
  log?: (line: string) => void;
}

interface Summary {
  id: string;
}

/** Every `everyNth` day of the last `windowDays` days, newest first, as YYYY-MM-DD (UTC; today excluded). */
export function sampleDays(now: Date, windowDays = 60, everyNth = 3): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days: string[] = [];
  for (let back = 1; back <= windowDays; back += everyNth) {
    days.push(new Date(today - back * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}

/** List query for one day. Server-side filters: no bots, ended normally, at least 11 minutes. */
export function listUrl(preset: 'duel' | 'team', day: string, limit: number): string {
  const next = new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  const minMins = MIN_DURATION_MS / 60_000;
  return (
    `${API}?preset=${preset}&hasBots=false&endedNormally=true` +
    `&durationRangeMins=${minMins}&durationRangeMins=180&date=${day}&date=${next}&limit=${limit}`
  );
}

async function cachedJson<T>(url: string, key: string, opts: Required<Pick<FetchOptions, 'fetchFn'>> & FetchOptions): Promise<T | null> {
  const file = opts.cacheDir ? path.join(opts.cacheDir, `${key}.json`) : null;
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  try {
    const res = await opts.fetchFn(url);
    if (!res.ok) return null;
    const json = (await res.json()) as T;
    if (file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(json));
    }
    return json;
  } catch {
    return null;
  }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Fetches candidate replays spread over the window. Days whose first replay is not on the current
 * game version family are skipped without fetching their other details.
 */
export async function fetchLiveCandidates(options: FetchOptions = {}): Promise<ProcessedReplay[]> {
  const opts = { ...options, fetchFn: options.fetchFn ?? fetch };
  const versionFamily = options.versionFamily ?? 'test-31';
  const log = options.log ?? (() => {});
  const now = options.now ?? new Date();
  const days = sampleDays(now, options.windowDays ?? 60, options.everyNthDay ?? 3);
  // one clock for the sampled days and the age cutoff (the cutoff used the real time: T11.4 fix)
  const filter = { versionFamily, maxAgeDays: options.windowDays ?? 60, now };
  const candidates: ProcessedReplay[] = [];

  for (const day of days) {
    const lists = await Promise.all([
      cachedJson<{ data?: Summary[] }>(listUrl('duel', day, options.duelsPerDay ?? 40), `list-duel-${day}`, opts),
      cachedJson<{ data?: Summary[] }>(listUrl('team', day, options.teamGamesPerDay ?? 100), `list-team-${day}`, opts)
    ]);
    const ids = lists.flatMap((l) => l?.data ?? []).map((s) => s.id);
    const first = ids[0] ? await cachedJson<RawReplayDetail>(`${API}/${ids[0]}`, `detail-${ids[0]}`, opts) : null;
    if (!first?.gameVersion?.includes(versionFamily)) {
      log(`${day}: skipped (${first?.gameVersion ?? 'no replays'})`);
      continue;
    }
    const details = await pool(ids, options.concurrency ?? 5, (id) =>
      cachedJson<RawReplayDetail>(`${API}/${id}`, `detail-${id}`, opts)
    );
    const valid = details.filter((d): d is RawReplayDetail => d !== null && filterReplayCandidate(d, filter));
    candidates.push(...valid.map(processReplayDetail));
    log(`${day}: ${valid.length}/${ids.length} usable (${first.gameVersion})`);
  }
  return candidates;
}
