/**
 * BAR StratCom — Pro Replay Picker Tool (T08.1)
 *
 * Queries the Beyond All Reason replays API (https://api.bar-rts.com/replays) to select
 * high-level pro replays for checkpoint H2 (spectator capture, curated library, benchmarks).
 *
 * =========================================================================================
 * BAR RTS API Findings & Documented Response Shapes (inspected live 2026-10-04):
 *
 * 1. Base Endpoint: https://api.bar-rts.com/replays
 *    - Query parameters supported:
 *      * `page`: integer (1-based pagination, default 1)
 *      * `limit`: integer (results per page, up to 100/200, default 20)
 *      * `hasBots`: boolean ('false' filters out games with AI bots; 'true' includes them)
 *      * `preset`: string ('duel' for 1v1, 'team' for team games, 'ffa')
 *      * `date`: string (YYYY-MM-DD filters games played on that UTC date)
 *
 * 2. Summary List Item Shape (`GET /replays?limit=...`):
 *    {
 *      "id": string (32-hex replay id, e.g. "1dafc16ac8425af4309d77b174504795"),
 *      "startTime": string (ISO timestamp, e.g. "2026-10-04T01:42:53.000Z"),
 *      "durationMs": number (match duration in milliseconds),
 *      "Map": { "fileName": string, "scriptName": string },
 *      "AllyTeams": [
 *        {
 *          "winningTeam": boolean,
 *          "Players": [ { "name": string } ],
 *          "AIs": [ { "shortName": string } ]
 *        }
 *      ]
 *    }
 *    * Note: The summary endpoint only provides player names, not skills or factions.
 *
 * 3. Detail Item Shape (`GET /replays/<id>`):
 *    {
 *      "id": string,
 *      "fileName": string (e.g. "2026-10-04_01-42-53-763_Ancient Bastion Remake 0.5_2026.07.04.sdfz"),
 *      "engineVersion": string (e.g. "2026.07.04"),
 *      "gameVersion": string (e.g. "Beyond All Reason test-31479-433a460"),
 *      "startTime": string,
 *      "durationMs": number,
 *      "gameEndedNormally": boolean,
 *      "hasBots": boolean,
 *      "preset": string ("duel" | "team" | ...),
 *      "Map": { "fileName": string, "scriptName": string },
 *      "AllyTeams": [
 *        {
 *          "winningTeam": boolean,
 *          "Players": [
 *            {
 *              "id": number,
 *              "name": string,
 *              "faction": string ("Armada" | "Cortex" | "Legion"),
 *              "skill": string (e.g. "[33.65]" or "[14.99]"),
 *              "rank": number
 *            }
 *          ],
 *          "AIs": [ ... ]
 *        }
 *      ]
 *    }
 *
 * 4. URLs:
 *    - Replay Web Page: https://bar-rts.com/replays/<id>
 *    - Direct Demo Download: https://storage.uk.cloud.ovh.net/v1/AUTH_10286efc0d334efd917d476d7183232e/BAR/demos/<fileName>
 * =========================================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { generateReportMarkdown } from './lib/replay-picker-report';
import {
  type PickMixResult,
  type ProcessedReplay,
  type RawReplayDetail,
  filterReplayCandidate,
  processReplayDetail
} from './lib/replay-picker-types';

export {
  classifyMode,
  filterReplayCandidate,
  formatDuration,
  getDirectDownloadUrl,
  parseSkill,
  processReplayDetail
} from './lib/replay-picker-types';
export { generateReportMarkdown } from './lib/replay-picker-report';
export type {
  FilterOptions,
  PickMixResult,
  ProcessedPlayer,
  ProcessedReplay,
  RawAllyTeam,
  RawPlayer,
  RawReplayDetail
} from './lib/replay-picker-types';

/** Picks target mix: 12x 1v1 (>=5 Armada, >=5 Cortex, >=4 maps), 8x small team, 4x large team. */
export function pickTargetMix(candidates: ProcessedReplay[]): PickMixResult {
  const sorted = [...candidates].sort((a, b) => b.meanSkill - a.meanSkill);
  const notes: string[] = [];

  // 1. 1v1 Duels (12 total, >=5 Armada, >=5 Cortex, >=4 unique maps)
  // Exclude Legion-only mirrors for 1v1 per D-12
  const duels = sorted.filter((c) => c.mode === '1v1' && (c.hasArmada || c.hasCortex));
  const pickedDuels: ProcessedReplay[] = [];

  for (const d of duels) {
    if (pickedDuels.length >= 12) break;
    if (pickedDuels.some((p) => p.id === d.id)) continue;
    pickedDuels.push(d);
  }

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    const item = arr[i];
    if (item !== undefined && predicate(item)) return i;
  }
  return -1;
}

  // Quota enforcement: Armada >= 5
  let armadaCount = pickedDuels.filter((d) => d.hasArmada).length;
  if (armadaCount < 5) {
    for (const d of duels) {
      if (armadaCount >= 5) break;
      if (!pickedDuels.some((p) => p.id === d.id) && d.hasArmada) {
        const swapIdx = findLastIndex(pickedDuels, (p) => !p.hasArmada);
        if (swapIdx !== -1) {
          pickedDuels[swapIdx] = d;
          armadaCount++;
        }
      }
    }
  }

  // Quota enforcement: Cortex >= 5
  let cortexCount = pickedDuels.filter((d) => d.hasCortex).length;
  if (cortexCount < 5) {
    for (const d of duels) {
      if (cortexCount >= 5) break;
      if (!pickedDuels.some((p) => p.id === d.id) && d.hasCortex) {
        const swapIdx = findLastIndex(pickedDuels, (p) => !p.hasCortex);
        if (swapIdx !== -1) {
          pickedDuels[swapIdx] = d;
          cortexCount++;
        }
      }
    }
  }

  // Quota enforcement: distinct maps >= 4
  const uniqueDuelMaps = new Set(pickedDuels.map((d) => d.mapFileName || d.mapName));
  if (uniqueDuelMaps.size < 4) {
    for (const d of duels) {
      if (uniqueDuelMaps.size >= 4) break;
      const key = d.mapFileName || d.mapName;
      if (!pickedDuels.some((p) => p.id === d.id) && !uniqueDuelMaps.has(key)) {
        pickedDuels[pickedDuels.length - 1] = d;
        uniqueDuelMaps.add(key);
      }
    }
  }

  pickedDuels.sort((a, b) => b.meanSkill - a.meanSkill);

  // 2. Small Teams (8 total)
  const small = sorted.filter((c) => c.mode === 'small-team');
  const pickedSmall: ProcessedReplay[] = [];
  for (const s of small) {
    if (pickedSmall.length >= 8) break;
    if (pickedSmall.some((p) => p.id === s.id)) continue;
    pickedSmall.push(s);
  }
  pickedSmall.sort((a, b) => b.meanSkill - a.meanSkill);

  // 3. Large Teams (4 total)
  const large = sorted.filter((c) => c.mode === 'large-team');
  const pickedLarge: ProcessedReplay[] = [];
  for (const l of large) {
    if (pickedLarge.length >= 4) break;
    if (pickedLarge.some((p) => p.id === l.id)) continue;
    pickedLarge.push(l);
  }
  pickedLarge.sort((a, b) => b.meanSkill - a.meanSkill);

  if (pickedDuels.length < 12) {
    notes.push(`Only found ${pickedDuels.length}/12 eligible 1v1 duels.`);
  }
  if (pickedSmall.length < 8) {
    notes.push(`Only found ${pickedSmall.length}/8 eligible small team games.`);
  }
  if (pickedLarge.length < 4) {
    notes.push(`Only found ${pickedLarge.length}/4 eligible large team games.`);
  }

  return {
    picked: [...pickedDuels, ...pickedSmall, ...pickedLarge],
    duels: pickedDuels,
    smallTeams: pickedSmall,
    largeTeams: pickedLarge,
    notes
  };
}

/** Fetches candidate replays from the live API. */
export async function fetchLiveCandidates(options: {
  fetchFn?: typeof fetch;
  duelPages?: number;
  teamPages?: number;
} = {}): Promise<ProcessedReplay[]> {
  const f = options.fetchFn || fetch;
  const duelPages = options.duelPages ?? 4;
  const teamPages = options.teamPages ?? 4;

  const summaries: Array<{ id: string; startTime: string; durationMs: number }> = [];

  for (let p = 1; p <= duelPages; p++) {
    const res = await f(`https://api.bar-rts.com/replays?preset=duel&hasBots=false&limit=100&page=${p}`);
    if (res.ok) {
      const json = (await res.json()) as { data?: typeof summaries };
      if (json.data) summaries.push(...json.data);
    }
  }

  for (let p = 1; p <= teamPages; p++) {
    const res = await f(`https://api.bar-rts.com/replays?preset=team&hasBots=false&limit=100&page=${p}`);
    if (res.ok) {
      const json = (await res.json()) as { data?: typeof summaries };
      if (json.data) summaries.push(...json.data);
    }
  }

  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const filteredSummaries = summaries.filter((s) => {
    if (s.durationMs < 480000) return false;
    const t = new Date(s.startTime).getTime();
    return !Number.isNaN(t) && t >= sixtyDaysAgo;
  });

  const details: RawReplayDetail[] = [];
  const batchSize = 20;

  for (let i = 0; i < filteredSummaries.length; i += batchSize) {
    const batch = filteredSummaries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (s) => {
        try {
          const res = await f(`https://api.bar-rts.com/replays/${s.id}`);
          if (!res.ok) return null;
          return (await res.json()) as RawReplayDetail;
        } catch {
          return null;
        }
      })
    );
    for (const d of results) {
      if (d) details.push(d);
    }
  }

  const validDetails = details.filter((d) => filterReplayCandidate(d));
  return validDetails.map((d) => processReplayDetail(d));
}

/** CLI entry point. */
export async function main(): Promise<void> {
  console.log('Fetching live candidate replays from https://api.bar-rts.com/replays...');
  const candidates = await fetchLiveCandidates();
  console.log(`Fetched and validated ${candidates.length} candidate replays.`);

  const result = pickTargetMix(candidates);
  console.log(`Selected mix: 12 duels, 8 small teams, 4 large teams (total: ${result.picked.length}).`);

  const md = generateReportMarkdown(result);
  const outPath = path.resolve(process.cwd(), 'docs/plan/reports/h2-replay-list.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, 'utf8');

  console.log(`Report written to ${path.relative(process.cwd(), outPath)}.`);
}

// Run main if called directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((err) => {
    console.error('Error running pick-replays:', err);
    process.exit(1);
  });
}
