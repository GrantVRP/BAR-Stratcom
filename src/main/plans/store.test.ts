import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlanStore } from './store';
import type { BuildPlan } from '../../core/schemas';

const samplePlan: BuildPlan = {
  schemaVersion: 1,
  id: 'test-custom-plan',
  title: 'Custom Test Plan',
  factionId: 'armada',
  gameVersion: 'test-31479-433a460',
  modes: ['1v1'],
  role: 'front',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'solar',
  source: {
    kind: 'manual',
    createdAt: '2026-10-02T10:00:00Z'
  },
  steps: [
    {
      id: 'step-1',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armmex',
      count: 1,
      targetTime: 10
    }
  ]
};

describe('PlanStore', () => {
  let tmpUserDir: string;
  let tmpBundledDir: string;
  let store: PlanStore;

  beforeEach(() => {
    tmpUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-plans-user-'));
    tmpBundledDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-plans-bundle-'));
    store = new PlanStore({
      userDataDir: tmpUserDir,
      bundledDir: tmpBundledDir
    });
  });

  afterEach(() => {
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
    fs.rmSync(tmpBundledDir, { recursive: true, force: true });
  });

  it('lists bundled plans', () => {
    const bundledPlan: BuildPlan = {
      ...samplePlan,
      id: 'bundled-plan-1',
      title: 'Bundled Plan 1',
      source: {
        kind: 'curated',
        replayId: 'rep1',
        player: 'Pro',
        map: 'Red River',
        playedAt: '2026-10-01T00:00:00Z',
        gameVersion: '1.0',
        reviewedBy: 'Curator',
        reviewedAt: '2026-10-02T00:00:00Z'
      }
    };
    fs.writeFileSync(
      path.join(tmpBundledDir, 'bundled-plan-1.json'),
      JSON.stringify(bundledPlan),
      'utf-8'
    );

    const plans = store.list();
    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe('bundled-plan-1');
  });

  it('saves and retrieves a user plan', () => {
    const saved = store.save(samplePlan);
    expect(saved.id).toBe(samplePlan.id);

    const retrieved = store.get(samplePlan.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe(samplePlan.title);

    const all = store.list();
    expect(all.some((p) => p.id === samplePlan.id)).toBe(true);
  });

  it('prevents deleting a bundled curated plan', () => {
    const bundledPlan: BuildPlan = {
      ...samplePlan,
      id: 'curated-readonly',
      source: {
        kind: 'curated',
        replayId: 'rep1',
        player: 'Pro',
        map: 'Red River',
        playedAt: '2026-10-01T00:00:00Z',
        gameVersion: '1.0',
        reviewedBy: 'Curator',
        reviewedAt: '2026-10-02T00:00:00Z'
      }
    };
    fs.writeFileSync(
      path.join(tmpBundledDir, 'curated-readonly.json'),
      JSON.stringify(bundledPlan),
      'utf-8'
    );

    expect(() => store.delete('curated-readonly')).toThrow(/Cannot delete bundled curated plan/);
  });

  it('deletes a user plan successfully', () => {
    store.save(samplePlan);
    expect(store.get(samplePlan.id)).not.toBeNull();

    const res = store.delete(samplePlan.id);
    expect(res.ok).toBe(true);
    expect(store.get(samplePlan.id)).toBeNull();
  });

  it('exports and imports a plan via share code', () => {
    store.save(samplePlan);
    const { shareCode, discordText } = store.export(samplePlan.id);
    expect(shareCode.startsWith('BSC1.')).toBe(true);
    expect(discordText).toBeDefined();

    // Delete before import so it doesn't collide
    store.delete(samplePlan.id);
    const imported = store.import(shareCode);
    expect(imported.id).toBe(samplePlan.id);
    expect(imported.title).toBe(samplePlan.title);

    // Second import now collides and receives a regenerated ID
    const colliding = store.import(shareCode);
    expect(colliding.id).not.toBe(samplePlan.id);
    expect(colliding.title).toBe(samplePlan.title);
  });

  it('discovers sample plans in bundled subdirectories', () => {
    const samplesSubdir = path.join(tmpBundledDir, 'samples');
    fs.mkdirSync(samplesSubdir, { recursive: true });
    const sampleSubPlan: BuildPlan = {
      ...samplePlan,
      id: 'sample-sub-1',
      title: 'Sample Sub Plan',
      source: {
        kind: 'own-game',
        sessionId: 'session-1',
        map: 'BarR 1.1',
        capturedAt: '2026-10-01T00:00:00Z'
      }
    };
    fs.writeFileSync(
      path.join(samplesSubdir, 'sample-sub-1.json'),
      JSON.stringify(sampleSubPlan),
      'utf-8'
    );

    const plans = store.list();
    expect(plans.some((p) => p.id === 'sample-sub-1')).toBe(true);

    const found = store.get('sample-sub-1');
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Sample Sub Plan');
  });

  it('does not list unreviewed candidates in "_" folders such as _candidates (T08.3)', () => {
    const candidates = path.join(tmpBundledDir, '_candidates');
    fs.mkdirSync(candidates, { recursive: true });
    fs.writeFileSync(path.join(candidates, 'cand-1.json'), JSON.stringify({ ...samplePlan, id: 'cand-1' }), 'utf-8');

    expect(store.list().some((p) => p.id === 'cand-1')).toBe(false);
    expect(store.get('cand-1')).toBeNull();
  });
});
