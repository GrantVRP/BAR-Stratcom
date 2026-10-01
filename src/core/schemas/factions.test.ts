import { describe, expect, it } from 'vitest';
import { FactionSchema, FactionsFileSchema } from './factions';

describe('factions schemas', () => {
  const validFaction = {
    id: 'arm',
    displayName: 'Armada',
    unitPrefix: 'arm',
    enabled: true,
    accent: '#449bed',
    commanderIds: ['armcom']
  };

  it('accepts valid faction', () => {
    expect(FactionSchema.parse(validFaction)).toEqual(validFaction);
  });

  it('rejects invalid faction records', () => {
    const invalidCases: Array<{ name: string; value: unknown; path: string }> = [
      { name: 'missing id', value: { ...validFaction, id: undefined }, path: 'id' },
      {
        name: 'missing displayName',
        value: { ...validFaction, displayName: undefined },
        path: 'displayName'
      },
      { name: 'missing enabled', value: { ...validFaction, enabled: undefined }, path: 'enabled' },
      { name: 'extra property', value: { ...validFaction, extra: 123 }, path: 'extra' },
      {
        name: 'wrong commanderIds type',
        value: { ...validFaction, commanderIds: 'armcom' },
        path: 'commanderIds'
      }
    ];

    for (const testCase of invalidCases) {
      const result = FactionSchema.safeParse(testCase.value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes(testCase.path) ||
              ((issue as { keys?: string[] }).keys?.includes(testCase.path) ?? false)
          )
        ).toBe(true);
      }
    }
  });

  it('accepts valid factions file', () => {
    const validFile = {
      schemaVersion: 1,
      factions: [validFaction]
    };
    expect(FactionsFileSchema.parse(validFile)).toEqual(validFile);
  });

  it('rejects invalid factions file', () => {
    const invalidCases = [
      { schemaVersion: 2, factions: [validFaction] },
      { schemaVersion: 1, factions: 'not-an-array' },
      { schemaVersion: 1, factions: [], extra: true }
    ];
    for (const invalid of invalidCases) {
      expect(FactionsFileSchema.safeParse(invalid).success).toBe(false);
    }
  });
});
