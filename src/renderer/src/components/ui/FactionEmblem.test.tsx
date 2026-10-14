// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FactionEmblem } from './FactionEmblem';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('FactionEmblem', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows the 32-bit emblem, choosing the art closest to the size', async () => {
    await act(async () => root.render(<FactionEmblem faction="Cortex" size={64} />));
    const img = container.querySelector('img')!;
    expect(img.getAttribute('data-faction-emblem')).toBe('cortex');
    expect(img.getAttribute('alt')).toBe('Cortex faction emblem');
    expect(img.getAttribute('src')).toMatch(/cortex-64.*\.png/);
    expect(img.style.imageRendering).toBe('pixelated');

    await act(async () => root.render(<FactionEmblem faction="armada" size={24} />));
    expect(container.querySelector('img')!.getAttribute('src')).toMatch(/armada-32.*\.png/);
    expect(container.querySelector('img')!.style.imageRendering).toBe('auto');
  });

  it('falls back to a neutral badge for a faction without an emblem', async () => {
    await act(async () => root.render(<FactionEmblem faction="legion" />));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe('legion faction emblem');
  });
});
