import { describe, expect, it } from 'vitest';
import { AliasEntrySchema, AliasesFileSchema } from './aliases';

describe('aliases schemas', () => {
  const validAlias = {
    alias: 'Flash',
    unitId: 'armflash',
    kind: 'legacy-name' as const,
    note: 'Fast assault tank'
  };

  it('accepts valid alias entry', () => {
    expect(AliasEntrySchema.parse(validAlias)).toEqual(validAlias);
    const withoutNote = { alias: 'LLT', unitId: 'armllt', kind: 'abbreviation' as const };
    expect(AliasEntrySchema.parse(withoutNote)).toEqual(withoutNote);
  });

  it('rejects invalid alias entries', () => {
    expect(AliasEntrySchema.safeParse({ ...validAlias, kind: 'unknown' }).success).toBe(false);
    expect(AliasEntrySchema.safeParse({ ...validAlias, unitId: undefined }).success).toBe(false);
    expect(AliasEntrySchema.safeParse({ ...validAlias, extra: 1 }).success).toBe(false);
  });

  it('accepts valid aliases file', () => {
    const validFile = {
      schemaVersion: 1,
      aliases: [validAlias]
    };
    expect(AliasesFileSchema.parse(validFile)).toEqual(validFile);
  });

  it('rejects invalid aliases file', () => {
    expect(AliasesFileSchema.safeParse({ schemaVersion: 2, aliases: [] }).success).toBe(false);
    expect(AliasesFileSchema.safeParse({ schemaVersion: 1, aliases: 'none' }).success).toBe(false);
  });
});
