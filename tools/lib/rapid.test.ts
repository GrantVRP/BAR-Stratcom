import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findPackage, readPackageFile, readPackageIndex } from './rapid';

/** Builds a tiny rapid install (versions.gz, one .sdp, pool files) in the shape BAR's launcher writes. */
function install(dir: string, files: Record<string, string>): string {
  const index: Buffer[] = [];
  for (const [name, text] of Object.entries(files)) {
    const md5 = crypto.createHash('md5').update(text).digest();
    const hex = md5.toString('hex');
    fs.mkdirSync(path.join(dir, 'pool', hex.slice(0, 2)), { recursive: true });
    fs.writeFileSync(path.join(dir, 'pool', hex.slice(0, 2), `${hex.slice(2)}.gz`), zlib.gzipSync(text));
    const tail = Buffer.alloc(8);
    tail.writeUInt32BE(0, 0); // crc32 (not checked)
    tail.writeUInt32BE(Buffer.byteLength(text), 4);
    index.push(Buffer.from([Buffer.byteLength(name)]), Buffer.from(name), md5, tail);
  }
  const pkg = 'a'.repeat(32);
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'packages', `${pkg}.sdp`), zlib.gzipSync(Buffer.concat(index)));
  fs.mkdirSync(path.join(dir, 'rapid', 'repos.example', 'byar'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'rapid', 'repos.example', 'byar', 'versions.gz'),
    zlib.gzipSync(`byar:test,${'b'.repeat(32)},,Beyond All Reason test-1\nbyar:git:x,${pkg},,Beyond All Reason test-2\n`)
  );
  return pkg;
}

describe('rapid package reader (Q-06, tools only)', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rapid-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('finds a version’s package and reads a file from the pool', () => {
    const pkg = install(dir, { 'common/wind_functions.lua': 'local x = 1', 'units/a.lua': 'return {}' });
    expect(findPackage(dir, 'Beyond All Reason test-2')).toBe(pkg);
    expect(findPackage(dir, 'Beyond All Reason test-9')).toBeNull();
    expect(readPackageIndex(dir, pkg).map((e) => [e.name, e.size])).toEqual([
      ['common/wind_functions.lua', 11],
      ['units/a.lua', 9]
    ]);
    expect(readPackageFile(dir, pkg, 'Common/Wind_Functions.lua')).toBe('local x = 1');
    expect(readPackageFile(dir, pkg, 'missing.lua')).toBeNull();
    expect(findPackage(path.join(dir, 'nowhere'), 'x')).toBeNull();
  });
});
