import { describe, it, expect, beforeEach } from 'vitest';
import { loadMaps, getMap, clearMapsCache } from './loader';

describe('maps loader', () => {
  beforeEach(() => {
    clearMapsCache();
  });

  it('loads map records from data/maps/maps.json', () => {
    const maps = loadMaps();
    expect(maps.length).toBeGreaterThan(0);

    const first = maps[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first.fileName).toBeDefined();
    expect(first.name).toBeDefined();
    expect(first.wind).toBeDefined();
    expect(typeof first.wind.min).toBe('number');
  });

  it('retrieves a map by its fileName', () => {
    const maps = loadMaps();
    const target = maps[0];
    expect(target).toBeDefined();
    if (!target) return;
    const retrieved = getMap(target.fileName);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe(target.name);
  });

  it('returns null for nonexistent map fileName', () => {
    const retrieved = getMap('non_existent_map_12345');
    expect(retrieved).toBeNull();
  });
});
