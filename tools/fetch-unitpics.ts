/**
 * Downloads the Armada and Cortex unit pictures from beyondallreason.info.
 *
 * The unit icons are by IceXuick and Floris (CC BY-NC-ND, /unitpics/ in the BAR repo), used with their
 * permission for 32-bit pixel versions in BAR StratCom.
 * Raw downloads go to data/raw/unitpics/ (git-ignored) and are never shipped; only the converted
 * sprites made by tools/pixelate-unitpics.ts are.
 *
 * Site structure (inspected 2026-10-04): /units/<faction>-<category> lists units as
 * <a href="/unit/<unitId>"><img src="https://cdn.prod.website-files.com/…/<hash>_<unitId>.webp"></a>.
 *
 * Usage: npx tsx tools/fetch-unitpics.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://www.beyondallreason.info';
export const CATEGORIES = [
  'bots',
  'vehicles',
  'aircraft',
  'ships',
  'hovercraft',
  'factories',
  'defense-buildings',
  'buildings'
] as const;
export const FACTIONS = ['armada', 'cortex'] as const;

export interface UnitPicEntry {
  unitId: string;
  faction: (typeof FACTIONS)[number];
  category: (typeof CATEGORIES)[number];
  url: string;
}

/** Unit id → picture URL pairs from one category page (the large unit image right after each unit link). */
export function parseCategoryPage(html: string): Array<{ unitId: string; url: string }> {
  const found = new Map<string, string>();
  const pattern = /href="\/unit\/([a-z0-9_]+)"[^>]*>\s*<img[^>]*src="(https:\/\/[^"]+_\1\.(?:webp|png|jpg))"/g;
  for (const m of html.matchAll(pattern)) {
    if (!found.has(m[1]!)) found.set(m[1]!, m[2]!);
  }
  return [...found].map(([unitId, url]) => ({ unitId, url }));
}

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': 'BAR-StratCom-asset-tool' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

export async function main(outDir = path.resolve(process.cwd(), 'data/raw/unitpics')): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const entries: UnitPicEntry[] = [];
  for (const faction of FACTIONS) {
    for (const category of CATEGORIES) {
      const html = await (await get(`${SITE}/units/${faction}-${category}`)).text();
      const units = parseCategoryPage(html);
      console.log(`${faction}-${category}: ${units.length} units`);
      for (const u of units) entries.push({ ...u, faction, category });
    }
  }

  let downloaded = 0;
  for (const e of entries) {
    const file = path.join(outDir, `${e.unitId}${path.extname(new URL(e.url).pathname)}`);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file, Buffer.from(await (await get(e.url)).arrayBuffer()));
    downloaded += 1;
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`${entries.length} unit pictures listed, ${downloaded} downloaded to ${outDir}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
