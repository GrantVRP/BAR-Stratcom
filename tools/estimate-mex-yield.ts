import fs from 'node:fs';
import path from 'node:path';
import { findMapByScriptName } from '../src/core/maps';
import { MapsFileSchema, type MapsFile, type MapRecord } from '../src/core/schemas/maps';
import type { SessionMeta } from '../src/core/schemas/session';
import type { StateDoc, WidgetEvent } from '../src/core/schemas/protocol';
import { readStateLines } from './lib/state-reader';

export interface EstimateOptions {
  fixturesDir: string;
  mapsPath: string;
  delayFrames?: number;
}

export interface MapEstimateResult {
  mapScriptName: string;
  fileName: string;
  mexYield: number;
  sampleCount: number;
  deltas: number[];
}

export function computeMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const T1_MEX_DEFS = new Set(['cormex', 'armmex', 'legmex']);

/**
 * Estimates metal per T1 extractor for player fixtures and updates data/maps/maps.json
 * with mexYield: { value, provenance: 'measured' }.
 */
export function estimateMexYield(opts: EstimateOptions): Map<string, MapEstimateResult> {
  const { fixturesDir, mapsPath, delayFrames = 60 } = opts;

  if (!fs.existsSync(mapsPath)) {
    throw new Error(`Maps file does not exist: ${mapsPath}`);
  }
  if (!fs.existsSync(fixturesDir)) {
    throw new Error(`Fixtures directory does not exist: ${fixturesDir}`);
  }

  const mapsFileContent = fs.readFileSync(mapsPath, 'utf-8');
  const mapsData: MapsFile = JSON.parse(mapsFileContent);

  const fixtureDirs = fs
    .readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(fixturesDir, d.name));

  // Map fileName -> array of measured deltas
  const mapDeltas = new Map<string, { map: MapRecord; deltas: number[] }>();

  for (const fDir of fixtureDirs) {
    const metaPath = path.join(fDir, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      continue;
    }

    const meta: SessionMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (meta.mode !== 'player') {
      continue;
    }

    const resolvedMap = findMapByScriptName(mapsData.maps, meta.mapScriptName);
    if (!resolvedMap) {
      throw new Error(`Fixture ${path.basename(fDir)} map "${meta.mapScriptName}" could not be resolved`);
    }

    const eventsPath = path.join(fDir, 'events.ndjson');
    if (!fs.existsSync(eventsPath)) {
      continue;
    }

    const eventsText = fs.readFileSync(eventsPath, 'utf-8');
    const mexEvents: WidgetEvent[] = [];
    for (const line of eventsText.split('\n')) {
      if (!line.trim()) continue;
      const ev: WidgetEvent = JSON.parse(line);
      if (ev.e === 'finished' && ev.d && T1_MEX_DEFS.has(ev.d)) {
        mexEvents.push(ev);
      }
    }

    // First 5 extractor finishes
    const first5 = mexEvents.slice(0, 5);
    if (first5.length === 0) {
      continue;
    }

    const stateLines = readStateLines(fDir);
    const stateDocs: StateDoc[] = stateLines.map((l) => JSON.parse(l));

    const fixtureDeltas: number[] = [];
    for (const mex of first5) {
      // Find state doc right before / at finish frame
      let beforeIncome: number | undefined;
      for (let i = stateDocs.length - 1; i >= 0; i--) {
        const s = stateDocs[i]!;
        if (s.frame <= mex.f && s.res?.metal?.income !== undefined) {
          beforeIncome = s.res.metal.income;
          break;
        }
      }

      // Find state doc after finish + delayFrames (~2s)
      let afterIncome: number | undefined;
      const targetFrame = mex.f + delayFrames;
      for (let i = 0; i < stateDocs.length; i++) {
        const s = stateDocs[i]!;
        if (s.frame >= targetFrame && s.res?.metal?.income !== undefined) {
          afterIncome = s.res.metal.income;
          break;
        }
      }

      if (beforeIncome !== undefined && afterIncome !== undefined) {
        const diff = afterIncome - beforeIncome;
        if (diff > 0) {
          fixtureDeltas.push(diff);
        }
      }
    }

    let existing = mapDeltas.get(resolvedMap.fileName);
    if (!existing) {
      existing = { map: resolvedMap, deltas: [] };
      mapDeltas.set(resolvedMap.fileName, existing);
    }
    existing.deltas.push(...fixtureDeltas);
  }

  const results = new Map<string, MapEstimateResult>();

  for (const [fileName, entry] of mapDeltas.entries()) {
    const median = computeMedian(entry.deltas);
    const roundedYield = Math.round(median * 100) / 100;

    // Update map record in mapsData
    const mapRecord = mapsData.maps.find((m) => m.fileName === fileName);
    if (mapRecord) {
      mapRecord.mexYield = {
        value: roundedYield,
        provenance: 'measured'
      };
    }

    results.set(fileName, {
      mapScriptName: entry.map.scriptName,
      fileName,
      mexYield: roundedYield,
      sampleCount: entry.deltas.length,
      deltas: entry.deltas
    });

    console.log(
      `[estimate-mex-yield] Map "${entry.map.scriptName}" (${fileName}): mexYield = ${roundedYield} M/s (median of ${entry.deltas.length} samples)`
    );
  }

  // Validate and write back to mapsPath
  MapsFileSchema.parse(mapsData);
  fs.writeFileSync(mapsPath, JSON.stringify(mapsData, null, 2) + '\n', 'utf-8');

  return results;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('estimate-mex-yield.ts')) {
  const args = process.argv.slice(2);
  let fixturesDir = path.resolve('data/fixtures/sessions');
  let mapsPath = path.resolve('data/maps/maps.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fixtures' && args[i + 1]) {
      fixturesDir = path.resolve(args[++i]!);
    } else if (args[i] === '--maps' && args[i + 1]) {
      mapsPath = path.resolve(args[++i]!);
    }
  }

  try {
    estimateMexYield({ fixturesDir, mapsPath });
  } catch (err) {
    console.error('[estimate-mex-yield] Failed:', err);
    process.exit(1);
  }
}
