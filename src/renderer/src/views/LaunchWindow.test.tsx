// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LaunchWindow } from './LaunchWindow';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LaunchWindow (06 §4.1, T06.3)', () => {
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

  it('renders branding, disclaimer, and initial Armada turbine', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} version="3.0.0-dev.0" defaultFaction="armada" />);
    });

    expect(container.querySelector('[data-testid="launch-window"]')).not.toBeNull();
    expect(container.textContent).toContain('BAR STRATCOM');
    expect(container.textContent).toContain('3.0.0-dev.0');
    expect(container.textContent).toContain('UNOFFICIAL COMMUNITY TOOL');
    expect(container.textContent).toContain('PRESS ANY KEY OR CLICK TO CONTINUE');
  });

  it('switches faction between Armada and Cortex on toggle click', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} defaultFaction="armada" />);
    });

    const toggle = container.querySelector('[data-testid="launcher-faction-toggle"]') as HTMLElement;
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toContain('armada');

    await act(async () => {
      toggle.click();
    });

    expect(toggle.textContent).toContain('cortex');
  });

  it('switches faction on arrow keys', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} defaultFaction="armada" />);
    });

    const toggle = container.querySelector('[data-testid="launcher-faction-toggle"]') as HTMLElement;
    expect(toggle.textContent).toContain('armada');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(toggle.textContent).toContain('cortex');
  });

  it('triggers onStart on LAUNCH button click', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} />);
    });

    const button = container.querySelector('[data-testid="launcher-button"]') as HTMLButtonElement;
    expect(button).not.toBeNull();

    await act(async () => {
      button.click();
    });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('triggers onStart on Space key press', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('ignores modifier keys alone', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
    });

    expect(onStart).not.toHaveBeenCalled();
  });
});
