import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { getStateFilePath, readStateLines } from './state-reader';

describe('state-reader', () => {
  it('reads plain state.ndjson', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'state-reader-'));
    try {
      const lines = ['{"seq":1}', '{"seq":2}'];
      fs.writeFileSync(path.join(tmp, 'state.ndjson'), lines.join('\n') + '\n', 'utf-8');

      const info = getStateFilePath(tmp);
      expect(info.isGzip).toBe(false);
      expect(info.sizeBytes).toBeGreaterThan(0);

      const read = readStateLines(tmp);
      expect(read).toEqual(lines);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('reads compressed state.ndjson.gz', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'state-reader-'));
    try {
      const lines = ['{"seq":100}', '{"seq":101}'];
      const compressed = zlib.gzipSync(Buffer.from(lines.join('\n') + '\n', 'utf-8'));
      fs.writeFileSync(path.join(tmp, 'state.ndjson.gz'), compressed);

      const info = getStateFilePath(tmp);
      expect(info.isGzip).toBe(true);
      expect(info.sizeBytes).toBe(compressed.length);

      const read = readStateLines(tmp);
      expect(read).toEqual(lines);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('prefers state.ndjson.gz over plain state.ndjson if both exist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'state-reader-'));
    try {
      const gzLines = ['{"from":"gz"}'];
      const plainLines = ['{"from":"plain"}'];
      const compressed = zlib.gzipSync(Buffer.from(gzLines.join('\n'), 'utf-8'));
      fs.writeFileSync(path.join(tmp, 'state.ndjson.gz'), compressed);
      fs.writeFileSync(path.join(tmp, 'state.ndjson'), plainLines.join('\n'), 'utf-8');

      expect(readStateLines(tmp)).toEqual(gzLines);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('throws an error if neither file exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'state-reader-'));
    try {
      expect(() => readStateLines(tmp)).toThrow(/Neither state\.ndjson\.gz nor state\.ndjson found/);
      expect(() => getStateFilePath(tmp)).toThrow(/Neither state\.ndjson\.gz nor state\.ndjson found/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
