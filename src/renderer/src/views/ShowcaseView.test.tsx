// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { FACTION_ACCENTS } from '../../../shared/faction-colors';
import { LaunchWindow } from './LaunchWindow';
import { ShowcaseView } from './ShowcaseView';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(node: React.ReactNode): Promise<{ container: HTMLDivElement; unmount: () => void }> {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(node));
  return { container, unmount: () => act(() => root.unmount()) };
}

describe('ShowcaseView (the README animation)', () => {
  it('shows only the centred title over the scene: no emblem, LAUNCH button or faction bar', async () => {
    const { container, unmount } = await render(<ShowcaseView version="3.0.0" />);
    const title = container.querySelector('[data-testid="launch-title"]')!;
    expect(title.textContent).toBe('BAR STRATCOM3.0.0');
    expect(title.className).toContain('left-1/2');
    expect(title.className).toContain('-translate-x-1/2');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="launcher-button"]')).toBeNull();
    expect(container.querySelector('[data-testid="launcher-faction-toggle"]')).toBeNull();
    // without WebGL (as here) the page stays dark rather than drawing a half scene
    expect(container.querySelector('[data-testid="showcase"]')!.getAttribute('data-status')).toBe('failed');
    unmount();
  });

  it('colours STRATCOM half Cortex red and half Armada blue, blended across the middle', async () => {
    const { container, unmount } = await render(<ShowcaseView version="3.0.0" />);
    const style = container.querySelector('[data-testid="launch-title-stratcom"]')!.getAttribute('style')!;
    expect(style).toContain(`linear-gradient(90deg, ${FACTION_ACCENTS.cortex} 40%, ${FACTION_ACCENTS.armada} 60%)`);
    expect(style).toContain('background-clip: text');
    unmount();
  });

  it('keeps the launcher title in its one faction colour', async () => {
    const { container, unmount } = await render(<LaunchWindow onStart={() => undefined} defaultFaction="cortex" />);
    const style = container.querySelector('[data-testid="launch-title-stratcom"]')!.getAttribute('style')!;
    expect(style).toContain(`color: ${FACTION_ACCENTS.cortex}`);
    expect(style).not.toContain('gradient');
    unmount();
  });
});
