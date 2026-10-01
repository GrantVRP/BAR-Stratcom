import { describe, expect, it } from 'vitest';
import { ProfileSchema, ProvenanceSchema, SchemaVersionSchema } from './common';

describe('common schemas', () => {
  describe('SchemaVersionSchema', () => {
    it('accepts literal 1', () => {
      expect(SchemaVersionSchema.parse(1)).toBe(1);
    });

    it('rejects invalid versions', () => {
      expect(() => SchemaVersionSchema.parse(2)).toThrow();
      expect(() => SchemaVersionSchema.parse('1')).toThrow();
    });
  });

  describe('ProvenanceSchema', () => {
    it('accepts valid provenances', () => {
      const valid = ['measured', 'simulated', 'estimated', 'ai-draft', 'unknown'];
      for (const val of valid) {
        expect(ProvenanceSchema.parse(val)).toBe(val);
      }
    });

    it('rejects invalid provenances', () => {
      expect(() => ProvenanceSchema.parse('invalid')).toThrow();
    });
  });

  describe('ProfileSchema', () => {
    it('accepts beginner, intermediate, advanced', () => {
      expect(ProfileSchema.parse('beginner')).toBe('beginner');
      expect(ProfileSchema.parse('intermediate')).toBe('intermediate');
      expect(ProfileSchema.parse('advanced')).toBe('advanced');
    });

    it('rejects invalid profile', () => {
      expect(() => ProfileSchema.parse('expert')).toThrow();
    });
  });
});
