import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MapsFileSchema, type MapsFile } from '../src/core/schemas/maps';
import { computeMedian, estimateMexYield } from './estimate-mex-yield';

describe('tools/estimate-mex-yield.ts', () => {
  describe('computeMedian', () => {
    it('computes median for odd count', () => {
      expect(computeMedian([1, 5, 2])).toBe(2);
      expect(computeMedian([10])).toBe(10);
    });

    it('computes median for even count', () => {
      expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
    });

    it('returns 0 for empty array', () => {
      expect(computeMedian([])).toBe(0);
    });
  });

  describe('estimateMexYield integration', () => {
    it('estimates mex yield from player fixture and updates map record', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mex-yield-test-'));
      const fixturesDir = path.join(tmpDir, 'fixtures');
      const mapsPath = path.join(tmpDir, 'maps.json');

      const sampleMaps: MapsFile = {
        schemaVersion: 1,
        fetchedAt: '2026-10-01T00:00:00.000Z',
        source: 'api.bar-rts.com/maps',
        maps: [
          {
            fileName: 'sample_map_1.0',
            scriptName: 'Sample Map 1.0',
            name: 'Sample Map',
            author: 'Test',
            sizeX: 16,
            sizeZ: 16,
            wind: { min: 2, max: 20 },
            tidalStrength: 10,
            maxMetal: 1.5,
            extractorRadius: 90,
            gravity: 120,
            startPositions: [{ x: 500, z: 500 }],
            hasWater: false,
            popularity: null,
            mexYield: null
          }
        ]
      };
      fs.writeFileSync(mapsPath, JSON.stringify(sampleMaps, null, 2), 'utf-8');

      // Create a player fixture
      const fixtureDir = path.join(fixturesDir, '2026-10-01-cortex-1v1-vs-ai-sample');
      fs.mkdirSync(fixtureDir, { recursive: true });

      const meta = {
        schemaVersion: 1,
        sessionId: '2026-10-01-cortex-1v1-vs-ai-sample',
        mode: 'player',
        gameVersion: 'test-1',
        engineVersion: '2026.01',
        mapScriptName: 'Sample Map 1.0',
        durationSec: 100,
        startedAt: '2026-10-01T00:00:00.000Z',
        teams: [
          { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true },
          { teamId: 1, allyTeamId: 1, playerName: 'AI', factionId: null, isMe: false }
        ],
        start: null,
        source: 'fixture',
        anonymized: true
      };
      fs.writeFileSync(path.join(fixtureDir, 'meta.json'), JSON.stringify(meta), 'utf-8');

      const events = [
        { f: 300, e: 'finished', u: 10, d: 'cormex', tm: 0 },
        { f: 600, e: 'finished', u: 11, d: 'cormex', tm: 0 }
      ];
      fs.writeFileSync(path.join(fixtureDir, 'events.ndjson'), events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

      // State docs: frame 0, 300, 360, 600, 660
      const stateDocs = [
        { frame: 0, res: { metal: { income: 2.0 } } },
        { frame: 300, res: { metal: { income: 2.0 } } },
        { frame: 360, res: { metal: { income: 4.2 } } }, // delta = 2.2
        { frame: 600, res: { metal: { income: 4.2 } } },
        { frame: 660, res: { metal: { income: 6.4 } } }  // delta = 2.2
      ];
      fs.writeFileSync(path.join(fixtureDir, 'state.ndjson'), stateDocs.map((s) => JSON.stringify(s)).join('\n') + '\n', 'utf-8');

      const results = estimateMexYield({ fixturesDir, mapsPath, delayFrames: 60 });
      expect(results.size).toBe(1);

      const mapResult = results.get('sample_map_1.0');
      expect(mapResult).toBeDefined();
      expect(mapResult?.mexYield).toBe(2.2);
      expect(mapResult?.sampleCount).toBe(2);

      // Verify updated maps.json
      const updatedMaps: MapsFile = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
      MapsFileSchema.parse(updatedMaps);
      expect(updatedMaps.maps[0]!.mexYield).toEqual({
        value: 2.2,
        provenance: 'measured'
      });
    });

    it('skips non-player fixtures', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mex-yield-test-'));
      const fixturesDir = path.join(tmpDir, 'fixtures');
      const mapsPath = path.join(tmpDir, 'maps.json');

      const sampleMaps: MapsFile = {
        schemaVersion: 1,
        fetchedAt: '2026-10-01T00:00:00.000Z',
        source: 'api.bar-rts.com/maps',
        maps: []
      };
      fs.writeFileSync(mapsPath, JSON.stringify(sampleMaps, null, 2), 'utf-8');

      const fixtureDir = path.join(fixturesDir, '2026-10-01-multi-1v1-owner-vs-ai-sample');
      fs.mkdirSync(fixtureDir, { recursive: true });

      const meta = {
        schemaVersion: 1,
        sessionId: 'sample',
        mode: 'spectator',
        gameVersion: 'test-1',
        engineVersion: '2026.01',
        mapScriptName: 'Sample Map 1.0',
        durationSec: 100,
        startedAt: '2026-10-01T00:00:00.000Z',
        teams: [],
        start: null,
        source: 'fixture',
        anonymized: true
      };
      fs.writeFileSync(path.join(fixtureDir, 'meta.json'), JSON.stringify(meta), 'utf-8');

      const results = estimateMexYield({ fixturesDir, mapsPath });
      expect(results.size).toBe(0);
    });
  });
});
