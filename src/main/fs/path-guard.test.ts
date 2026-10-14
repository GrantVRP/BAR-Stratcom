import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BuildPlan } from '../../core/schemas';
import { PlanStore } from '../plans/store';
import { insideRoot, isSafeName, namedFile, PathGuardError } from './path-guard';

describe('path guard', () => {
  it('accepts plain names only', () => {
    for (const ok of ['user-1abc', 'pro-armada-bot-isidis-crack-41f195-t1', '20261004-181322-eb04', 'a.json', 'Plan 1']) expect(isSafeName(ok), ok).toBe(true);
    for (const bad of ['', '.', '..', '../x', 'a/b', 'a\b', '.hidden', 'x..y', 'C:', `a${'b'.repeat(200)}`]) expect(isSafeName(bad), bad).toBe(false);
  });

  it('keeps joined paths inside their root', () => {
    const root = path.join(os.tmpdir(), 'guard-root');
    expect(insideRoot(root, 'a', 'b.json')).toBe(path.join(root, 'a', 'b.json'));
    expect(() => insideRoot(root, '..', 'x')).toThrow(PathGuardError);
    expect(() => insideRoot(root, path.resolve('/'))).toThrow(PathGuardError);
    expect(() => insideRoot(root)).toThrow(PathGuardError);
    expect(namedFile(root, 'plan-1', '.json')).toBe(path.join(root, 'plan-1.json'));
    expect(() => namedFile(root, '../../evil', '.json')).toThrow('Not a valid name');
  });
});

describe('plan store refuses ids that would leave its folder', () => {
  let dir: string;
  let store: PlanStore;
  const plan = (id: string): BuildPlan => ({
    schemaVersion: 1, id, title: 'T', factionId: 'armada', gameVersion: 'test', modes: ['1v1'], role: 'any', skill: 'beginner',
    opening: 'bot', energyStyle: 'wind', source: { kind: 'manual', createdAt: '2026-10-05' },
    steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 1 }]
  });
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-plans-'));
    store = new PlanStore({ userDataDir: path.join(dir, 'plans'), bundledDir: path.join(dir, 'bundled') });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('saves a normal id, refuses traversal on save and delete, reads nothing for it', () => {
    expect(store.save(plan('user-1')).id).toBe('user-1');
    expect(() => store.save(plan('../escaped'))).toThrow(PathGuardError);
    expect(fs.existsSync(path.join(dir, 'escaped.json'))).toBe(false);
    fs.writeFileSync(path.join(dir, 'outside.json'), JSON.stringify(plan('outside')));
    expect(store.get('../outside')).toBeNull();
    expect(() => store.delete('../outside')).toThrow(PathGuardError);
    expect(fs.existsSync(path.join(dir, 'outside.json'))).toBe(true);
  });
});
