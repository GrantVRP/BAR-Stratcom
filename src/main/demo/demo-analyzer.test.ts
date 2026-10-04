import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { DemoSource, derivePlanFromDemo } from './demo-source';
import { handleDemoCompletion } from './demo-analyzer';
import { defaultSessionStore } from '../sessions/store';
import { findDataDir, loadRegistry } from '../registry/loader';

describe('handleDemoCompletion (02 §4.2, T07.4)', () => {
  beforeEach(() => {
    defaultSessionStore.setInMemoryDemo(null);
  });

  afterEach(() => {
    defaultSessionStore.setInMemoryDemo(null);
  });

  it('runs analysis in-memory on demo finish and populates session store without disk writes', () => {
    const dataDir = findDataDir();
    const fixtureDir = path.join(
      dataDir,
      'fixtures',
      'sessions',
      '2026-10-01-cortex-1v1-vs-ai-barr-499s'
    );
    const registry = loadRegistry();
    const demoSource = new DemoSource({ fixtureDir, speed: 100 });
    const plan = derivePlanFromDemo(demoSource, registry);

    const detail = handleDemoCompletion({
      demoSource,
      plan,
      registry,
      profile: 'intermediate'
    });

    expect(detail).not.toBeNull();
    expect(detail.meta.source).toBe('fixture');
    expect(detail.report).not.toBeNull();
    expect(detail.report?.grade).toBeDefined();

    // Verify SessionStore returns in-memory demo
    const stored = defaultSessionStore.get(detail.meta.sessionId);
    expect(stored).toEqual(detail);

    const list = defaultSessionStore.list();
    const demoInList = list.find((s) => s.sessionId === detail.meta.sessionId);
    expect(demoInList).toBeDefined();
    expect(demoInList?.source).toBe('fixture');
    expect(demoInList?.hasReport).toBe(true);
  });
});
