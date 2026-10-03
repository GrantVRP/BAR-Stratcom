import { describe, expect, it } from 'vitest';
import { findDataDir, loadRegistry, loadSnapshot } from './loader';

describe('main/registry/loader', () => {
  it('locates data dir containing factions.json', () => {
    const dir = findDataDir();
    expect(dir).toBeDefined();
    expect(dir.length).toBeGreaterThan(0);
  });

  it('loads default unit snapshot and caches it', () => {
    const snapshot = loadSnapshot();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.units.length).toBeGreaterThan(500);

    const snapshot2 = loadSnapshot();
    expect(snapshot2).toBe(snapshot);
  });

  it('loads registry and resolves units', () => {
    const registry = loadRegistry();
    expect(registry.byFaction('armada').length).toBeGreaterThan(100);

    const res = registry.resolve('armsolar');
    expect(res.kind).toBe('unit');
  });
});
