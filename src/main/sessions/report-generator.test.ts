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
    expect(onDisk.profileSuggestion).toBeNull();
  });

  it('stores auto-suggested profile adjustment in report.json when 3 consecutive games qualify (04 §4.4, T07.3)', async () => {
    // Setup two prior sessions with Grade A and adherence >= 0.8 on intermediate
    for (const id of ['sess-prior-1', 'sess-prior-2']) {
      const priorDir = path.join(tmpDir, id);
      fs.mkdirSync(priorDir, { recursive: true });
      const priorMeta: SessionMeta = {
        schemaVersion: 1,
        sessionId: id,
        mode: 'player',
        gameVersion: 'test',
        engineVersion: '105.1.1',
        mapScriptName: 'Test_Map',
        durationSec: 100,
        startedAt: id === 'sess-prior-1' ? '2026-10-01T10:00:00.000Z' : '2026-10-01T11:00:00.000Z',
        teams: [{ teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true }],
        start: null,
        source: 'live',
        anonymized: false
      };
      fs.writeFileSync(path.join(priorDir, 'meta.json'), JSON.stringify(priorMeta), 'utf8');

      const priorReport = {
        schemaVersion: 1,
        sessionId: id,
        profile: 'intermediate',
        factionId: 'cortex',
        metrics: {
          durationSec: 100,
          energyStallSec: 0,
          metalStallSec: 0,
          metalFloatSec: 0,
          energyFloatSec: 0,
          idleFactorySec: 0,
          idleBuilderSec: 0,
          idleCommanderSec: 0,
          bpUtilisation: 0.8,
          timeToFirstFactory: 30,
          timeToT2: null,
          incomeAt: { '180': null, '300': null, '480': null, '600': null }
        },
        steps: [],
        adherence: 0.9,
        benchmark: null,
        tips: [],
        grade: 'A',
        profileSuggestion: null
      };
      fs.writeFileSync(path.join(priorDir, 'report.json'), JSON.stringify(priorReport), 'utf8');
    }

    // Now generate 3rd session
    const thirdDir = path.join(tmpDir, 'sess-current');
    fs.mkdirSync(thirdDir, { recursive: true });
    const currentMeta: SessionMeta = {
      schemaVersion: 1,
      sessionId: 'sess-current',
      mode: 'player',
      gameVersion: 'test',
      engineVersion: '105.1.1',
      mapScriptName: 'Test_Map',
      durationSec: 10,
      startedAt: '2026-10-01T12:00:00.000Z',
      teams: [{ teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true }],
      start: null,
      source: 'live',
      anonymized: false
    };

    const state = {
      protocol: 1,
      sessionId: 'sess-current',
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

    fs.writeFileSync(path.join(thirdDir, 'meta.json'), JSON.stringify(currentMeta), 'utf8');
    fs.writeFileSync(path.join(thirdDir, 'state.ndjson'), JSON.stringify(state) + '\n', 'utf8');
    fs.writeFileSync(path.join(thirdDir, 'events.ndjson'), JSON.stringify({ f: 30, e: 'gamestart' }) + '\n', 'utf8');

    const report = await generateReportForSession({ sessionDir: thirdDir, meta: currentMeta });
    expect(report).not.toBeNull();
    expect(report?.profileSuggestion).not.toBeNull();
    expect(report?.profileSuggestion?.to).toBe('advanced');

    const onDisk = JSON.parse(fs.readFileSync(path.join(thirdDir, 'report.json'), 'utf8'));
    expect(onDisk.profileSuggestion).not.toBeNull();
    expect(onDisk.profileSuggestion.to).toBe('advanced');
  });
});
