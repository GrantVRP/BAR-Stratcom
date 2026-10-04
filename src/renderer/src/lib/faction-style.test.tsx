// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { factionAccent, factionTagVariant, NEUTRAL_ACCENT } from './faction-style';
import { FactionTag } from '../components/ui/FactionTag';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('faction colours (T10.7)', () => {
  it('gives Armada blue, Cortex red and Legion teal, in any letter case', () => {
    expect(factionAccent('armada')).toBe('#449bed');
    expect(factionAccent('Cortex')).toBe('#ff2244');
    expect(factionAccent(' LEGION ')).toBe('#2ec4b6');
  });

  it('never paints an unknown faction in another faction colour', () => {
    expect(factionAccent('scavengers')).toBe(NEUTRAL_ACCENT);
    expect(factionAccent(null)).toBe(NEUTRAL_ACCENT);
    expect(factionTagVariant('scavengers')).toBe('default');
    expect(factionTagVariant('ARMADA')).toBe('armada');
    expect(factionTagVariant('cortex')).toBe('cortex');
  });

  it('renders a faction tag with the matching emblem and colour variant', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<FactionTag factionId="cortex" />));
    expect(container.querySelector('[data-faction-emblem]')!.getAttribute('data-faction-emblem')).toBe('cortex');
    expect(container.querySelector('span span')!.className).toContain('text-[#ff2244]');
    act(() => root.render(<FactionTag factionId="armada" emblemSize={0} />));
    expect(container.querySelector('[data-faction-emblem]')).toBeNull();
    expect(container.textContent).toBe('armada');
    act(() => root.unmount());
  });
});
