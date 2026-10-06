// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HudPreview } from './HudPreview';
import type { CoachHud } from '../../../../core/schemas/protocol';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('HudPreview', () => {
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

  it('renders direct HUD model correctly with title and lines', () => {
    const mockHud: CoachHud = {
      visible: true,
      title: 'ARMADA // TEST PLAN',
      progress: { done: 3, total: 10 },
      lines: [
        { text: 'NEXT 2× Metal Extractor      in 0:08', tone: 'good', big: true },
        { text: 'PLAN  +3s AHEAD', tone: 'good' },
        { text: '⚠ ENERGY EMPTY IN 6s', tone: 'warn' },
        { text: '⚠ FACTORY IDLE', tone: 'danger' }
      ]
    };

    act(() => {
      root.render(<HudPreview hud={mockHud} />);
    });

    const preview = container.querySelector('[data-testid="hud-preview"]');
    expect(preview).not.toBeNull();
    expect(container.textContent).toContain('ARMADA // TEST PLAN');
    expect(container.textContent).toContain('3/10');
    expect(container.textContent).toContain('NEXT 2× Metal Extractor');
    expect(container.textContent).toContain('PLAN  +3s AHEAD');
    expect(container.textContent).toContain('⚠ ENERGY EMPTY IN 6s');
    expect(container.textContent).toContain('⚠ FACTORY IDLE');
    expect(container.querySelector('[data-testid="hud-factory"]')).toBeNull();
  });

  it('shows the factory box under the lines (T09.3)', () => {
    const hud: CoachHud = {
      visible: true,
      title: 'ARMADA // TEST PLAN',
      progress: null,
      lines: [{ text: 'NEXT 2× Wind Turbine         in 0:08', tone: 'info', big: true }],
      factory: { title: 'FACTORY // BOT LAB', lines: [{ text: '5× Pawn', tone: 'warn', big: true }, { text: '1× Rocketeer', tone: 'info' }] }
    };
    act(() => {
      root.render(<HudPreview hud={hud} />);
    });
    const box = container.querySelector('[data-testid="hud-factory"]');
    expect(box?.textContent).toContain('FACTORY // BOT LAB');
    expect(container.querySelector('[data-testid="hud-factory-line-0"]')?.textContent).toBe('5× Pawn');
    expect(container.querySelector('[data-testid="hud-factory-line-1"]')?.textContent).toBe('1× Rocketeer');
  });

  it('renders waiting state when no hud or state is provided', () => {
    act(() => {
      root.render(<HudPreview hud={null} />);
    });

    expect(container.textContent).toContain('Waiting for in-game telemetry...');
  });
});
