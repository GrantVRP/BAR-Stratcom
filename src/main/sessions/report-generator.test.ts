import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateReportForSession } from './report-generator';
import type { SessionMeta } from '../../core/schemas/session';
import { SessionReportSchema } from '../../core/schemas/report';

describe('generateReportForSession (04 §4, T07.2)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-report-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates and persists report.json atomically for a recorded session', async () => {
    const sessionDir = path.join(tmpDir, 'sess-001');
    fs.mkdirSync(sessionDir, { recursive: true });

    const meta: SessionMeta = {
      schemaVersion: 1,
      sessionId: 'sess-001',
      mode: 'player',
      gameVersion: 'test-version',
      engineVersion: '105.1.1',
      mapScriptName: 'Test_Map',
      durationSec: 10,
      startedAt: '2026-10-01T12:00:00.000Z',
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true }
      ],
      start: null,
      source: 'live',
      anonymized: false
    };

    const state1 = {
      protocol: 1,
      sessionId: 'sess-001',
      seq: 1,
      frame: 30,
      gameSeconds: 1,
      wind: { current: 12 },
      me: { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', startUnitId: 'corcom' },
      res: {
        metal: { current: 500, storage: 1000, pull: 10, income: 10, expense: 10, share: 0.9, sent: 0, received: 0 },
        energy: { current: 500, storage: 1000, pull: 20, income: 20, expense: 20, share: 0.9, sent: 0, received: 0 }
      },
      counts: {},
      builders: { total: 1, idle: 0 },
      factories: { total: 0, idle: 0 },
      commander: { alive: true, idle: false },
      bp: { total: 300, active: 300 },
      enemies: {}
    };

    fs.writeFileSync(path.join(sessionDir, 'meta.json'), JSON.stringify(meta), 'utf8');
    fs.writeFileSync(path.join(sessionDir, 'state.ndjson'), JSON.stringify(state1) + '\n', 'utf8');
    fs.writeFileSync(path.join(sessionDir, 'events.ndjson'), JSON.stringify({ f: 30, e: 'gamestart' }) + '\n', 'utf8');

    const report = await generateReportForSession({ sessionDir, meta });

    expect(report).not.toBeNull();
    expect(report?.sessionId).toBe('sess-001');
    expect(report?.grade).toBe('S');
    expect(report?.metrics.durationSec).toBe(10);

    const reportPath = path.join(sessionDir, 'report.json');
    expect(fs.existsSync(reportPath)).toBe(true);

    const onDisk = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(SessionReportSchema.safeParse(onDisk).success).toBe(true);
    expect(onDisk.sessionId).toBe('sess-001');
  });
});
