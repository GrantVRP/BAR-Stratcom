import fs from 'node:fs';
import path from 'node:path';
import { type MapRecord, type MapsFile, MapsFileSchema } from '../src/core/schemas';

interface RawMap {
  id: number;
  fileName?: string | null;
  scriptName?: string | null;
  name?: string | null;
  author?: string | null;
  width?: number | null;
  height?: number | null;
  minWind?: number | null;
  maxWind?: number | null;
  tidalStrength?: number | null;
  maxMetal?: number | null;
  extractorRadius?: number | null;
  gravity?: number | null;
  startPositions?: Array<{ x: number; z: number }> | null;
  minDepth?: number | null;
  voidWater?: boolean | null;
  updatedAt?: string | null;
}

interface RawMapsResponse {
  totalResults: number;
  page: number;
  limit: number;
  data: RawMap[];
}

interface RawReplay {
  id: string;
  Map?: {
    fileName?: string;
    scriptName?: string;
  };
}

interface RawReplaysResponse {
  totalResults: number;
  page: number;
  limit: number;
  data: RawReplay[];
}

async function fetchAllMaps(): Promise<Map<string, MapRecord>> {
  const limit = 200;
  let page = 1;
  let totalApiResults = Infinity;
  let fetchedCount = 0;
  const maps = new Map<string, MapRecord>();

  console.log('Fetching maps from https://api.bar-rts.com/maps...');
  while (fetchedCount < totalApiResults) {
    const url = `https://api.bar-rts.com/maps?page=${page}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch maps page ${page}: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as RawMapsResponse;
    totalApiResults = json.totalResults;

    if (!json.data || json.data.length === 0) {
      break;
    }

    fetchedCount += json.data.length;

    for (const raw of json.data) {
      // Skip empty/placeholder records without map file names
      if (!raw.fileName || typeof raw.fileName !== 'string' || raw.fileName.trim().length === 0) {
        continue;
      }

      const fileName = raw.fileName.trim();
      const record: MapRecord = {
        fileName,
        scriptName: raw.scriptName?.trim() || fileName,
        name: raw.name?.trim() || raw.scriptName?.trim() || fileName,
        author: raw.author?.trim() || null,
        sizeX: Number(raw.width ?? 0),
        sizeZ: Number(raw.height ?? 0),
        wind: {
          min: Number(raw.minWind ?? 0),
          max: Number(raw.maxWind ?? 0)
        },
        tidalStrength: Number(raw.tidalStrength ?? 0),
        maxMetal: Number(raw.maxMetal ?? 0),
        extractorRadius: Number(raw.extractorRadius ?? 0),
        gravity: Number(raw.gravity ?? 0),
        startPositions: Array.isArray(raw.startPositions)
          ? raw.startPositions
              .map((p) => {
                const anyP = p as Record<string, unknown> | null;
                const x = Number(anyP?.x ?? anyP?.X);
                const z = Number(anyP?.z ?? anyP?.Z);
                return { x, z };
              })
              .filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.z))
          : [],
        hasWater: Boolean((raw.minDepth ?? 0) < 0 && !raw.voidWater),
        popularity: null,
        mexYield: null
      };

      // Keep latest if duplicate fileName exists
      maps.set(fileName, record);
    }

    console.log(`  Fetched page ${page} (${maps.size} valid maps / ${totalApiResults} total API records)`);
    if (json.data.length < limit || fetchedCount >= totalApiResults) {
      break;
    }
    page++;
  }

  return maps;
}

async function fetchReplayPopularity(targetCount = 2000): Promise<Map<string, number>> {
  const limit = 200;
  let page = 1;
  let fetchedReplays = 0;
  const countsByMapFile = new Map<string, number>();

  console.log(`Fetching recent ${targetCount} replays for popularity ranking...`);
  while (fetchedReplays < targetCount) {
    const url = `https://api.bar-rts.com/replays?page=${page}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch replays page ${page}: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as RawReplaysResponse;
    if (!json.data || json.data.length === 0) {
      break;
    }

    for (const replay of json.data) {
      const file = replay.Map?.fileName?.trim();
      if (file) {
        countsByMapFile.set(file, (countsByMapFile.get(file) ?? 0) + 1);
      }
    }

    fetchedReplays += json.data.length;
    console.log(`  Fetched page ${page} (${fetchedReplays} / ${targetCount} replays)`);
    if (json.data.length < limit || fetchedReplays >= targetCount) {
      break;
    }
    page++;
  }

  return countsByMapFile;
}

async function main(): Promise<void> {
  const mapsByFile = await fetchAllMaps();
  const replayCounts = await fetchReplayPopularity(2000);

  // Rank maps by replay count descending
  const sortedByCount = Array.from(replayCounts.entries()).sort((a, b) => b[1] - a[1]);

  let currentRank = 1;
  for (const [fileName, count] of sortedByCount) {
    // Exact or lowercase match
    let map = mapsByFile.get(fileName);
    if (!map) {
      for (const [k, v] of mapsByFile.entries()) {
        if (k.toLowerCase() === fileName.toLowerCase()) {
          map = v;
          break;
        }
      }
    }

    if (map) {
      map.popularity = {
        replays30d: count,
        rank: currentRank
      };
      currentRank++;
    }
  }

  // Convert to array and sort deterministically by fileName
  const mapsList = Array.from(mapsByFile.values()).sort((a, b) => a.fileName.localeCompare(b.fileName));

  const mapsFile: MapsFile = {
    schemaVersion: 1,
    fetchedAt: new Date().toISOString(),
    source: 'api.bar-rts.com/maps',
    maps: mapsList
  };

  // Validate entire output against MapsFileSchema
  MapsFileSchema.parse(mapsFile);

  const outDir = path.resolve(process.cwd(), 'data/maps');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'maps.json');
  fs.writeFileSync(outPath, JSON.stringify(mapsFile, null, 2) + '\n', 'utf8');

  const popularCount = mapsList.filter((m) => m.popularity !== null).length;
  console.log(`Successfully wrote ${mapsList.length} maps to ${path.relative(process.cwd(), outPath)}.`);
  console.log(`Popularity assigned for ${popularCount} active maps.`);
}

main().catch((err) => {
  console.error('Error fetching maps:', err);
  process.exit(1);
});
