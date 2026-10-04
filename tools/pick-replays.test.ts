import { describe, expect, it } from 'vitest';
import {
  type ProcessedReplay,
  type RawReplayDetail,
  classifyMode,
  filterReplayCandidate,
  formatDuration,
  generateReportMarkdown,
  getDirectDownloadUrl,
  parseSkill,
  pickTargetMix,
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
      durationMs: 600000,
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

    it('rejects games under 8 minutes', () => {
      const r = makeValid();
      r.durationMs = 400000;
      expect(filterReplayCandidate(r)).toBe(false);
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
    });
  });

  describe('pickTargetMix', () => {
    function makeReplay(
      id: string,
      mode: '1v1' | 'small-team' | 'large-team',
      meanSkill: number,
      faction: 'armada' | 'cortex' | 'both',
      mapName: string
    ): ProcessedReplay {
      return {
        id,
        fileName: `${id}.sdfz`,
        startTime: '2026-10-01T00:00:00.000Z',
        date: '2026-10-01',
        durationMs: 600000,
        durationFormatted: '10m 00s',
        mapName,
        mapFileName: `${mapName.toLowerCase().replace(/\s+/g, '_')}.smf`,
        mode,
        modeDetail: mode,
        meanSkill,
        players: [
          {
            name: 'P1',
            faction: faction === 'cortex' ? 'Cortex' : 'Armada',
            skill: meanSkill
          },
          {
            name: 'P2',
            faction: faction === 'armada' ? 'Armada' : 'Cortex',
            skill: meanSkill
          }
        ],
        hasArmada: faction === 'armada' || faction === 'both',
        hasCortex: faction === 'cortex' || faction === 'both',
        gameVersion: 'Beyond All Reason test-31479'
      };
    }

    it('selects 12 duels with >=5 Armada, >=5 Cortex, >=4 maps, plus 8 small and 4 large teams', () => {
      const candidates: ProcessedReplay[] = [];

      // 15 duels across 5 maps with varying factions
      const maps = ['Map A', 'Map B', 'Map C', 'Map D', 'Map E'];
      for (let i = 0; i < 15; i++) {
        const faction = i < 7 ? 'armada' : i < 12 ? 'cortex' : 'both';
        candidates.push(makeReplay(`duel_${i}`, '1v1', 50 - i, faction, maps[i % maps.length]!));
      }

      // 10 small teams
      for (let i = 0; i < 10; i++) {
        candidates.push(makeReplay(`small_${i}`, 'small-team', 35 - i, 'both', 'SmallMap'));
      }

      // 6 large teams
      for (let i = 0; i < 6; i++) {
        candidates.push(makeReplay(`large_${i}`, 'large-team', 40 - i, 'both', 'LargeMap'));
      }

      const result = pickTargetMix(candidates);
      expect(result.duels.length).toBe(12);
      expect(result.smallTeams.length).toBe(8);
      expect(result.largeTeams.length).toBe(4);
      expect(result.picked.length).toBe(24);

      const armadaCount = result.duels.filter((d) => d.hasArmada).length;
      const cortexCount = result.duels.filter((d) => d.hasCortex).length;
      const uniqueMaps = new Set(result.duels.map((d) => d.mapName)).size;

      expect(armadaCount).toBeGreaterThanOrEqual(5);
      expect(cortexCount).toBeGreaterThanOrEqual(5);
      expect(uniqueMaps).toBeGreaterThanOrEqual(4);
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
          { name: 'P1', faction: 'Armada', skill: 45.0 },
          { name: 'P2', faction: 'Cortex', skill: 40.0 }
        ],
        hasArmada: true,
        hasCortex: true,
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
      expect(md).toContain('| 1 | `1234567890ab...` |');
      expect(md).toContain('https://bar-rts.com/replays/1234567890abcdef');
    });
  });
});
