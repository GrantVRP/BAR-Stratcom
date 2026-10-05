// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildPlan, MapRecord } from '../../../core/schemas';
import { setIpcClientOverride } from '../lib/ipc-client';
import { usePlans } from '../stores';
import { rotorPeriodSec } from '../components/maps/WindTurbine';
import { MapsView, searchMaps, sortMaps } from './MapsView';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// test-only maps; wind 1–19 is in the real BAR table (14.2), wind 0–0 is not
const map = (fileName: string, over: Partial<MapRecord>): MapRecord => ({
  fileName,
  scriptName: `${fileName} 1.0`,
  name: fileName,
  author: 'Mapper',
  sizeX: 12,
  sizeZ: 8,
  wind: { min: 1, max: 19 },
  tidalStrength: 20,
  maxMetal: 2,
  extractorRadius: 90,
  gravity: 120,
  startPositions: [{ x: 1000, z: 1000 }, { x: 5000, z: 3000 }],
  hasWater: false,
  popularity: null,
  mexYield: null,
  ...over
});
const MAPS = [
  map('Calm', { wind: { min: 0, max: 0 }, popularity: { replays30d: 5, rank: 2 }, mexYield: { value: 2.1, provenance: 'measured' } }),
  map('Unranked', { author: 'Someone Else' }),
  map('Busy', { popularity: { replays30d: 300, rank: 1 }, hasWater: true })
];
const plan: BuildPlan = {
  schemaVersion: 1, id: 'p1', title: 'Test plan', factionId: 'armada', gameVersion: 'test', modes: ['1v1'], role: 'any', skill: 'beginner',
  opening: 'bot', energyStyle: 'wind', source: { kind: 'manual', createdAt: '2026-10-05' }, steps: []
};

describe('MapsView (T10.4, 06 §4.9)', () => {
  let container: HTMLDivElement;
  let root: Root;
  const invoke = vi.fn();

  beforeEach(() => {
    window.location.hash = '#/maps';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    usePlans.setState({ plans: [plan], activePlanId: null });
    invoke.mockImplementation((channel: string, req: { scriptName?: string }) => {
      if (channel === 'maps:list') return Promise.resolve({ ok: true, data: MAPS });
      if (channel === 'maps:minimap')
        return Promise.resolve({ ok: true, data: { data: req.scriptName === 'Busy 1.0' ? { url: 'https://maps-metadata.beyondallreason.dev/i/busy.webp', author: 'Mapper' } : null, fetchedAt: '2026-10-05T00:00:00Z', stale: false } });
      if (channel === 'maps:notes')
        return Promise.resolve({ ok: true, data: { schemaVersion: 1, fileName: 'Busy', notes: [{ text: 'Test note', source: { kind: 'owner', ref: 'test' }, addedAt: '2026-10-05' }] } });
      if (channel === 'plans:list') return Promise.resolve({ ok: true, data: [plan] });
      return Promise.resolve({ ok: false, code: 'X', message: '' });
    });
    setIpcClientOverride({ invoke: invoke as never, on: () => () => undefined, isAvailable: () => true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setIpcClientOverride(null);
    usePlans.getState().reset();
  });

  const q = (id: string): HTMLElement | null => container.querySelector(`[data-testid="${id}"]`);

  it('sorts by popularity (unranked last) and searches names, script names and authors', () => {
    expect(sortMaps(MAPS).map((m) => m.fileName)).toEqual(['Busy', 'Calm', 'Unranked']);
    expect(searchMaps(MAPS, 'someone').map((m) => m.fileName)).toEqual(['Unranked']);
    expect(searchMaps(MAPS, '  ')).toHaveLength(3);
  });

  it('shows the most played map with its facts, start positions, minimap credit and notes', async () => {
    await act(async () => root.render(<MapsView />));
    expect([...container.querySelectorAll('[data-testid^="map-item-"]')].map((e) => e.getAttribute('data-testid'))).toEqual(['map-item-Busy', 'map-item-Calm', 'map-item-Unranked']);
    const facts = q('map-facts')!.textContent!;
    expect(facts).toContain('12 × 8');
    expect(facts).toContain('14.2 (BAR table)');
    expect(facts).toContain('Wind riskunknown');
    expect(facts).toContain('#1 // 300 games in 30 days');
    expect(container.querySelectorAll('[data-testid="map-start-position"]')).toHaveLength(2);
    expect(q('map-minimap')!.querySelector('img')!.getAttribute('src')).toBe('https://maps-metadata.beyondallreason.dev/i/busy.webp');
    expect(q('map-minimap-credit')!.textContent).toBe('Minimap: maps-metadata.beyondallreason.dev // map by Mapper');
    expect(q('map-notes')!.textContent).toContain('Test note (owner: test)');
    expect(q('wind-turbine')!.textContent).toBe('avg wind 14.2 (BAR table)');
  });

  it('says unknown when the wind table has no average, and marks mex yield provenance', async () => {
    await act(async () => root.render(<MapsView />));
    await act(async () => (q('map-item-Calm') as HTMLButtonElement).click());
    expect(window.location.hash).toBe('#/maps/Calm');
    const facts = q('map-facts')!.textContent!;
    expect(facts).toContain('Avg windunknown');
    expect(facts).toContain('Mex yield2.1 MEASURED');
    expect(q('wind-turbine')!.textContent).toBe('avg wind unknown');
    expect(q('wind-turbine-rotor')!.getAttribute('class')).not.toContain('animate-spin');
    expect(q('map-minimap-credit')!.textContent).toBe('No minimap listed for this map');
  });

  it('opens the adapter with the chosen plan for this map', async () => {
    await act(async () => root.render(<MapsView />));
    await act(async () => (q('btn-adapt-for-map') as HTMLButtonElement).click());
    expect(container.textContent).toContain('ADAPT TO BUSY');
  });

  it('turns the rotor faster in stronger average wind', () => {
    expect(rotorPeriodSec(10)).toBe(1);
    expect(rotorPeriodSec(20)).toBe(0.5);
    expect(rotorPeriodSec(null)).toBeNull();
    expect(rotorPeriodSec(0)).toBeNull();
    expect(rotorPeriodSec(100)).toBe(0.25);
  });
});
