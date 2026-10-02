import fs from 'node:fs';
import path from 'node:path';
import { AvgWindFileSchema, type AvgWindFile } from '../src/core/schemas/maps';

export interface ImportWindOptions {
  fromPath: string;
  outPath: string;
}

export interface RawWindLookupExport {
  protocol?: number;
  kind?: string;
  gameVersion: string;
  table: Record<string, Record<string, number>>;
}

/**
 * Imports a raw wind lookup table exported by the in-game widget into data/wind/avg-wind.json.
 * Fails if any table row is empty or if any value is non-numeric.
 */
export function importWind(opts: ImportWindOptions): AvgWindFile {
  const { fromPath, outPath } = opts;

  if (!fs.existsSync(fromPath)) {
    throw new Error(`Wind lookup source file does not exist: ${fromPath}`);
  }

  const rawText = fs.readFileSync(fromPath, 'utf-8');
  const raw: unknown = JSON.parse(rawText);

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Invalid wind lookup file: root must be an object`);
  }

  const candidate = raw as Partial<RawWindLookupExport>;
  if (typeof candidate.gameVersion !== 'string' || !candidate.gameVersion.trim()) {
    throw new Error(`Invalid wind lookup file: gameVersion must be a non-empty string`);
  }

  if (!candidate.table || typeof candidate.table !== 'object' || Array.isArray(candidate.table)) {
    throw new Error(`Invalid wind lookup file: table must be a non-empty object`);
  }

  const minKeys = Object.keys(candidate.table);
  if (minKeys.length === 0) {
    throw new Error(`Invalid wind lookup file: table contains no rows`);
  }

  // Sort min keys numerically
  minKeys.sort((a, b) => Number(a) - Number(b));

  const sortedTable: Record<string, Record<string, number>> = {};
  let totalEntries = 0;

  for (const minKey of minKeys) {
    const row = candidate.table[minKey];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Invalid wind lookup file: row "${minKey}" is not an object`);
    }

    const maxKeys = Object.keys(row);
    if (maxKeys.length === 0) {
      throw new Error(`Invalid wind lookup file: table row "${minKey}" is empty`);
    }

    maxKeys.sort((a, b) => Number(a) - Number(b));
    const sortedRow: Record<string, number> = {};

    for (const maxKey of maxKeys) {
      const val = row[maxKey];
      if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
        throw new Error(
          `Invalid wind lookup file: entry [${minKey}][${maxKey}] is non-numeric: ${JSON.stringify(val)}`
        );
      }
      sortedRow[maxKey] = val;
      totalEntries++;
    }

    sortedTable[minKey] = sortedRow;
  }

  const avgWindFile: AvgWindFile = {
    schemaVersion: 1,
    gameVersion: candidate.gameVersion,
    table: sortedTable
  };

  AvgWindFileSchema.parse(avgWindFile);

  const targetDir = path.dirname(outPath);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(avgWindFile, null, 2) + '\n', 'utf-8');

  console.log(
    `[import-wind] Successfully imported wind lookup table: ${minKeys.length} rows, ${totalEntries} entries to ${path.relative(process.cwd(), outPath)}`
  );

  return avgWindFile;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('import-wind.ts')) {
  const args = process.argv.slice(2);
  let fromPath = path.resolve('data/raw/h1b/wind-lookup.json');
  let outPath = path.resolve('data/wind/avg-wind.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      fromPath = path.resolve(args[++i]!);
    } else if (args[i] === '--out' && args[i + 1]) {
      outPath = path.resolve(args[++i]!);
    }
  }

  try {
    importWind({ fromPath, outPath });
  } catch (err) {
    console.error('[import-wind] Failed:', err);
    process.exit(1);
  }
}
