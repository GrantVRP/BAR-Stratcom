import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Reads files of an installed BAR game version from its rapid packages (tools only): the version is
 * listed in `rapid/<host>/<repo>/versions.gz` (`tag,<package md5>,<deps>,<name>`), the package index
 * `packages/<md5>.sdp` is a gzipped list of entries (name length, name, 16-byte md5, crc32, size), and
 * each file lives gzipped at `pool/<md5[0..2]>/<md5[2..]>.gz`.
 */
export interface RapidEntry {
  name: string;
  md5: string;
  size: number;
}

/** The package md5 of a game version name such as "Beyond All Reason test-31479-433a460", or null. */
export function findPackage(dataDir: string, versionName: string): string | null {
  const rapidDir = path.join(dataDir, 'rapid');
  if (!fs.existsSync(rapidDir)) return null;
  for (const host of fs.readdirSync(rapidDir)) {
    const hostDir = path.join(rapidDir, host);
    if (!fs.statSync(hostDir).isDirectory()) continue;
    for (const repo of fs.readdirSync(hostDir)) {
      const versions = path.join(hostDir, repo, 'versions.gz');
      if (!fs.existsSync(versions)) continue;
      for (const line of zlib.gunzipSync(fs.readFileSync(versions)).toString('utf-8').split('\n')) {
        const [, md5, , name] = line.trim().split(',');
        if (name === versionName && md5 && /^[0-9a-f]{32}$/.test(md5)) return md5;
      }
    }
  }
  return null;
}

export function readPackageIndex(dataDir: string, packageMd5: string): RapidEntry[] {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(dataDir, 'packages', `${packageMd5}.sdp`)));
  const entries: RapidEntry[] = [];
  let i = 0;
  while (i < buf.length) {
    const len = buf[i]!;
    const name = buf.subarray(i + 1, i + 1 + len).toString('utf-8');
    const at = i + 1 + len;
    const md5 = buf.subarray(at, at + 16).toString('hex');
    const size = buf.readUInt32BE(at + 20);
    entries.push({ name, md5, size });
    i = at + 24;
  }
  return entries;
}

/** One file of a rapid package as text, or null when the package has no such file. */
export function readPackageFile(dataDir: string, packageMd5: string, fileName: string): string | null {
  const entry = readPackageIndex(dataDir, packageMd5).find((e) => e.name.toLowerCase() === fileName.toLowerCase());
  if (!entry) return null;
  const file = path.join(dataDir, 'pool', entry.md5.slice(0, 2), `${entry.md5.slice(2)}.gz`);
  return zlib.gunzipSync(fs.readFileSync(file)).toString('utf-8');
}
