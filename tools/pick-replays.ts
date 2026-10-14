/**
 * BAR StratCom — Pro Replay Picker Tool
 *
 * Queries the Beyond All Reason replays API (https://api.bar-rts.com/replays) to select
 * high-level pro replays for spectator capture, the curated library and benchmarks.
 *
 * Usage: npx tsx tools/pick-replays.ts
 * Writes docs/plan/reports/h2-replay-list.md and.json. API responses are cached in
 * scratch/replay-cache/ (git-ignored); delete that folder to fetch fresh data.
 *
 * =========================================================================================
 * BAR RTS API findings (inspected live 2026-10-04):
 *
 * 1. List: GET https://api.bar-rts.com/replays
 *    - `page` (1-based), `limit` (results per page, up to 100), `preset` ('duel' | 'team' | 'ffa'),
 *      `hasBots` ('false' excludes games with AI), `endedNormally` ('true').
 *    - `date=<from>&date=<to>`: two YYYY-MM-DD values; returns games of <from> (a single `date`
 *      value, or from == to, returns nothing).
 *    - `durationRangeMins=<min>&durationRangeMins=<max>`: game length in minutes.
 *    - `tsRange=<min>&tsRange=<max>` (skill) exists but times out (HTTP 504 after 60 s), so the
 *      tool ranks by skill itself from the detail endpoint.
 *    - Results are newest first. Each item: { id, startTime, durationMs, Map: { fileName,
 *      scriptName }, AllyTeams: [{ winningTeam, Players: [{ name }], AIs: [{ shortName }] }] }.
 *      The list has no skills or factions.
 *    - `/leaderboards` currently returns `{}`.
 *
 * 2. Detail: GET https://api.bar-rts.com/replays/<id>
 *    { id, fileName, engineVersion, gameVersion ("Beyond All Reason test-31479-433a460"), startTime,
 *      durationMs, gameEndedNormally, hasBots, preset, Map, AllyTeams: [{ winningTeam,
 *      Players: [{ id, name, faction ("Armada" | "Cortex" | "Legion"), skill ("[33.65]"), rank }],
 *      AIs }] }
 *    Game versions seen per day: 2026-08-06 test-30891, 08-20 test-31001, 09-03 test-31197,
 *    09-17 test-31320, 10-01 test-31479.
 *
 * 3. URLs: replay page https://bar-rts.com/replays/<id>; demo download
 *    https://storage.uk.cloud.ovh.net/v1/AUTH_10286efc0d334efd917d476d7183232e/BAR/demos/<fileName>
 * =========================================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLiveCandidates } from './lib/replay-picker-fetch';
import { generateReportJson, generateReportMarkdown } from './lib/replay-picker-report';
import { pickTargetMix } from './lib/replay-picker-select';

export {
  classifyMode,
  filterReplayCandidate,
  formatDuration,
  getDirectDownloadUrl,
  MIN_DURATION_MS,
  parseSkill,
  processReplayDetail
} from './lib/replay-picker-types';
export { fetchLiveCandidates, listUrl, sampleDays } from './lib/replay-picker-fetch';
export { DEFAULT_CAPS, mapPlayerKey, pickTargetMix } from './lib/replay-picker-select';
export { generateReportJson, generateReportMarkdown } from './lib/replay-picker-report';
export type {
  FilterOptions,
  PickMixResult,
  ProcessedPlayer,
  ProcessedReplay,
  RawAllyTeam,
  RawPlayer,
  RawReplayDetail
} from './lib/replay-picker-types';

/** CLI entry point. */
export async function main(): Promise<void> {
  console.log('Fetching candidate replays from https://api.bar-rts.com/replays ...');
  const candidates = await fetchLiveCandidates({
    cacheDir: path.resolve(process.cwd(), 'scratch/replay-cache'),
    log: (line) => console.log(`  ${line}`)
  });
  console.log(`${candidates.length} candidate replays.`);

  const result = pickTargetMix(candidates);
  const generatedAt = new Date().toISOString();
  const outDir = path.resolve(process.cwd(), 'docs/plan/reports');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'h2-replay-list.md'), generateReportMarkdown(result, generatedAt), 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'h2-replay-list.json'),
    `${JSON.stringify(generateReportJson(result, generatedAt), null, 2)}\n`,
    'utf8'
  );
  console.log(`Picked ${result.picked.length}/24. ${result.notes.join(' ')}`);
  console.log('Wrote docs/plan/reports/h2-replay-list.md and h2-replay-list.json.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('Error running pick-replays:', err);
    process.exit(1);
  });
}
