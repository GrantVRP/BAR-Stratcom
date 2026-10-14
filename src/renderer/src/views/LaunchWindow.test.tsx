// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LaunchWindow } from './LaunchWindow';
import { setIpcClientOverride, type IpcClientInterface } from '../lib/ipc-client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LaunchWindow', () => {
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
    // no disclaimer line on the launcher; it is on the top bar tag and About page
    expect(container.textContent).not.toContain('NOT AFFILIATED');
    // only the LAUNCH button enters the app, so there is no "press any key" hint
    expect(container.textContent).not.toContain('PRESS ANY KEY');
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

  it('does not start on a key press or a click outside the LAUNCH button', async () => {
    const onStart = vi.fn();
    await act(async () => {
      root.render(<LaunchWindow onStart={onStart} />);
    });

    await act(async () => {
      for (const key of [' ', 'Enter', 'a', 'Shift', 'Escape']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      }
      (container.querySelector('[data-testid="launch-window"]') as HTMLElement).click();
    });

    expect(onStart).not.toHaveBeenCalled();
  });
  it('the faction switch also switches the window icon', async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    setIpcClientOverride({ invoke, on: () => () => undefined, isAvailable: () => true } as unknown as IpcClientInterface);
    try {
      await act(async () => {
        root.render(<LaunchWindow onStart={vi.fn()} version="3.0.0" defaultFaction="armada" />);
      });
      expect(invoke).toHaveBeenLastCalledWith('app:setWindowFaction', { faction: 'armada' });
      await act(async () => {
        (container.querySelector('[data-testid="launcher-faction-toggle"]') as HTMLElement).click();
      });
      expect(invoke).toHaveBeenLastCalledWith('app:setWindowFaction', { faction: 'cortex' });
      expect(invoke.mock.calls.filter(([c]) => c === 'app:setWindowFaction')).toHaveLength(2);
    } finally {
      setIpcClientOverride(null);
    }
  });
});
