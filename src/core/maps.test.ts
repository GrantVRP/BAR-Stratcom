import { describe, expect, it } from 'vitest';
import mapsData from '../../data/maps/maps.json';
import { avgWindFor, findMapByScriptName, stripMapVersionSuffix, windRiskFor } from './maps';
import { type MapRecord, MapsFileSchema } from './schemas';

describe('src/core/maps logic', () => {
  const sampleMaps: MapRecord[] = [
    {
      fileName: 'supreme_isthmus_v2.1',
      scriptName: 'Supreme Isthmus v2.1',
      name: 'Supreme Isthmus',
      author: 'IceXuick',
      sizeX: 16,
      sizeZ: 16,
      wind: { min: 2, max: 20 },
      tidalStrength: 15,
      maxMetal: 1.5,
      extractorRadius: 90,
      gravity: 120,
      startPositions: [
        { x: 1000, z: 2000 },
        { x: 7000, z: 6000 }
      ],
      hasWater: true,
      popularity: { replays30d: 500, rank: 1 },
      mexYield: null
    },
    {
      fileName: 'comet_catcher_remake_1.8',
      scriptName: 'Comet Catcher Remake 1.8',
      name: 'Comet Catcher Remake',
      author: 'BAR Team',
      sizeX: 16,
      sizeZ: 16,
      wind: { min: 0, max: 0 },
      tidalStrength: 0,
      maxMetal: 2.0,
      extractorRadius: 90,
      gravity: 80,
      startPositions: [{ x: 500, z: 500 }],
      hasWater: false,
      popularity: { replays30d: 120, rank: 2 },
      mexYield: null
    }
  ];

  describe('findMapByScriptName', () => {
    it('finds map by exact scriptName', () => {
      const match = findMapByScriptName(sampleMaps, 'Supreme Isthmus v2.1');
      expect(match).toBeDefined();
      expect(match?.fileName).toBe('supreme_isthmus_v2.1');
    });

    it('finds map case-insensitively', () => {
      const match = findMapByScriptName(sampleMaps, 'supreme isthmus v2.1');
      expect(match).toBeDefined();
      expect(match?.fileName).toBe('supreme_isthmus_v2.1');
    });

    it('finds map by scriptName without version suffix', () => {
      const match = findMapByScriptName(sampleMaps, 'Supreme Isthmus');
      expect(match).toBeDefined();
      expect(match?.fileName).toBe('supreme_isthmus_v2.1');
    });

    it('finds map when target has a different version suffix', () => {
      const match = findMapByScriptName(sampleMaps, 'Supreme Isthmus v2.2');
      expect(match).toBeDefined();
      expect(match?.fileName).toBe('supreme_isthmus_v2.1');
    });

    it('returns undefined for unknown map', () => {
      expect(findMapByScriptName(sampleMaps, 'Unknown Map')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(findMapByScriptName(sampleMaps, '')).toBeUndefined();
      expect(findMapByScriptName(sampleMaps, '   ')).toBeUndefined();
    });
  });

  describe('stripMapVersionSuffix', () => {
    it('strips standard version formats', () => {
      expect(stripMapVersionSuffix('Supreme Isthmus v2.1')).toBe('Supreme Isthmus');
      expect(stripMapVersionSuffix('Comet Catcher Remake 1.8')).toBe('Comet Catcher Remake');
      expect(stripMapVersionSuffix('Zed 2.3')).toBe('Zed');
      expect(stripMapVersionSuffix('Pillar of Doom V1')).toBe('Pillar of Doom');
      expect(stripMapVersionSuffix('Alpha_v2')).toBe('Alpha');
    });

    it('leaves unversioned map names intact', () => {
      expect(stripMapVersionSuffix('Starwatcher')).toBe('Starwatcher');
      expect(stripMapVersionSuffix('Red River')).toBe('Red River');
    });
  });

  describe('windRiskFor', () => {
    it('reads BAR’s risk table by [min][max] and is null when it has no entry', () => {
      const risk = { '2': { '20': 6.6 } };
      expect(windRiskFor(sampleMaps[0]!, risk)).toBe(6.6);
      expect(windRiskFor({ ...sampleMaps[0]!, wind: { min: 5, max: 15 } }, risk)).toBeNull();
      expect(windRiskFor(sampleMaps[0]!, null)).toBeNull();
    });
  });

  describe('avgWindFor', () => {
    const windTable = {
      '2': {
        '20': 11.4
      },
      '0': {
        '0': 0.0
      }
    };

    it('returns measured average from wind lookup table', () => {
      const avg = avgWindFor(sampleMaps[0]!, windTable);
      expect(avg).toBe(11.4);
    });

    it('returns null when entry is missing from table', () => {
      const mapUnknownWind: MapRecord = {
        ...sampleMaps[0]!,
        wind: { min: 5, max: 15 }
      };
      expect(avgWindFor(mapUnknownWind, windTable)).toBeNull();
    });

    it('returns null when wind table is null or undefined', () => {
      expect(avgWindFor(sampleMaps[0]!, null)).toBeNull();
      expect(avgWindFor(sampleMaps[0]!, undefined)).toBeNull();
    });

    it('NEVER returns the arithmetic mean (min + max) / 2', () => {
      const map: MapRecord = {
        ...sampleMaps[0]!,
        wind: { min: 4, max: 20 } // arithmetic mean would be 12
      };
      // Not in windTable -> must return null, not 12
      expect(avgWindFor(map, windTable)).toBeNull();
    });
  });

  describe('Committed data/maps/maps.json invariants', () => {
    const mapsFile = MapsFileSchema.parse(mapsData);

    it('validates strictly against MapsFileSchema', () => {
      expect(mapsFile.schemaVersion).toBe(1);
      expect(mapsFile.source).toBe('api.bar-rts.com/maps');
      expect(mapsFile.maps.length).toBeGreaterThanOrEqual(500);
    });

    it('is sorted alphabetically by fileName', () => {
      for (let i = 0; i < mapsFile.maps.length - 1; i++) {
        const a = mapsFile.maps[i]!.fileName;
        const b = mapsFile.maps[i + 1]!.fileName;
        expect(a.localeCompare(b)).toBeLessThanOrEqual(0);
      }
    });

    it('has popularity populated for the top maps', () => {
      const withPopularity = mapsFile.maps.filter((m) => m.popularity !== null);
      expect(withPopularity.length).toBeGreaterThan(0);

      // Verify rank 1 exists
      const rank1 = withPopularity.find((m) => m.popularity?.rank === 1);
      expect(rank1).toBeDefined();
      expect(rank1?.popularity?.replays30d).toBeGreaterThan(0);
    });
  });
});
