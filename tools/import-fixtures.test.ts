import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { StateDocSchema, WidgetEventSchema, type StateDoc } from '../src/core/schemas/protocol';
import { SessionMetaSchema } from '../src/core/schemas/session';
import { importFixtures } from './import-fixtures';
import {
  deriveFactionFromDef,
  extractTeamCommanders,
  getMapSlug,
  repairAndAnonymizeSessionTeams,
  repairStateDoc,
  type RawSessionFile
} from './lib/fixture-repair';
import { readStateLines } from './lib/state-reader';

describe('fixture-repair unit functions', () => {
  it('derives faction from unit def prefix', () => {
    expect(deriveFactionFromDef('armcom')).toBe('armada');
    expect(deriveFactionFromDef('armpw')).toBe('armada');
    expect(deriveFactionFromDef('corcom')).toBe('cortex');
    expect(deriveFactionFromDef('corak')).toBe('cortex');
    expect(deriveFactionFromDef('legcom')).toBe('legion');
    expect(deriveFactionFromDef('unknown')).toBeNull();
  });

  it('extracts team commanders from events', () => {
    const events = [
      { f: 0, e: 'created', tm: 0, d: 'armcom', u: 100 },
      { f: 0, e: 'created', tm: 1, d: 'corcom', u: 101 },
      { f: 120, e: 'created', tm: 0, d: 'armmex', u: 102 }
    ];
    const commanders = extractTeamCommanders(events);
    expect(commanders.get(0)).toEqual({ commanderDef: 'armcom', factionId: 'armada' });
    expect(commanders.get(1)).toEqual({ commanderDef: 'corcom', factionId: 'cortex' });
    expect(commanders.has(2)).toBe(false);
  });

  it('repairs AI teams named after the player before anonymising the player', () => {
    const session: RawSessionFile = {
      protocol: 1,
      kind: 'session',
      sessionId: '20261001-220000-abcd',
      mode: 'player',
      gameVersion: '105.1.1',
      engineVersion: '2026.01',
      map: { scriptName: 'BarR 1.1', windMin: 3, windMax: 19, tidal: 20 },
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'Grant_P', factionId: null, isAI: false, isMe: true },
        { teamId: 1, allyTeamId: 1, playerName: 'Grant_P', factionId: null, isAI: true, isMe: false }
      ],
      start: null
    };

    const commanders = new Map([
      [0, { commanderDef: 'corcom', factionId: 'cortex' }]
    ]);

    const result = repairAndAnonymizeSessionTeams(session, commanders, 'Grant_P');
    expect(result.repairedTeams[0]!.playerName).toBe('Player');
    expect(result.repairedTeams[0]!.factionId).toBe('cortex');
    expect(result.repairedTeams[1]!.playerName).toBe('AI');
    expect(result.notes).toContain('repaired factionId and startUnitId');
    expect(result.notes).toContain('repaired AI team playerName');
  });

  it('identifies a recorded 1v1 game of our own vs AI', () => {
    const session: RawSessionFile = {
      protocol: 1,
      kind: 'session',
      sessionId: '20261001-213812-4e99',
      mode: 'replay',
      gameVersion: '105.1.1',
      engineVersion: '2026.01',
      map: { scriptName: 'Onyx Cauldron 2.2.2', windMin: 1, windMax: 29, tidal: 20 },
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'Grant_P', factionId: null, isAI: false, isMe: false },
        { teamId: 1, allyTeamId: 1, playerName: 'Grant_P', factionId: null, isAI: true, isMe: false }
      ],
      start: null
    };

    const commanders = new Map([
      [0, { commanderDef: 'armcom', factionId: 'armada' }],
      [1, { commanderDef: 'corcom', factionId: 'cortex' }]
    ]);

    const result = repairAndAnonymizeSessionTeams(session, commanders, 'Grant_P');
    expect(result.isOwnerReplay).toBe(true);
    expect(result.notes).toContain('owner game vs AI, not a pro reference');
    expect(result.notes).toContain('widget-3.0.0 replay team names may be unreliable');

    // Also test a large team game the recording player is in
    const largeSession: RawSessionFile = {
      ...session,
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'OtherPlayer', factionId: null, isAI: false, isMe: false },
        { teamId: 1, allyTeamId: 1, playerName: 'Grant_P', factionId: null, isAI: false, isMe: false },
        { teamId: 2, allyTeamId: 0, playerName: 'AI_1', factionId: null, isAI: true, isMe: false },
        { teamId: 3, allyTeamId: 1, playerName: 'AI_2', factionId: null, isAI: true, isMe: false }
      ]
    };
    const largeResult = repairAndAnonymizeSessionTeams(largeSession, commanders, 'Grant_P');
    expect(largeResult.isOwnerReplay).toBe(true);
    expect(largeResult.notes).toContain('owner game vs AI, not a pro reference');
  });

  it('repairs state doc me and teams', () => {
    const rawState = {
      protocol: 1 as const,
      sessionId: 'orig',
      seq: 1,
      frame: 0,
      gameSeconds: 0,
      wind: { current: 10 },
      res: null,
      me: { teamId: 0, allyTeamId: 0, factionId: null, startUnitId: 303 as unknown as string, playerName: 'Grant_P' },
      counts: [],
      builders: { total: 0, idle: 0 },
      factories: { total: 0, idle: 0 },
      commander: { alive: true, idle: true },
      bp: { total: 300, active: 0 },
      enemies: []
    };
    const session: RawSessionFile = {
      protocol: 1,
      kind: 'session',
      sessionId: 'orig',
      mode: 'player',
      gameVersion: '105.1.1',
      engineVersion: '2026.01',
      map: { scriptName: 'BarR 1.1', windMin: 3, windMax: 19, tidal: 20 },
      teams: [
        { teamId: 0, allyTeamId: 0, playerName: 'Grant_P', factionId: null, isAI: false, isMe: true }
      ],
      start: null
    };
    const commanders = new Map([[0, { commanderDef: 'corcom', factionId: 'cortex' }]]);
    const repaired = repairStateDoc(rawState as unknown as StateDoc, 'fixture-1', session, commanders, 'Grant_P');
    expect(repaired.sessionId).toBe('fixture-1');
    expect(repaired.me?.playerName).toBe('Player');
    expect(repaired.me?.factionId).toBe('cortex');
    expect(repaired.me?.startUnitId).toBe('corcom');
    expect(repaired.counts).toEqual({});
    expect(repaired.enemies).toEqual({});
  });

  it('derives clean map slugs', () => {
    expect(getMapSlug('BarR 1.1')).toBe('barr');
    expect(getMapSlug('Onyx Cauldron 2.2.2')).toBe('onyx');
    expect(getMapSlug('Altair_Crossing_V4.1')).toBe('altair');
    expect(getMapSlug('DWorld_V4')).toBe('dworld');
    expect(getMapSlug('Why did I let PtaQ talk me into this 1.0')).toBe('ptaq');
    expect(getMapSlug('Mediterraneum_V1')).toBe('mediterraneum');
    expect(getMapSlug('Supreme Isthmus v1.7')).toBe('isthmus');
  });

  it('never leaves a dash at either end of a map slug (pro maps "Cape_Violet_V1", "Ditched_V1")', () => {
    expect(getMapSlug('Cape_Violet_V1')).toBe('cape-violet');
    expect(getMapSlug('Ditched_V1')).toBe('ditched');
    expect(getMapSlug('_Isidis crack 1.1')).toBe('isidis-crack');
  });
});

describe('importFixtures integration', () => {
  it('skips short sessions and normalizes valid sessions into fixtures', async () => {
    const tmpFrom = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-'));
    const tmpTo = fs.mkdtempSync(path.join(os.tmpdir(), 'fixtures-'));

    try {
      // 1. Short player session (<360s) -> should be skipped
      const shortId = '20261001-100000-0001';
      fs.writeFileSync(
        path.join(tmpFrom, `session-${shortId}.json`),
        JSON.stringify({
          protocol: 1,
          kind: 'session',
          sessionId: shortId,
          mode: 'player',
          gameVersion: '105.1.1',
          engineVersion: '2026.01',
          map: { scriptName: 'BarR 1.1', windMin: 3, windMax: 19, tidal: 20 },
          teams: [
            { teamId: 0, allyTeamId: 0, playerName: 'Grant_P', factionId: null, isAI: false, isMe: true }
          ],
          start: null
        })
      );
      fs.writeFileSync(
        path.join(tmpFrom, `events-${shortId}.ndjson`),
        JSON.stringify({ f: 0, e: 'gamestart' }) + '\n' +
        JSON.stringify({ f: 300, e: 'created', tm: 0, d: 'corcom', u: 1 }) + '\n'
      );
      fs.writeFileSync(
        path.join(tmpFrom, `state-${shortId}.ndjson`),
        JSON.stringify({
          protocol: 1,
          sessionId: shortId,
          seq: 1,
          frame: 300,
          gameSeconds: 10,
          wind: { current: 10 },
          res: null,
          me: { teamId: 0, allyTeamId: 0, factionId: null, startUnitId: 303, playerName: 'Grant_P' },
          counts: [],
          builders: { total: 0, idle: 0 },
          factories: { total: 0, idle: 0 },
          commander: { alive: true, idle: true },
          bp: { total: 300, active: 0 },
          enemies: []
        }) + '\n'
      );

      // 2. Valid player session (>360s) -> should be imported
      const validId = '20261001-110000-0002';
      fs.writeFileSync(
        path.join(tmpFrom, `session-${validId}.json`),
        JSON.stringify({
          protocol: 1,
          kind: 'session',
          sessionId: validId,
          mode: 'player',
          gameVersion: '105.1.1',
          engineVersion: '2026.01',
          map: { scriptName: 'BarR 1.1', windMin: 3, windMax: 19, tidal: 20 },
          teams: [
            { teamId: 0, allyTeamId: 0, playerName: 'Grant_P', factionId: null, isAI: false, isMe: true },
            { teamId: 1, allyTeamId: 1, playerName: 'Grant_P', factionId: null, isAI: true, isMe: false }
          ],
          start: { metal: 1000, energy: 1000, metalStorage: 1000, energyStorage: 1000 }
        })
      );
      fs.writeFileSync(
        path.join(tmpFrom, `events-${validId}.ndjson`),
        JSON.stringify({ f: 0, e: 'created', tm: 0, d: 'corcom', u: 10 }) + '\n' +
        JSON.stringify({ f: 0, e: 'gamestart' }) + '\n' +
        JSON.stringify({ f: 12000, e: 'created', tm: 0, d: 'cormex', u: 11 }) + '\n'
      );

      const stateDocs = [];
      for (let sec = 0; sec <= 400; sec += 100) {
        stateDocs.push(
          JSON.stringify({
            protocol: 1,
            sessionId: validId,
            seq: sec / 100 + 1,
            frame: sec * 30,
            gameSeconds: sec,
            wind: { current: 12 },
            res: {
              metal: { current: 100, storage: 1000, pull: 0, income: 10, expense: 0, share: 0, sent: 0, received: 0 },
              energy: { current: 100, storage: 1000, pull: 0, income: 10, expense: 0, share: 0, sent: 0, received: 0 }
            },
            me: { teamId: 0, allyTeamId: 0, factionId: null, startUnitId: 303, playerName: 'Grant_P' },
            counts: { corcom: { alive: 1, building: 0 } },
            builders: { total: 0, idle: 0 },
            factories: { total: 0, idle: 0 },
            commander: { alive: true, idle: true },
            bp: { total: 300, active: 0 },
            enemies: []
          })
        );
      }
      fs.writeFileSync(path.join(tmpFrom, `state-${validId}.ndjson`), stateDocs.join('\n') + '\n');

      const imported = await importFixtures({
        fromDir: tmpFrom,
        toDir: tmpTo,
        ownerName: 'Grant_P'
      });

      expect(imported).toHaveLength(1);
      const fixtureId = imported[0]!;
      expect(fixtureId).toContain('2026-10-01-cortex-1v1-vs-ai-barr-400s');

      const fixtureDir = path.join(tmpTo, fixtureId);
      expect(fs.existsSync(path.join(fixtureDir, 'meta.json'))).toBe(true);
      expect(fs.existsSync(path.join(fixtureDir, 'events.ndjson'))).toBe(true);
      expect(fs.existsSync(path.join(fixtureDir, 'state.ndjson'))).toBe(true);

      const meta = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'meta.json'), 'utf-8'));
      expect(SessionMetaSchema.parse(meta)).toEqual(meta);
      expect(meta.anonymized).toBe(true);
      expect(meta.teams[0].playerName).toBe('Player');
      expect(meta.teams[0].factionId).toBe('cortex');
      expect(meta.teams[1].playerName).toBe('AI');

      const eventLines = fs.readFileSync(path.join(fixtureDir, 'events.ndjson'), 'utf-8').trim().split('\n');
      expect(eventLines.length).toBeGreaterThan(0);
      for (const el of eventLines) {
        WidgetEventSchema.parse(JSON.parse(el));
      }

      const lines = readStateLines(fixtureDir);
      expect(lines.length).toBe(stateDocs.length);
      for (const line of lines) {
        const doc = JSON.parse(line);
        expect(StateDocSchema.parse(doc)).toEqual(doc);
        expect(doc.me.playerName).toBe('Player');
        expect(doc.me.factionId).toBe('cortex');
        expect(doc.me.startUnitId).toBe('corcom');
      }
    } finally {
      fs.rmSync(tmpFrom, { recursive: true, force: true });
      fs.rmSync(tmpTo, { recursive: true, force: true });
    }
  });
});
