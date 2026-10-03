import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from './store';
import type { SessionMeta, SessionReport } from '../../core/schemas';

describe('SessionStore', () => {
  let tmpDir: string;
  let store: SessionStore;

  const validMeta: SessionMeta = {
    schemaVersion: 1,
    sessionId: '2026-10-01-cortex-1v1-vs-ai-barr',
    mode: 'player',
    gameVersion: 'test-version',
    engineVersion: '2026.01',
    mapScriptName: 'BarR 1.1',
    durationSec: 500,
    startedAt: '2026-10-01T14:00:00.000Z',
    teams: [
      {
        teamId: 0,
        allyTeamId: 0,
        playerName: 'Grant_P',
        factionId: 'cortex',
        isMe: true
      }
    ],
    start: {
      metal: 1000,
      energy: 1000,
      metalStorage: 1000,
      energyStorage: 1000
    },
    planId: 'sample-plan-1',
    source: 'live',
    anonymized: false
  };

  const validReport: SessionReport = {
    schemaVersion: 1,
    sessionId: '2026-10-01-cortex-1v1-vs-ai-barr',
    planId: 'sample-plan-1',
    profile: 'intermediate',
    factionId: 'cortex',
    metrics: {
      durationSec: 500,
      energyStallSec: 10,
      metalStallSec: 5,
      metalFloatSec: 20,
      energyFloatSec: 15,
      idleFactorySec: 8,
      idleBuilderSec: 12,
      idleCommanderSec: 4,
      bpUtilisation: 0.85,
      timeToFirstFactory: 35,
      timeToT2: 320,
      incomeAt: {
        '180': { metal: 12, energy: 80 },
        '300': { metal: 24, energy: 160 },
        '480': { metal: 45, energy: 320 },
        '600': null
      }
    },
    steps: [
      {
        stepId: 's1',
        plannedFinish: 15,
        actualFinish: 14,
        deltaSec: -1
      }
    ],
    adherence: 0.9,
    benchmark: null,
    tips: [
      {
        id: 'tip-1',
        severity: 'info',
        text: 'Great opening tempo.'
      }
    ],
    grade: 'A',
    profileSuggestion: null
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-session-store-test-'));
    store = new SessionStore({ sessionsDir: tmpDir });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  function createSessionDir(
    meta: SessionMeta,
    report?: SessionReport,
    extraFiles?: { state?: string[]; stateGz?: string[]; events?: string[] }
  ): string {
    const sessionDir = path.join(tmpDir, meta.sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

    if (report) {
      fs.writeFileSync(path.join(sessionDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    }

    if (extraFiles?.state) {
      fs.writeFileSync(path.join(sessionDir, 'state.ndjson'), extraFiles.state.join('\n') + '\n', 'utf8');
    }

    if (extraFiles?.stateGz) {
      const gzipped = zlib.gzipSync(Buffer.from(extraFiles.stateGz.join('\n') + '\n', 'utf8'));
      fs.writeFileSync(path.join(sessionDir, 'state.ndjson.gz'), gzipped);
    }

    if (extraFiles?.events) {
      fs.writeFileSync(path.join(sessionDir, 'events.ndjson'), extraFiles.events.join('\n') + '\n', 'utf8');
    }

    return sessionDir;
  }

  describe('list', () => {
    it('returns empty array when directory is empty', () => {
      expect(store.list()).toEqual([]);
    });

    it('returns empty array when directory does not exist', () => {
      const nonExistent = new SessionStore({ sessionsDir: path.join(tmpDir, 'does-not-exist') });
      expect(nonExistent.list()).toEqual([]);
    });

    it('lists sessions sorted newest first with summary fields', () => {
      const meta1: SessionMeta = {
        ...validMeta,
        sessionId: 'session-2026-10-01',
        startedAt: '2026-10-01T10:00:00.000Z'
      };
      const meta2: SessionMeta = {
        ...validMeta,
        sessionId: 'session-2026-10-02',
        startedAt: '2026-10-02T10:00:00.000Z'
      };
      const report2: SessionReport = {
        ...validReport,
        sessionId: 'session-2026-10-02',
        grade: 'S',
        adherence: 0.98
      };

      createSessionDir(meta1);
      createSessionDir(meta2, report2);

      const list = store.list();
      expect(list).toHaveLength(2);

      // Newest first
      expect(list[0]!.sessionId).toBe('session-2026-10-02');
      expect(list[0]!.hasReport).toBe(true);
      expect(list[0]!.grade).toBe('S');
      expect(list[0]!.adherence).toBe(0.98);
      expect(list[0]!.factionId).toBe('cortex');
      expect(list[0]!.playerName).toBe('Grant_P');
      expect(list[0]!.mapScriptName).toBe('BarR 1.1');

      expect(list[1]!.sessionId).toBe('session-2026-10-01');
      expect(list[1]!.hasReport).toBe(false);
      expect(list[1]!.grade).toBeNull();
      expect(list[1]!.adherence).toBeNull();
    });

    it('ignores corrupted or invalid session folders', () => {
      createSessionDir(validMeta);

      // Folder without meta.json
      fs.mkdirSync(path.join(tmpDir, 'empty-folder'));

      // Folder with invalid meta.json
      const corruptedDir = path.join(tmpDir, 'corrupted');
      fs.mkdirSync(corruptedDir);
      fs.writeFileSync(path.join(corruptedDir, 'meta.json'), '{ "invalid": true }', 'utf8');

      const list = store.list();
      expect(list).toHaveLength(1);
      expect(list[0]!.sessionId).toBe(validMeta.sessionId);
    });
  });

  describe('get', () => {
    it('returns null for non-existent session', () => {
      expect(store.get('no-such-session')).toBeNull();
    });

    it('guards against path traversal', () => {
      expect(store.get('../other')).toBeNull();
      expect(store.get('..\\other')).toBeNull();
      expect(store.get('')).toBeNull();
    });

    it('loads session detail without series by default', () => {
      createSessionDir(validMeta, validReport, {
        state: [JSON.stringify({ frame: 30, gameSeconds: 1 })],
        events: [JSON.stringify({ f: 0, e: 'gamestart' })]
      });

      const detail = store.get(validMeta.sessionId);
      expect(detail).not.toBeNull();
      expect(detail?.meta.sessionId).toBe(validMeta.sessionId);
      expect(detail?.report?.grade).toBe('A');
      expect(detail?.hasState).toBe(true);
      expect(detail?.hasEvents).toBe(true);
      expect(detail?.series).toBeUndefined();
    });

    it('lazy-loads series from plain state.ndjson and events.ndjson', () => {
      createSessionDir(validMeta, validReport, {
        state: [
          JSON.stringify({ frame: 30, gameSeconds: 1 }),
          JSON.stringify({ frame: 60, gameSeconds: 2 })
        ],
        events: [JSON.stringify({ f: 0, e: 'gamestart' })]
      });

      const detail = store.get(validMeta.sessionId, { includeSeries: true });
      expect(detail).not.toBeNull();
      expect(detail?.series).toBeDefined();
      expect(detail?.series?.states).toHaveLength(2);
      expect(detail?.series?.states[0]).toEqual({ frame: 30, gameSeconds: 1 });
      expect(detail?.series?.events).toHaveLength(1);
      expect(detail?.series?.events[0]).toEqual({ f: 0, e: 'gamestart' });
    });

    it('lazy-loads series from compressed state.ndjson.gz', () => {
      createSessionDir(validMeta, undefined, {
        stateGz: [JSON.stringify({ frame: 30, gameSeconds: 1 })],
        events: [JSON.stringify({ f: 30, e: 'created', u: 101 })]
      });

      const detail = store.get(validMeta.sessionId, { includeSeries: true });
      expect(detail).not.toBeNull();
      expect(detail?.hasState).toBe(true);
      expect(detail?.series?.states).toHaveLength(1);
      expect(detail?.series?.states[0]).toEqual({ frame: 30, gameSeconds: 1 });
      expect(detail?.series?.events).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('deletes session directory and contents', () => {
      createSessionDir(validMeta, validReport, {
        state: [JSON.stringify({ frame: 30 })]
      });

      expect(fs.existsSync(path.join(tmpDir, validMeta.sessionId))).toBe(true);
      const ok = store.delete(validMeta.sessionId);
      expect(ok).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, validMeta.sessionId))).toBe(false);
      expect(store.get(validMeta.sessionId)).toBeNull();
    });

    it('returns false for non-existent session', () => {
      expect(store.delete('missing')).toBe(false);
    });

    it('guards against path traversal on delete', () => {
      expect(store.delete('../some-dir')).toBe(false);
    });
  });

  describe('applyRetention', () => {
    it('keeps the newest sessions and removes older ones beyond limit', () => {
      const dates = [
        '2026-10-01T10:00:00.000Z',
        '2026-10-02T10:00:00.000Z',
        '2026-10-03T10:00:00.000Z',
        '2026-10-04T10:00:00.000Z',
        '2026-10-05T10:00:00.000Z'
      ];

      for (let i = 0; i < dates.length; i++) {
        createSessionDir({
          ...validMeta,
          sessionId: `session-${i}`,
          startedAt: dates[i]!
        });
      }

      expect(store.list()).toHaveLength(5);

      // Retain 3 newest
      const deleted = store.applyRetention(3);
      expect(deleted).toBe(2);

      const remaining = store.list();
      expect(remaining).toHaveLength(3);
      expect(remaining.map((s) => s.sessionId)).toEqual([
        'session-4',
        'session-3',
        'session-2'
      ]);

      // Running retention again when within budget does nothing
      expect(store.applyRetention(3)).toBe(0);
    });
  });

  describe('saveReport', () => {
    it('saves report atomically to report.json', () => {
      createSessionDir(validMeta);

      const detailBefore = store.get(validMeta.sessionId);
      expect(detailBefore?.report).toBeNull();

      const ok = store.saveReport(validMeta.sessionId, validReport);
      expect(ok).toBe(true);

      const detailAfter = store.get(validMeta.sessionId);
      expect(detailAfter?.report).not.toBeNull();
      expect(detailAfter?.report?.grade).toBe('A');
      expect(detailAfter?.report?.adherence).toBe(0.9);
    });

    it('rejects saving to non-existent session or invalid report', () => {
      expect(store.saveReport('non-existent', validReport)).toBe(false);
      expect(store.saveReport(validMeta.sessionId, { ...validReport, grade: 'Z' as never })).toBe(false);
    });
  });
});
