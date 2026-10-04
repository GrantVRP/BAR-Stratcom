import { describe, expect, it } from 'vitest';
import {
  type ProcessedReplay,
  type RawReplayDetail,
  classifyMode,
  filterReplayCandidate,
  formatDuration,
  generateReportJson,
  generateReportMarkdown,
  getDirectDownloadUrl,
  MIN_DURATION_MS,
  parseSkill,
  processReplayDetail
} from './pick-replays';

describe('pick-replays (T08.1)', () => {
  describe('parseSkill', () => {
    it('parses bracketed skill strings', () => {
      expect(parseSkill('[33.65]')).toBe(33.65);
      expect(parseSkill('[14.99]')).toBe(14.99);
      expect(parseSkill('[0.0]')).toBe(0);
    });

    it('parses plain numeric strings', () => {
      expect(parseSkill('25.5')).toBe(25.5);
    });

    it('returns 0 for missing or invalid inputs', () => {
      expect(parseSkill(null)).toBe(0);
      expect(parseSkill(undefined)).toBe(0);
      expect(parseSkill('')).toBe(0);
      expect(parseSkill('abc')).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats ms into m:ss strings', () => {
      expect(formatDuration(480000)).toBe('8m 00s');
      expect(formatDuration(584000)).toBe('9m 44s');
      expect(formatDuration(1502000)).toBe('25m 02s');
    });
  });

  describe('classifyMode', () => {
    it('classifies 1v1 matches', () => {
      const mode = classifyMode([
        { Players: [{ name: 'A' }] },
        { Players: [{ name: 'B' }] }
      ]);
      expect(mode).toBe('1v1');
    });

    it('classifies small team matches (2v2 to 4v4)', () => {
      expect(
        classifyMode([
          { Players: [{ name: 'A' }, { name: 'B' }] },
          { Players: [{ name: 'C' }, { name: 'D' }] }
        ])
      ).toBe('small-team');

      expect(
        classifyMode([
          { Players: [{ name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }] },
          { Players: [{ name: '5' }, { name: '6' }, { name: '7' }, { name: '8' }] }
        ])
      ).toBe('small-team');
    });

    it('classifies large team matches (>4 players per team)', () => {
      const makeTeam = (count: number) => ({
        Players: Array.from({ length: count }, (_, i) => ({ name: `P${i}` }))
      });
      expect(classifyMode([makeTeam(5), makeTeam(5)])).toBe('large-team');
      expect(classifyMode([makeTeam(8), makeTeam(8)])).toBe('large-team');
    });

    it('returns other for invalid or incomplete setups', () => {
      expect(classifyMode([])).toBe('other');
      expect(classifyMode([{ Players: [{ name: 'Alone' }] }])).toBe('other');
    });
  });

  describe('filterReplayCandidate', () => {
    const makeValid = (): RawReplayDetail => ({
      id: 'abc123',
      fileName: 'test.sdfz',
      engineVersion: '2026.07.04',
      gameVersion: 'Beyond All Reason test-31479-433a460',
      startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      durationMs: 720000,
      gameEndedNormally: true,
      hasBots: false,
      preset: 'duel',
      Map: { fileName: 'comet_catcher_remake_1.8', scriptName: 'Comet Catcher Remake' },
      AllyTeams: [
        { winningTeam: true, Players: [{ name: 'P1', faction: 'Armada', skill: '[30]' }], AIs: [] },
        { winningTeam: false, Players: [{ name: 'P2', faction: 'Cortex', skill: '[25]' }], AIs: [] }
      ]
    });

    it('accepts valid candidates', () => {
      expect(filterReplayCandidate(makeValid())).toBe(true);
    });

    it('rejects games not ended normally', () => {
      const r = makeValid();
      r.gameEndedNormally = false;
      expect(filterReplayCandidate(r)).toBe(false);
    });

    it('rejects games with bots or AIs', () => {
      const r1 = makeValid();
      r1.hasBots = true;
      expect(filterReplayCandidate(r1)).toBe(false);

      const r2 = makeValid();
      r2.AllyTeams[0]!.AIs = [{ shortName: 'BARbarian' }];
      expect(filterReplayCandidate(r2)).toBe(false);
    });

    it('rejects games under 11 minutes, which cannot give a 10:30 recording (T08.1b)', () => {
      const r = makeValid();
      r.durationMs = 10 * 60 * 1000 + 59 * 1000;
      expect(filterReplayCandidate(r)).toBe(false);
      r.durationMs = MIN_DURATION_MS;
      expect(filterReplayCandidate(r)).toBe(true);
    });

    it('rejects games older than 60 days', () => {
      const r = makeValid();
      r.startTime = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString();
      expect(filterReplayCandidate(r)).toBe(false);
    });

    it('rejects incompatible version families', () => {
      const r = makeValid();
      r.gameVersion = 'Beyond All Reason release-29000';
      expect(filterReplayCandidate(r)).toBe(false);
    });
  });

  describe('processReplayDetail', () => {
    it('calculates mean skill and extracts metadata', () => {
      const detail: RawReplayDetail = {
        id: '12345',
        fileName: 'test_game.sdfz',
        engineVersion: '2026.07.04',
        gameVersion: 'Beyond All Reason test-31479-433a460',
        startTime: '2026-10-02T10:00:00.000Z',
        durationMs: 600000,
        gameEndedNormally: true,
        hasBots: false,
        preset: 'duel',
        Map: { fileName: 'isidis_crack_1.1', scriptName: 'Isidis crack 1.1' },
        AllyTeams: [
          { Players: [{ name: 'Alpha', faction: 'Armada', skill: '[40.0]' }] },
          { Players: [{ name: 'Beta', faction: 'Cortex', skill: '[30.0]' }] }
        ]
      };

      const processed = processReplayDetail(detail);
      expect(processed.id).toBe('12345');
      expect(processed.meanSkill).toBe(35);
      expect(processed.hasArmada).toBe(true);
      expect(processed.hasCortex).toBe(true);
      expect(processed.mode).toBe('1v1');
      expect(processed.modeDetail).toBe('1v1');
      expect(processed.hasLegion).toBe(false);
      expect(processed.players.map((p) => p.allyTeam)).toEqual([0, 1]);
    });
  });

  describe('getDirectDownloadUrl', () => {
    it('encodes the demo filename in the OVH URL', () => {
      const url = getDirectDownloadUrl('2026-10-04_Game Name 1.0_2026.07.04.sdfz');
      expect(url).toContain('https://storage.uk.cloud.ovh.net/');
      expect(url).toContain('2026-10-04_Game%20Name%201.0_2026.07.04.sdfz');
    });
  });

  describe('generateReportMarkdown', () => {
    it('produces formatted markdown table and instructions', () => {
      const dummyReplay: ProcessedReplay = {
        id: '1234567890abcdef',
        fileName: 'dummy.sdfz',
        startTime: '2026-10-03T12:00:00.000Z',
        date: '2026-10-03',
        durationMs: 720000,
        durationFormatted: '12m 00s',
        mapName: 'Comet Catcher Remake 1.8',
        mapFileName: 'comet_catcher_remake_1.8',
        mode: '1v1',
        modeDetail: '1v1',
        meanSkill: 42.5,
        players: [
          { name: 'P1', faction: 'Armada', skill: 45.0, allyTeam: 0 },
          { name: 'P2', faction: 'Cortex', skill: 40.0, allyTeam: 1 }
        ],
        hasArmada: true,
        hasCortex: true,
        hasLegion: false,
        gameVersion: 'Beyond All Reason test-31479'
      };

      const result = {
        picked: [dummyReplay],
        duels: [dummyReplay],
        smallTeams: [],
        largeTeams: [],
        notes: []
      };

      const md = generateReportMarkdown(result, '2026-10-04T00:00:00.000Z');
      expect(md).toContain('# H2 Pro Replay List');
      expect(md).toContain('Target Mix Status');
      expect(md).toContain('Download & Spectator Instructions');
      expect(md).toContain('| [ ] | 1 | `1234567890ab...` |');
      expect(md).toContain('https://bar-rts.com/replays/1234567890abcdef');
      expect(md).toContain('until the in-game clock shows at least');
      expect(md).toContain('Selection rules (T08.1b)');

      const json = generateReportJson(result, '2026-10-04T00:00:00.000Z');
      expect(json.replays[0]).toMatchObject({
        id: '1234567890abcdef',
        url: 'https://bar-rts.com/replays/1234567890abcdef',
        map: { scriptName: 'Comet Catcher Remake 1.8', fileName: 'comet_catcher_remake_1.8' },
        durationSec: 720,
        players: [
          { name: 'P1', faction: 'Armada', skill: 45, allyTeam: 0 },
          { name: 'P2', faction: 'Cortex', skill: 40, allyTeam: 1 }
        ]
      });
    });
  });
});
