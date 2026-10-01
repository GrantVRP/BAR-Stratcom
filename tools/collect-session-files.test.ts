import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectSessionFiles, isSessionFileMatch, parseCliArgs } from './collect-session-files';

describe('collect-session-files (T02.7)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-collect-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('isSessionFileMatch', () => {
    it('matches required widget and session files', () => {
      expect(isSessionFileMatch('widget.json')).toBe(true);
      expect(isSessionFileMatch('probe.json')).toBe(true);
      expect(isSessionFileMatch('wind-lookup.json')).toBe(true);
      expect(isSessionFileMatch('unitdefs-105.1.1.json')).toBe(true);
      expect(isSessionFileMatch('session-20261001-1234.json')).toBe(true);
      expect(isSessionFileMatch('events-20261001-1234.ndjson')).toBe(true);
      expect(isSessionFileMatch('state-20261001-1234.ndjson')).toBe(true);
    });

    it('rejects files not part of raw session export', () => {
      expect(isSessionFileMatch('state.json')).toBe(false);
      expect(isSessionFileMatch('coach.json')).toBe(false);
      expect(isSessionFileMatch('record_state.flag')).toBe(false);
      expect(isSessionFileMatch('notes.txt')).toBe(false);
      expect(isSessionFileMatch('unitdefs.txt')).toBe(false);
    });
  });

  describe('parseCliArgs', () => {
    it('parses space-separated flags', () => {
      const args = ['--from', 'D:/BAR/stratcom', '--to', 'data/raw/h1'];
      expect(parseCliArgs(args)).toEqual({
        from: 'D:/BAR/stratcom',
        to: 'data/raw/h1'
      });
    });

    it('parses equal-separated flags', () => {
      const args = ['--from=D:/BAR/stratcom', '--to=data/raw/h1'];
      expect(parseCliArgs(args)).toEqual({
        from: 'D:/BAR/stratcom',
        to: 'data/raw/h1'
      });
    });

    it('handles missing arguments gracefully', () => {
      expect(parseCliArgs([])).toEqual({ from: undefined, to: undefined });
      expect(parseCliArgs(['--from', 'foo'])).toEqual({ from: 'foo', to: undefined });
    });
  });

  describe('collectSessionFiles', () => {
    it('copies matching files into destination directory', () => {
      const fromDir = path.join(tempDir, 'source');
      const toDir = path.join(tempDir, 'dest');
      fs.mkdirSync(fromDir, { recursive: true });

      // Create test files
      fs.writeFileSync(path.join(fromDir, 'widget.json'), '{"protocol":1}');
      fs.writeFileSync(path.join(fromDir, 'probe.json'), '{"protocol":1}');
      fs.writeFileSync(path.join(fromDir, 'unitdefs-105.json'), '{"units":[]}');
      fs.writeFileSync(path.join(fromDir, 'wind-lookup.json'), '{"table":{}}');
      fs.writeFileSync(path.join(fromDir, 'session-abc.json'), '{"sessionId":"abc"}');
      fs.writeFileSync(path.join(fromDir, 'events-abc.ndjson'), '{"e":"gamestart"}\n');
      fs.writeFileSync(path.join(fromDir, 'state-abc.ndjson'), '{"seq":1}\n');

      // Unmatched files that must not be copied
      fs.writeFileSync(path.join(fromDir, 'state.json'), '{"seq":99}');
      fs.writeFileSync(path.join(fromDir, 'record_state.flag'), '');
      fs.writeFileSync(path.join(fromDir, 'other.log'), 'log data');

      const copied = collectSessionFiles(fromDir, toDir);
      expect(copied.sort()).toEqual(
        [
          'events-abc.ndjson',
          'probe.json',
          'session-abc.json',
          'state-abc.ndjson',
          'unitdefs-105.json',
          'widget.json',
          'wind-lookup.json'
        ].sort()
      );

      // Verify copied content in destination
      expect(fs.existsSync(path.join(toDir, 'widget.json'))).toBe(true);
      expect(fs.existsSync(path.join(toDir, 'state.json'))).toBe(false);
      expect(fs.existsSync(path.join(toDir, 'record_state.flag'))).toBe(false);
      expect(fs.existsSync(path.join(toDir, 'other.log'))).toBe(false);
    });

    it('throws error when source directory does not exist', () => {
      const fromDir = path.join(tempDir, 'nonexistent');
      const toDir = path.join(tempDir, 'dest');
      expect(() => collectSessionFiles(fromDir, toDir)).toThrow('Source directory does not exist');
    });
  });
});
