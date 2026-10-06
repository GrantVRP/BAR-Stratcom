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
    expect(container.querySelector('[data-testid="hud-boxes"]')).toBeNull();
  });

  it('shows the 3.0.5 boxes when the coach sends them: levels, tags once per builder, timings (T09.4)', () => {
    const hud: CoachHud = {
      visible: true,
      title: 'ARMADA // TEST PLAN',
      progress: null,
      lines: [{ text: 'NEXT 2× Wind Turbine      in 0:08', tone: 'info', big: true }],
      build: {
        title: 'BUILDINGS',
        meta: [
          { text: '2/10', tone: 'info' },
          { text: '12s BEHIND', tone: 'warn' }
        ],
        lines: [
          { text: '2× Wind Turbine', tone: 'info', big: true, right: 'in 0:08', tag: 'CDR', unitId: 'armwin' },
          { text: '1× Metal Extractor', tone: 'warn', right: '+0:04', tag: 'CDR' }
        ]
      },
      factory: { title: 'FACTORY', lines: [{ text: '5× Pawn', tone: 'info', big: true, right: 'in 0:12', tag: 'FAC' }] },
      alerts: [{ text: 'ENERGY EMPTY IN 6s', tone: 'danger' }]
    };
    act(() => {
      root.render(<HudPreview hud={hud} />);
    });
    const build = container.querySelector('[data-testid="hud-box-buildings"]')!;
    expect(build.textContent).toContain('BUILDINGS');
    expect(build.textContent).toContain('12s BEHIND');
    expect(build.querySelector('[data-testid="hud-row-big"]')?.textContent).toContain('2× Wind Turbine');
    expect(build.querySelector('[data-testid="hud-row"]')?.textContent).toBe('1× Metal Extractor+0:04'); // same builder: no second CDR
    expect(container.querySelector('[data-testid="hud-box-factory"]')?.textContent).toContain('5× Pawn');
    expect(container.querySelector('[data-testid="hud-alerts"]')?.textContent).toContain('ENERGY EMPTY IN 6s');
    expect(container.textContent).not.toContain('ARMADA // TEST PLAN'); // the single panel is for older widgets
  });

  it('renders waiting state when no hud or state is provided', () => {
    act(() => {
      root.render(<HudPreview hud={null} />);
    });

    expect(container.textContent).toContain('Waiting for in-game telemetry...');
  });
});
