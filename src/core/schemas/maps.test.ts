import { describe, expect, it } from 'vitest';
import { AvgWindFileSchema, MapNotesFileSchema, MapRecordSchema, MapsFileSchema } from './maps';

describe('maps schemas', () => {
  const validMapRecord = {
    fileName: 'supreme_isthmus_v2.1',
    scriptName: 'Supreme Isthmus v2.1',
    name: 'Supreme Isthmus',
    author: 'Beherith',
    sizeX: 16,
    sizeZ: 16,
    wind: { min: 2, max: 18 },
    tidalStrength: 15,
    maxMetal: 2.2,
    extractorRadius: 60,
    gravity: 130,
    startPositions: [{ x: 1000, z: 2000 }],
    hasWater: true,
    popularity: { replays30d: 420, rank: 1 },
    mexYield: { value: 2.0, provenance: 'measured' as const }
  };

  it('accepts valid map record', () => {
    expect(MapRecordSchema.parse(validMapRecord)).toEqual(validMapRecord);
    const withNulls = {
      ...validMapRecord,
      author: null,
      popularity: null,
      mexYield: null
    };
    expect(MapRecordSchema.parse(withNulls)).toEqual(withNulls);
  });

  it('rejects invalid map records', () => {
    const invalidCases: Array<{ name: string; value: unknown; path: string }> = [
      { name: 'missing fileName', value: { ...validMapRecord, fileName: undefined }, path: 'fileName' },
      { name: 'missing wind', value: { ...validMapRecord, wind: undefined }, path: 'wind' },
      {
        name: 'invalid mexYield provenance',
        value: { ...validMapRecord, mexYield: { value: 1, provenance: 'guess' } },
        path: 'provenance'
      },
      { name: 'extra property', value: { ...validMapRecord, extraField: 'fail' }, path: 'extraField' }
    ];

    for (const testCase of invalidCases) {
      const res = MapRecordSchema.safeParse(testCase.value);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(
          res.error.issues.some(
            (issue) =>
              issue.path.includes(testCase.path) ||
              ((issue as { keys?: string[] }).keys?.includes(testCase.path) ?? false)
          )
        ).toBe(true);
      }
    }
  });

  it('accepts valid maps file', () => {
    const validFile = {
      schemaVersion: 1,
      fetchedAt: '2026-10-01T00:00:00Z',
      source: 'api.bar-rts.com/maps' as const,
      maps: [validMapRecord]
    };
    expect(MapsFileSchema.parse(validFile)).toEqual(validFile);
  });

  it('rejects invalid maps file', () => {
    expect(
      MapsFileSchema.safeParse({
        schemaVersion: 1,
        fetchedAt: '2026-10-01T00:00:00Z',
        source: 'other-source',
        maps: []
      }).success
    ).toBe(false);
  });

  it('accepts valid map notes file', () => {
    const validNotes = {
      schemaVersion: 1,
      fileName: 'supreme_isthmus_v2.1',
      notes: [
        {
          text: 'Hold the geo spot early.',
          source: { kind: 'guide' as const, ref: 'https://bar-rts.com/guides/isthmus' },
          addedAt: '2026-10-01T00:00:00Z'
        }
      ]
    };
    expect(MapNotesFileSchema.parse(validNotes)).toEqual(validNotes);
  });

  it('rejects invalid map notes file', () => {
    expect(
      MapNotesFileSchema.safeParse({
        schemaVersion: 1,
        fileName: 'isthmus',
        notes: [{ text: 'note', source: { kind: 'unknown', ref: 'x' }, addedAt: '2026' }]
      }).success
    ).toBe(false);
  });

  it('accepts valid avg wind file', () => {
    const validWind = {
      schemaVersion: 1,
      gameVersion: '105.1.1-2550',
      table: {
        '2': { '18': 9.5 }
      }
    };
    expect(AvgWindFileSchema.parse(validWind)).toEqual(validWind);
  });

  it('rejects invalid avg wind file', () => {
    expect(
      AvgWindFileSchema.safeParse({
        schemaVersion: 1,
        gameVersion: 123,
        table: {}
      }).success
    ).toBe(false);
  });
});
