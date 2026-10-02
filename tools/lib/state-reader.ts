import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Returns info about which state file exists in the directory.
 */
export function getStateFilePath(dir: string): { path: string; isGzip: boolean; sizeBytes: number } {
  const gzPath = path.join(dir, 'state.ndjson.gz');
  const plainPath = path.join(dir, 'state.ndjson');

  if (fs.existsSync(gzPath)) {
    return { path: gzPath, isGzip: true, sizeBytes: fs.statSync(gzPath).size };
  }
  if (fs.existsSync(plainPath)) {
    return { path: plainPath, isGzip: false, sizeBytes: fs.statSync(plainPath).size };
  }
  throw new Error(`Neither state.ndjson.gz nor state.ndjson found in ${dir}`);
}

/**
 * Reads lines from either state.ndjson.gz or state.ndjson in the given directory.
 * Returns an array of non-empty line strings.
 */
export function readStateLines(dir: string): string[] {
  const gzPath = path.join(dir, 'state.ndjson.gz');
  const plainPath = path.join(dir, 'state.ndjson');

  let content: string;
  if (fs.existsSync(gzPath)) {
    const compressed = fs.readFileSync(gzPath);
    content = zlib.gunzipSync(compressed).toString('utf-8');
  } else if (fs.existsSync(plainPath)) {
    content = fs.readFileSync(plainPath, 'utf-8');
  } else {
    throw new Error(`Neither state.ndjson.gz nor state.ndjson found in ${dir}`);
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
