// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapCombobox } from './MapCombobox';
import type { MapRecord } from '../../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const testMaps: MapRecord[] = [
  {
    fileName: 'red_river_v2',
    scriptName: 'Red River v2',
    name: 'Red River',
    author: 'Beherith',
    sizeX: 16,
    sizeZ: 16,
    wind: { min: 5, max: 15 },
    tidalStrength: 10,
    maxMetal: 1.2,
    extractorRadius: 90,
    gravity: 120,
    startPositions: [],
    hasWater: false,
    popularity: null,
    mexYield: null
  },
  {
    fileName: 'altair_crossing',
    scriptName: 'Altair Crossing',
    name: 'Altair Crossing',
    author: null,
    sizeX: 20,
    sizeZ: 20,
    wind: { min: 8, max: 20 },
    tidalStrength: 0,
    maxMetal: 0.9,
    extractorRadius: 80,
    gravity: 120,
    startPositions: [],
    hasWater: false,
    popularity: null,
    mexYield: null
  }
];

describe('MapCombobox', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders selected map trigger button', async () => {
    const onSelect = vi.fn();
    await act(async () => {
      root.render(<MapCombobox selectedMap={testMaps[0] ?? null} onSelectMap={onSelect} maps={testMaps} />);
    });

    const trigger = container.querySelector('#map-combobox-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain('Red River');
    expect(trigger?.textContent).toContain('16×16');
    expect(trigger?.textContent).toContain('5–15');
  });

  it('opens listbox on click and allows selection', async () => {
    const onSelect = vi.fn();
    await act(async () => {
      root.render(<MapCombobox selectedMap={testMaps[0] ?? null} onSelectMap={onSelect} maps={testMaps} />);
    });

    const trigger = container.querySelector('#map-combobox-trigger') as HTMLButtonElement;
    await act(async () => {
      trigger.click();
    });

    const listbox = container.querySelector('#map-combobox-listbox');
    expect(listbox).not.toBeNull();
    expect(container.textContent).toContain('Altair Crossing');

    // Click on Altair Crossing
    const options = container.querySelectorAll('li[role="option"]');
    expect(options.length).toBe(2);

    await act(async () => {
      (options[1] as HTMLElement).click();
    });

    expect(onSelect).toHaveBeenCalledWith(testMaps[1]);
  });

  it('supports keyboard navigation via Enter and ArrowDown', async () => {
    const onSelect = vi.fn();
    await act(async () => {
      root.render(<MapCombobox selectedMap={testMaps[0] ?? null} onSelectMap={onSelect} maps={testMaps} />);
    });

    const combobox = container.querySelector('[data-testid="map-combobox"]') as HTMLElement;

    // Press ArrowDown to open
    await act(async () => {
      combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(container.querySelector('#map-combobox-listbox')).not.toBeNull();

    // Arrow down to highlight second item
    await act(async () => {
      combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    // Enter to select highlighted
    await act(async () => {
      combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith(testMaps[1]);
  });

  it('shows "CHOOSE A MAP" when selectedMap is null', async () => {
    const onSelect = vi.fn();
    await act(async () => {
      root.render(<MapCombobox selectedMap={null} onSelectMap={onSelect} maps={testMaps} />);
    });

    const trigger = container.querySelector('#map-combobox-trigger');
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain('CHOOSE A MAP');
    expect(trigger?.textContent).not.toContain('Red River');
  });
});

