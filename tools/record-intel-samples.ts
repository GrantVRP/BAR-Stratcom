/**
 * Records trimmed real responses of the BAR public APIs as test fixtures for src/main/intel (T10.1).
 * Usage: npx tsx tools/record-intel-samples.ts
 * Trimming keeps the real shapes (including fields the app ignores) but only a few entries each;
 * lobby host IPs/ports are removed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(process.cwd(), 'src/main/intel/__fixtures__');
const BAR = 'https://api.bar-rts.com';
const TEI = 'https://server4.beyondallreason.info/teiserver/api/public';

type Json = Record<string, unknown>;

async function get(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  return { status: res.status, body: await res.json() };
}

function save(name: string, value: unknown): void {
  fs.writeFileSync(path.join(OUT, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  console.log(`wrote ${name}.json`);
}

/** Keeps the first `n` items of every array in a balance-change tree, depth-first. */
export function trimTree(value: unknown, n: number): unknown {
  if (Array.isArray(value)) return value.slice(0, n).map((v) => trimTree(v, n));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trimTree(v, n)]));
  }
  return value;
}

export async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });

  const battles = (await get(`${BAR}/battles`)).body as Json[];
  save(
    'battles',
    battles.slice(0, 2).map((b) => {
      const trimmed: Json = { ...b, players: (b.players as Json[]).slice(0, 3) };
      delete trimmed.ip;
      delete trimmed.port;
      return trimmed;
    })
  );

  const season = (await get(`${TEI}/leaderboard?season=3`)).body as Array<{ name: string; players: Json[] }>;
  save('leaderboard-season-3', season.map((c) => ({ ...c, players: c.players.slice(0, 3) })));
  save('leaderboard-season-4', (await get(`${TEI}/leaderboard?season=4`)).body);

  const replays = (await get(`${BAR}/replays?limit=2&page=1&hasBots=false&endedNormally=true&preset=duel`)).body as Json;
  save('replays', replays);
  const firstId = ((replays.data as Json[])[0] as { id: string }).id;
  save('replay-detail', (await get(`${BAR}/replays/${firstId}`)).body);

  const balance = (await get(`${BAR}/balance-changes?limit=1&page=1`)).body as Json;
  save('balance-changes', trimTree(balance, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
