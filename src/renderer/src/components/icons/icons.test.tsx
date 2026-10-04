// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IconBadge, IconBase } from '../../../../core/icons/icon-spec';
import type { UnitSnapshot } from '../../../../core/schemas';
import testSnapshotRaw from '../../../../core/registry/__test__/test-snapshot.json';
import { useSnapshot } from '../../stores';
import { PALETTE_CHARS, SPRITE_SIZE } from './palette';
import { gridToPaths } from './pixel-paths';
import { BADGE_SIZE, BADGE_SPRITES } from './sprites-badges';
import { BUILDING_SPRITES } from './sprites-buildings';
import { UNIT_SPRITES } from './sprites-units';
import { SpriteIcon } from './SpriteIcon';
import { UnitIcon } from './UnitIcon';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ALL_BASES: IconBase[] = [
  'commander', 'bot', 'vehicle', 'air', 'ship', 'hover', 'factory', 'mex', 'solar', 'wind', 'tidal', 'reactor',
  'converter', 'storage-metal', 'storage-energy', 'turret', 'nano', 'radar', 'silo', 'shield', 'structure'
];
const ALL_BADGES: IconBadge[] = [
  'build', 'aa', 'sub', 'scout', 'nuke', 'emp', 'bot', 'vehicle', 'air', 'ship', 'hover', 'amphib', 'gantry'
];

describe('pixel sprites (T10.3)', () => {
  it('has a 16 × 16 sprite with valid palette characters for every icon base', () => {
    const sprites: Record<string, readonly string[]> = { ...UNIT_SPRITES, ...BUILDING_SPRITES };
    expect(Object.keys(sprites).sort()).toEqual([...ALL_BASES].sort());
    for (const [name, grid] of Object.entries(sprites)) {
      expect(grid, name).toHaveLength(SPRITE_SIZE);
      for (const row of grid) {
        expect(row.length, `${name}: "${row}"`).toBe(SPRITE_SIZE);
        expect([...row].every((c) => PALETTE_CHARS.has(c)), `${name}: "${row}"`).toBe(true);
      }
    }
  });

  it('has a 7 × 7 badge for every badge kind', () => {
    expect(Object.keys(BADGE_SPRITES).sort()).toEqual([...ALL_BADGES].sort());
    for (const [name, grid] of Object.entries(BADGE_SPRITES)) {
      expect(grid).toHaveLength(BADGE_SIZE);
      expect(grid.every((r) => r.length === BADGE_SIZE && [...r].every((c) => PALETTE_CHARS.has(c))), name).toBe(true);
    }
  });

  it('merges pixels into one path per colour', () => {
    const paths = gridToPaths(['kkf.', '..ff'], { f: '#111111', d: '#222222', l: '#333333' }, 2, 3);
    expect(paths).toEqual([
      { color: '#05060a', d: 'M2 3h2v1h-2z' },
      { color: '#111111', d: 'M4 3h1v1h-1zM4 4h2v1h-2z' }
    ]);
  });
});

describe('icon components (T10.3)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useSnapshot.setState({ snapshot: testSnapshotRaw as unknown as UnitSnapshot, loading: false, error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders a unit with its sprite, badge and display-name label', async () => {
    await act(async () => root.render(<UnitIcon unitId="armlab" size={32} />));
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-icon-base')).toBe('factory');
    expect(svg.getAttribute('data-icon-badge')).toBe('bot');
    expect(svg.getAttribute('aria-label')).toBe('Bot Lab (armlab)');
    expect(svg.getAttribute('width')).toBe('32');
  });

  it('shows an unknown-unit icon instead of failing', async () => {
    await act(async () => root.render(<UnitIcon unitId="notaunit" />));
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe('Unknown unit');
  });

  it('draws tech pips for T2 and T3', async () => {
    await act(async () => root.render(<SpriteIcon base="bot" tech={3} factionId="cortex" label="T3 bot" />));
    expect(container.querySelectorAll('rect')).toHaveLength(3);
  });
});
