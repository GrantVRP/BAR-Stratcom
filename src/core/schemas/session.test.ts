import { describe, expect, it } from 'vitest';
import {
  SessionMetaSchema,
  SessionModeSchema,
  SessionStartResSchema,
  SessionTeamMemberSchema
} from './session';

describe('session schemas', () => {
  const validMember = {
    teamId: 0,
    allyTeamId: 0,
    playerName: 'Player',
    factionId: 'arm',
    isMe: true
  };

  const validStartRes = {
    metal: 1000,
    energy: 1000,
    metalStorage: 1000,
    energyStorage: 1000
  };

  const validSessionMeta = {
    schemaVersion: 1,
    sessionId: '2026-10-04-arm-1v1-test',
    mode: 'player' as const,
    gameVersion: '105.1.1-2550',
    engineVersion: '2026.01.1',
    mapScriptName: 'Supreme Isthmus v2.1',
    durationSec: 620,
    startedAt: '2026-10-04T18:00:00Z',
    teams: [validMember],
    start: validStartRes,
    planId: 'armada-1v1-bot-rocketeer-01',
    source: 'live' as const,
    anonymized: false,
    replay: {
      replayId: 'rep-999',
      url: 'https://bar-rts.com/replays/999'
    }
  };

  describe('SessionModeSchema', () => {
    it('accepts player, spectator, replay', () => {
      expect(SessionModeSchema.parse('player')).toBe('player');
      expect(SessionModeSchema.parse('spectator')).toBe('spectator');
      expect(SessionModeSchema.parse('replay')).toBe('replay');
    });

    it('rejects invalid mode', () => {
      expect(SessionModeSchema.safeParse('demo').success).toBe(false);
    });
  });

  describe('SessionTeamMemberSchema', () => {
    it('accepts valid member', () => {
      expect(SessionTeamMemberSchema.parse(validMember)).toEqual(validMember);
      const withNullFaction = { ...validMember, factionId: null };
      expect(SessionTeamMemberSchema.parse(withNullFaction).factionId).toBeNull();
    });

    it('rejects invalid member', () => {
      expect(SessionTeamMemberSchema.safeParse({ ...validMember, teamId: 'zero' }).success).toBe(false);
      expect(SessionTeamMemberSchema.safeParse({ ...validMember, isMe: 'yes' }).success).toBe(false);
    });
  });

  describe('SessionStartResSchema', () => {
    it('accepts valid start res', () => {
      expect(SessionStartResSchema.parse(validStartRes)).toEqual(validStartRes);
    });
  });

  describe('SessionMetaSchema', () => {
    it('accepts valid session meta', () => {
      expect(SessionMetaSchema.parse(validSessionMeta)).toEqual(validSessionMeta);
    });

    it('accepts null start and omitted optional fields', () => {
      const minimalSession = {
        schemaVersion: 1,
        sessionId: '2026-10-04-fixture',
        mode: 'replay' as const,
        gameVersion: '105.1.1',
        engineVersion: '2026.01',
        mapScriptName: 'Isthmus',
        durationSec: 300,
        startedAt: '2026-10-04T18:00:00Z',
        teams: [validMember],
        start: null,
        source: 'fixture' as const,
        anonymized: true
      };
      expect(SessionMetaSchema.parse(minimalSession)).toEqual(minimalSession);
    });

    it('accepts optional notes string in session meta', () => {
      const withNotes = { ...validSessionMeta, notes: 'repaired factionId; owner game vs AI' };
      expect(SessionMetaSchema.parse(withNotes).notes).toBe('repaired factionId; owner game vs AI');
    });

    it('rejects invalid session meta', () => {
      expect(SessionMetaSchema.safeParse({ ...validSessionMeta, schemaVersion: 2 }).success).toBe(false);
      expect(SessionMetaSchema.safeParse({ ...validSessionMeta, source: 'unknown' }).success).toBe(false);
      expect(SessionMetaSchema.safeParse({ ...validSessionMeta, extraField: 123 }).success).toBe(false);
    });
  });
});
