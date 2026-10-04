import { describe, it, expect } from 'vitest';
import aliasesData from '../../../data/aliases.json';
import factionsData from '../../../data/factions.json';
import defaultSnapshotData from '../../../data/snapshots/test-31479-433a460/units.json';
import { createRegistry } from '../registry';
import {
  AliasesFileSchema,
  FactionsFileSchema,
  UnitSnapshotSchema,
  parseReplayIdOrUrl,
  type SessionMeta
} from '../schemas';
import type { WidgetEvent } from '../schemas/protocol';
import { capturePlan, listCapturePlayers } from './capture';

const registry = createRegistry(
  UnitSnapshotSchema.parse(defaultSnapshotData),
  FactionsFileSchema.parse(factionsData),
  AliasesFileSchema.parse(aliasesData)
);

const REPLAY_ID = 'feedbeeffeedbeeffeedbeeffeedbeef';

function meta(mode: SessionMeta['mode'], extra: Partial<SessionMeta> = {}): SessionMeta {
  return {
    schemaVersion: 1,
    sessionId: 'session-capture-test',
    mode,
    gameVersion: 'test-31479-433a460',
    engineVersion: '2026.07.04',
    mapScriptName: 'Test Map 1.0',
    durationSec: 700,
    startedAt: '2026-10-03T12:00:00.000Z',
    teams: [
      { teamId: 0, allyTeamId: 0, playerName: 'TestPlayerA', factionId: 'armada', isMe: mode === 'player' },
      { teamId: 1, allyTeamId: 1, playerName: 'TestPlayerB', factionId: 'cortex', isMe: false },
      { teamId: 2, allyTeamId: 1, playerName: 'TestPlayerC', factionId: 'legion', isMe: false }
    ],
    start: null,
    source: 'live',
    anonymized: false,
    ...extra
  };
}

// Shapes mirror the real events.ndjson lines (see data/fixtures/sessions/*/events.ndjson).
const events: WidgetEvent[] = [
  { tm: 0, e: 'created', d: 'armcom', u: 1, f: 0 },
  { tm: 0, e: 'finished', d: 'armcom', u: 1, f: 0 },
  { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armmex', u: 10, f: 180 },
  { tm: 0, e: 'finished', d: 'armmex', u: 10, f: 400 },
  { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armlab', u: 11, f: 600 },
  { tm: 0, e: 'finished', d: 'armlab', u: 11, f: 1500 },
  { tm: 2, e: 'created', d: 'legcom', u: 2, f: 0 },
  { tm: 2, bd: 'legcom', b: 2, e: 'created', d: 'legmex', u: 20, f: 200 }
];

describe('listCapturePlayers (T08.2)', () => {
  it('marks players without build events or with a disabled faction as not capturable', () => {
    const players = listCapturePlayers(registry, meta('replay'), events);
    expect(players.map((p) => [p.name, p.capturable, p.reason])).toEqual([
      ['TestPlayerA', true, null],
      ['TestPlayerB', false, 'No build events recorded for this player'],
      ['TestPlayerC', false, 'Legion is not supported yet']
    ]);
    expect(players[0]).toMatchObject({ teamId: 0, faction: 'armada', allyTeam: 0, isMe: false });
  });
});

describe('capturePlan (T08.2)', () => {
  it('captures a replay player as a replay-capture plan with 0 validation errors', () => {
    const result = capturePlan({
      registry,
      meta: meta('replay'),
      events,
      teamId: 0,
      replayId: REPLAY_ID,
      capturedAt: '2026-10-03T13:00:00.000Z'
    });
    expect(result.issues.errors).toEqual([]);
    expect(result.plan.id).toBe('capture-session-capture-test-t0');
    expect(result.plan.steps.map((s) => s.unitId)).toEqual(['armmex', 'armlab']);
    expect(result.plan.source).toEqual({
      kind: 'replay-capture',
      sessionId: 'session-capture-test',
      replayId: REPLAY_ID,
      player: 'TestPlayerA',
      map: 'Test Map 1.0',
      capturedAt: '2026-10-03T13:00:00.000Z'
    });
  });

  it('falls back to the replay id stored in the session meta', () => {
    const replay = { replayId: REPLAY_ID, url: `https://bar-rts.com/replays/${REPLAY_ID}` };
    const result = capturePlan({
      registry,
      meta: meta('spectator', { replay }),
      events,
      teamId: 0,
      capturedAt: '2026-10-03T13:00:00.000Z'
    });
    expect(result.plan.source).toMatchObject({ kind: 'replay-capture', replayId: REPLAY_ID });
  });

  it('captures the player own game as an own-game plan titled with player and map', () => {
    const result = capturePlan({
      registry,
      meta: meta('player'),
      events,
      teamId: 0,
      capturedAt: '2026-10-03T13:00:00.000Z'
    });
    expect(result.plan.source.kind).toBe('own-game');
    expect(result.plan.title).toBe('TestPlayerA - Test Map 1.0');
  });

  it('rejects unknown teams, blocked players and plans without steps with a clear message', () => {
    const base = { registry, meta: meta('replay'), events, capturedAt: '2026-10-03T13:00:00.000Z' };
    expect(() => capturePlan({ ...base, teamId: 9 })).toThrow('Team 9 is not in this session');
    expect(() => capturePlan({ ...base, teamId: 1 })).toThrow('No build events recorded for this player');
    expect(() => capturePlan({ ...base, teamId: 2 })).toThrow('Legion is not supported yet');

    // A construction turret's builds are assist notes, not plan steps
    const turretOnly: WidgetEvent[] = [
      { tm: 1, e: 'created', d: 'corcom', u: 3, f: 0 },
      { tm: 1, bd: 'cornanotc', b: 40, e: 'created', d: 'corsolar', u: 41, f: 300 }
    ];
    expect(() => capturePlan({ ...base, events: turretOnly, teamId: 1 })).toThrow(
      'No build events recorded for this player in the first 10 minutes'
    );
  });
});

describe('parseReplayIdOrUrl (T08.2)', () => {
  it('accepts a bare id, a replay page link and a gameId query', () => {
    expect(parseReplayIdOrUrl(REPLAY_ID.toUpperCase())).toBe(REPLAY_ID);
    expect(parseReplayIdOrUrl(` https://bar-rts.com/replays/${REPLAY_ID} `)).toBe(REPLAY_ID);
    expect(parseReplayIdOrUrl(`https://www.beyondallreason.info/replays?gameId=${REPLAY_ID}`)).toBe(REPLAY_ID);
  });

  it('returns undefined for empty input and null for anything that is not a replay id', () => {
    expect(parseReplayIdOrUrl(undefined)).toBeUndefined();
    expect(parseReplayIdOrUrl('   ')).toBeUndefined();
    expect(parseReplayIdOrUrl('feedbeef1234')).toBeNull();
    expect(parseReplayIdOrUrl('https://bar-rts.com/replays/not-an-id')).toBeNull();
    expect(parseReplayIdOrUrl('hello world')).toBeNull();
  });
});
