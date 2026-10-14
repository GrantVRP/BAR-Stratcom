// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReportReadyToast } from './ReportReadyToast';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReportReadyToast', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  let listeners: Record<string, ((data: unknown) => void)[]> = {};

  beforeEach(() => {
    listeners = {};
    (window as unknown as { stratcom: unknown }).stratcom = {
      invoke: vi.fn(),
      on: (channel: string, cb: (data: unknown) => void) => {
        if (!listeners[channel]) listeners[channel] = [];
        listeners[channel]!.push(cb);
        return () => {
          listeners[channel] = (listeners[channel] || []).filter((l) => l !== cb);
        };
      }
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = '#/home';
  });

  afterEach(() => {
    delete (window as unknown as { stratcom?: unknown }).stratcom;
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    container = null;
    root = null;
  });

  const triggerEvent = (channel: string, data: unknown) => {
    const cbs = listeners[channel] || [];
    for (const cb of cbs) {
      cb(data);
    }
  };

  it('is hidden initially and appears when review:ready event fires', async () => {
    await act(async () => {
      root?.render(<ReportReadyToast />);
    });

    expect(container?.querySelector('[data-testid="report-ready-toast"]')).toBeNull();

    // Trigger review:ready event
    await act(async () => {
      triggerEvent('review:ready', {
        sessionId: 'session-demo-123'
      });
    });

    const toast = container?.querySelector('[data-testid="report-ready-toast"]');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain('MATCH REPORT READY');
  });

  it('navigates to review view when clicking VIEW REPORT', async () => {
    await act(async () => {
      root?.render(<ReportReadyToast />);
    });

    await act(async () => {
      triggerEvent('review:ready', {
        sessionId: 'session-demo-456'
      });
    });

    const viewBtn = container?.querySelector(
      '[data-testid="toast-view-report"]'
    ) as HTMLButtonElement | null;
    expect(viewBtn).not.toBeNull();

    await act(async () => {
      viewBtn?.click();
    });

    expect(window.location.hash).toBe('#/review?sessionId=session-demo-456');
    // Toast should dismiss on click
    expect(container?.querySelector('[data-testid="report-ready-toast"]')).toBeNull();
  });

  it('dismisses toast when clicking close button', async () => {
    await act(async () => {
      root?.render(<ReportReadyToast />);
    });

    await act(async () => {
      triggerEvent('review:ready', {
        sessionId: 'session-demo-789'
      });
    });

    const dismissBtn = container?.querySelector(
      '[data-testid="toast-dismiss"]'
    ) as HTMLButtonElement | null;
    expect(dismissBtn).not.toBeNull();

    await act(async () => {
      dismissBtn?.click();
    });

    expect(container?.querySelector('[data-testid="report-ready-toast"]')).toBeNull();
  });
});
