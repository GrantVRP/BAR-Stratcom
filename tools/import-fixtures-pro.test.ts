import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionMetaSchema } from '../src/core/schemas/session';
import { importFixtures, type UnmatchedSession } from './import-fixtures';
import type { ProListReplay } from './lib/pro-match';

// Raw files shaped like the H2 recordings in data/raw/h2 (replay mode: me/res null, per-team res).
function teamState(teamId: number, allyTeamId: number, playerName: string, factionId: string): object {
  const pool = { share: 0.99, current: 1000, storage: 1000, received: 0, pull: 0, expense: 0, sent: 0, income: 0 };
  return { bp: { active: 0, total: 300 }, factionId, playerName, allyTeamId, res: { energy: pool, metal: pool }, counts: {}, teamId };
}

function writeReplaySession(dir: string, id: string, map: string, players: Array<[string, string]>, seconds: number): void {
  const teams = players.map(([playerName, factionId], i) => ({ isAI: false, factionId, allyTeamId: i, isMe: false, playerName, teamId: i }));
  fs.writeFileSync(
    path.join(dir, `session-${id}.json`),
    JSON.stringify({ map: { windMin: 2, scriptName: map, tidal: 15, windMax: 20 }, gameVersion: 'test-1-abc', protocol: 1, sessionId: id, teams, start: null, kind: 'session', engineVersion: '2026.07.04', mode: 'replay' })
  );
  const com = (i: number): string => (players[i]![1] === 'armada' ? 'armcom' : 'corcom');
  const events = players.flatMap((_, i) => [
    { tm: i, e: 'created', d: com(i), u: 100 + i, f: 0 },
    { tm: i, bd: com(i), b: 100 + i, e: 'created', d: com(i).replace('com', 'mex'), u: 200 + i, f: 105 }
  ]);
  fs.writeFileSync(path.join(dir, `events-${id}.ndjson`), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
  const docs = [];
  for (let sec = 0; sec <= seconds; sec += 5) {
    docs.push({
      gameSeconds: sec, protocol: 1, commander: { alive: false, idle: false }, sessionId: id, res: null, me: null, enemies: [], counts: [],
      factories: { idle: 0, total: 0 }, teams: players.map(([n, f], i) => teamState(i, i, n, f)),
      builders: { idle: 0, total: 0 }, bp: { active: 0, total: 0 }, frame: sec * 30, seq: sec / 5 + 1, wind: { current: 9 }
    });
  }
  fs.writeFileSync(path.join(dir, `state-${id}.ndjson`), docs.map((d) => JSON.stringify(d)).join('\n') + '\n');
}

const LISTED: ProListReplay = {
  id: '0123456789abcdef0123456789abcdef',
  url: 'https://bar-rts.com/replays/0123456789abcdef0123456789abcdef',
  date: '2026-09-27',
  mode: '1v1',
  modeDetail: '1v1',
  map: { scriptName: 'Test Crack 1.1', fileName: 'test_crack_1.1' },
  gameVersion: 'Beyond All Reason test-1-abc',
  durationSec: 1300,
  meanSkill: 50,
  players: [
    { name: 'ProOne', faction: 'Cortex', skill: 55, allyTeam: 0 },
    { name: 'ProTwo', faction: 'Armada', skill: 45, allyTeam: 1 }
  ]
};

describe('importFixtures pro list (T08.3)', () => {
  let from: string;
  let to: string;
  beforeEach(() => {
    from = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-pro-'));
    to = fs.mkdtempSync(path.join(os.tmpdir(), 'fixtures-pro-'));
  });
  afterEach(() => {
    fs.rmSync(from, { recursive: true, force: true });
    fs.rmSync(to, { recursive: true, force: true });
  });

  it('imports matched replays as pro fixtures with their replay link, and reports the rest', async () => {
    writeReplaySession(from, '20261004-190859-e7a2', 'Test Crack 1.1', [['ProOne', 'cortex'], ['ProTwo', 'armada']], 635);
    writeReplaySession(from, '20261004-181322-eb04', 'Test Crack 1.1', [['Someone', 'armada'], ['Else', 'armada']], 635);
    const unmatched: UnmatchedSession[] = [];

    const imported = await importFixtures({ fromDir: from, toDir: to, ownerName: 'Owner_X', proList: [LISTED], unmatched });

    expect(imported).toEqual(['2026-09-27-multi-1v1-pro-test-crack-012345']);
    const meta = SessionMetaSchema.parse(JSON.parse(fs.readFileSync(path.join(to, imported[0]!, 'meta.json'), 'utf-8')));
    expect(meta.replay).toEqual({ replayId: LISTED.id, url: LISTED.url });
    expect(meta.teams.map((t) => t.playerName)).toEqual(['ProOne', 'ProTwo']);
    expect(meta.notes).toContain(`pro replay ${LISTED.id} (matched by players)`);
    expect(meta.notes).not.toContain('may be unreliable');
    expect(unmatched).toEqual([{ sessionId: '20261004-181322-eb04', map: 'Test Crack 1.1', players: ['Someone', 'Else'] }]);
  });

  it('never imports own (player-mode) games or replays shorter than 10 minutes as pro games', async () => {
    writeReplaySession(from, '20261004-200000-aaaa', 'Test Crack 1.1', [['ProOne', 'cortex'], ['ProTwo', 'armada']], 590);
    const own = path.join(from, 'session-20261004-210000-bbbb.json');
    writeReplaySession(from, '20261004-210000-bbbb', 'Test Crack 1.1', [['ProOne', 'cortex'], ['ProTwo', 'armada']], 635);
    fs.writeFileSync(own, fs.readFileSync(own, 'utf-8').replace('"mode":"replay"', '"mode":"player"'));

    const imported = await importFixtures({ fromDir: from, toDir: to, ownerName: 'Owner_X', proList: [LISTED], unmatched: [] });
    expect(imported).toEqual([]);
  });
});
