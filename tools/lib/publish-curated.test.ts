import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BuildPlanSchema, type BuildPlan, type MapRecord } from '../../src/core/schemas';
import { MIN_APPROVED, publishCurated, type PublishOptions } from './publish-curated';
import { registryLoader } from './registry-for';

const registryFor = registryLoader();
const MAP: MapRecord = {
  fileName: 'test_map_1.0', scriptName: 'Test Map 1.0', name: 'Test Map', author: null, sizeX: 12, sizeZ: 12,
  wind: { min: 5, max: 15 }, tidalStrength: 0, maxMetal: 2, extractorRadius: 90, gravity: 120, startPositions: [], hasWater: false, popularity: null, mexYield: null
};

/** A synthetic candidate (test-only names) built from real unit ids. */
function candidate(i: number): BuildPlan {
  const com = { kind: 'commander' } as const;
  const lab = { kind: 'factory', unitId: 'armlab', index: 1 } as const;
  return {
    schemaVersion: 1,
    id: `pro-armada-bot-test-map-${String(i).padStart(6, '0')}-t0`,
    title: `Bot wind // Test ${i}`,
    factionId: 'armada',
    gameVersion: 'test-31479-433a460',
    modes: ['1v1'],
    role: 'any',
    skill: 'advanced',
    opening: 'bot',
    energyStyle: 'wind',
    source: { kind: 'curated', replayId: `${String(i).padStart(2, '0')}23abcd0123abcd0123abcd0123abcd`, player: `TestPro${i}`, map: 'Test Map 1.0', playedAt: '2026-09-12', gameVersion: 'test-31479-433a460', reviewedBy: '', reviewedAt: '' },
    steps: [
      { id: 's1', actor: com, action: 'build', unitId: 'armmex', count: 2, targetTime: 3 },
      { id: 's2', actor: com, action: 'build', unitId: 'armwin', count: 2, targetTime: 15 },
      { id: 's3', actor: com, action: 'build', unitId: 'armlab', count: 1, targetTime: 30 },
      { id: 's4', actor: lab, action: 'build', unitId: 'armck', count: 1, targetTime: 50 },
      { id: 's5', actor: lab, action: 'build', unitId: 'armpw', count: 3, targetTime: 60 }
    ]
  };
}

function sheet(decisions: string[]): string {
  return ['# Curated candidates', ...decisions.map((d, i) => `### ${i + 1}. Test ${i}\n\n- Plan: \`${candidate(i).id}\` · Armada · 1v1\n\nDECISION: ${d}\n`)].join('\n\n');
}

describe('publish curated library', () => {
  let dir: string;
  let opts: PublishOptions;
  const setup = (decisions: string[]): void => {
    fs.mkdirSync(path.join(dir, '_candidates'), { recursive: true });
    decisions.forEach((_, i) => fs.writeFileSync(path.join(dir, '_candidates', `${candidate(i).id}.json`), JSON.stringify(candidate(i))));
    fs.writeFileSync(path.join(dir, '_review.md'), sheet(decisions));
  };
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-curated-'));
    opts = { buildsDir: dir, registryFor, maps: [MAP], windTable: null, reviewer: 'TestReviewer', reviewedAt: '2026-10-05', createdAt: '2026-10-05T00:00:00.000Z' };
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('publishes approved plans with the reviewer, a beginner variant each, and keeps the review as REVIEW-LOG.md', () => {
    const decisions = [...Array(MIN_APPROVED).fill('approve'), 'reject — reason: near-duplicate'];
    setup(decisions);
    const result = publishCurated(opts);
    expect(result.curated).toHaveLength(MIN_APPROVED);
    expect(result.rejected).toEqual([candidate(MIN_APPROVED).id]);

    const published = BuildPlanSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, `${candidate(0).id}.json`), 'utf-8')));
    expect(published.source).toMatchObject({ kind: 'curated', reviewedBy: 'TestReviewer', reviewedAt: '2026-10-05' });
    const variant = BuildPlanSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'beginner', `${candidate(0).id}-beginner.json`), 'utf-8')));
    expect(variant.source).toMatchObject({ kind: 'adapted', fromPlanId: candidate(0).id });
    expect(variant.skill).toBe('beginner');

    expect(fs.existsSync(path.join(dir, `${candidate(MIN_APPROVED).id}.json`))).toBe(false);
    expect(fs.existsSync(path.join(dir, '_candidates'))).toBe(false);
    expect(fs.existsSync(path.join(dir, '_review.md'))).toBe(false);
    const log = fs.readFileSync(path.join(dir, 'REVIEW-LOG.md'), 'utf-8');
    expect(log).toContain('reviewer: TestReviewer');
    expect(log).toContain('DECISION: reject — reason: near-duplicate');
  });

  it('refuses (and writes nothing) while a decision is open, below 12 approvals, or without a reviewer', () => {
    setup([...Array(MIN_APPROVED).fill('approve'), 'approve | reject — reason:']);
    expect(() => publishCurated(opts)).toThrow('Review still open for #13');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);
    setup(['approve', 'reject — reason: odd']);
    expect(() => publishCurated(opts)).toThrow('Only 1 approved');
    expect(() => publishCurated({ ...opts, reviewer: ' ' })).toThrow('reviewer handle is required');
    expect(fs.existsSync(path.join(dir, '_review.md'))).toBe(true);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.json'))).toEqual([]);
  });

  it('refuses when a source map is unknown', () => {
    setup(Array(MIN_APPROVED).fill('approve'));
    expect(() => publishCurated({ ...opts, maps: [] })).toThrow('is not in data/maps');
    expect(fs.existsSync(path.join(dir, '_candidates'))).toBe(true);
  });
});
