// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildPlan, MapRecord, UnitDefRecord, UnitSnapshot } from '../../../../core/schemas';
import snapshotData from '../../../../../data/snapshots/test-31479-433a460/units.json';
import { useSnapshot } from '../../stores';
import { AdaptPlanDialog, transformLabel } from './AdaptPlanDialog';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = snapshotData as unknown as UnitSnapshot;

// Synthetic plan and map (test-only names); unit values come from the real snapshot.
const windPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'wind-op',
  title: 'Wind opening',
  factionId: 'armada',
  gameVersion: 'test-31479-433a460',
  modes: ['1v1'],
  role: 'any',
  skill: 'intermediate',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'manual', createdAt: '2026-10-05T00:00:00.000Z' },
  steps: [
    { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 2, targetTime: 4 },
    { id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'armwin', count: 5, targetTime: 30 },
    { id: 's3', actor: { kind: 'commander' }, action: 'build', unitId: 'armlab', count: 1, targetTime: 90 }
  ]
};

// wind 0-5 → measured average 3.7 in data/wind/avg-wind.json: a low-wind map; ceil(5 · 3.7 / 20) = 1 solar
const calmMap: MapRecord = {
  fileName: 'calm_map',
  scriptName: 'Calm Map 1.0',
  name: 'Calm Map',
  author: null,
  sizeX: 12,
  sizeZ: 12,
  wind: { min: 0, max: 5 },
  tidalStrength: 0,
  maxMetal: 2,
  extractorRadius: 90,
  gravity: 100,
  startPositions: [],
  hasWater: false,
  popularity: null,
  mexYield: null
};

describe('AdaptPlanDialog', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    const unitsById = new Map<string, UnitDefRecord>(snapshot.units.map((u) => [u.id, u]));
    useSnapshot.setState({ snapshot, unitsById, loading: false, error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('previews the adaptation (turbines → solar on a calm map) and saves an adapted plan', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await act(async () => root.render(<AdaptPlanDialog open plan={windPlan} map={calmMap} onClose={() => {}} onSave={onSave} />));

    const preview = document.querySelector('[data-testid="adapt-preview"]')!;
    expect(preview.textContent).toContain('Wind turbines → solar');
    expect(document.querySelector('[data-testid="adapt-diff"]')!.textContent).toContain('5× Wind Turbine → 1× Solar Collector');

    const save = document.querySelector('[data-testid="adapt-save-btn"]') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    await act(async () => save.click());
    const saved = onSave.mock.calls[0]![0] as BuildPlan;
    expect(saved.source).toMatchObject({ kind: 'adapted', fromPlanId: 'wind-op' });
    expect(saved.steps.find((s) => s.id === 's2')).toMatchObject({ unitId: 'armsolar', count: 1 });
  });

  it('labels transforms in plain words', () => {
    const name = (id: string): string => (id === 'armsolar' ? 'Solar Collector' : id);
    expect(transformLabel('energy(solar→wind)', name)).toBe('Solar → wind turbines');
    expect(transformLabel('retime(asap)', name)).toBe('Re-timed');
    expect(transformLabel('stall-fix(armsolar)', name)).toBe('+1 Solar Collector (energy stall fix)');
    expect(transformLabel('base(wind-op)', name)).toBeNull();
  });
});
