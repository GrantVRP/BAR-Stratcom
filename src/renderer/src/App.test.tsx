// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from './App';
import { setIpcClientOverride } from './lib/ipc-client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('App Shell & Routing (06 §1–§2, T06.2)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.location.hash = '#/home';
    setIpcClientOverride({
      invoke: vi.fn().mockImplementation(async (ch: string) => {
        if (ch === 'app:getInfo') {
          return { ok: true, data: { version: '3.0.0-dev.0', platform: 'win32' } };
        }
        if (ch === 'settings:get') {
          return { ok: true, data: { theme: 'arcade', coach: { profile: 'INTERMEDIATE' } } };
        }
        if (ch === 'plans:list') {
          return { ok: true, data: [] };
        }
        return { ok: false, code: 'UNHANDLED', message: '' };
      }),
      on: vi.fn().mockReturnValue(() => {}),
      isAvailable: vi.fn().mockReturnValue(true)
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    setIpcClientOverride(null);
  });

  it('renders LeftRail and TopBar with default home view', async () => {
    await act(async () => {
      root.render(<App />);
    });

    expect(container.querySelector('[data-testid="health-chip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="active-plan-chip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="profile-chip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="view-home"]')).not.toBeNull();
  });

  it('updates view on hashchange', async () => {
    await act(async () => {
      root.render(<App />);
    });

    expect(container.querySelector('[data-testid="view-home"]')).not.toBeNull();

    await act(async () => {
      window.location.hash = '#/library';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(container.querySelector('[data-testid="view-library"]')).not.toBeNull();
  });

  it('handles Alt+1..8 keyboard shortcuts', async () => {
    await act(async () => {
      root.render(<App />);
    });

    await act(async () => {
      const event = new KeyboardEvent('keydown', { key: '3', altKey: true, bubbles: true });
      window.dispatchEvent(event);
    });

    expect(window.location.hash).toBe('#/coach');
  });
});
