// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnitSnapshot } from '../../../../core/schemas';
import { useSnapshot } from '../../stores';
import { PALETTE_CHARS } from '../icons/palette';
import { WALKER_FRAMES, WALKER_SIZE } from './walker-sprites';
import { WALK_PAUSE_STEPS, WALK_STEP_PX, WALK_TICK_MS, WalkingBot } from './WalkingBot';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('walker sprites (T06.13)', () => {
  it('has 4 distinct 24 × 24 walk frames per faction with valid palette characters', () => {
    for (const [faction, frames] of Object.entries(WALKER_FRAMES)) {
      expect(frames, faction).toHaveLength(4);
      for (const frame of frames) {
        expect(frame).toHaveLength(WALKER_SIZE);
        for (const row of frame) {
          expect(row.length, `${faction}: "${row}"`).toBe(WALKER_SIZE);
          expect([...row].every((c) => PALETTE_CHARS.has(c)), `${faction}: "${row}"`).toBe(true);
        }
      }
      expect(new Set(frames.map((f) => f.join('/'))).size, faction).toBe(4);
    }
  });

  it('flickers the Fiend nozzle between orange and yellow', () => {
    const tip = (frame: string[]): string => frame.find((r) => /[oy]k$/.test(r))!.at(-2)!;
    expect(WALKER_FRAMES.cortex.map(tip)).toEqual(['o', 'y', 'o', 'y']);
  });
});

describe('WalkingBot (T06.13)', () => {
  let container: HTMLDivElement;
  let root: Root;
  const bot = (): SVGElement => container.querySelector('[data-testid="walking-bot"]')!;
  const left = (): number => parseFloat((bot() as unknown as HTMLElement).style.left);

  beforeEach(() => {
    vi.useFakeTimers();
    useSnapshot.setState({
      snapshot: null,
      unitsById: new Map([['armfast', { id: 'armfast', name: 'Sprinter' }]]) as unknown as ReturnType<
        typeof useSnapshot.getState
      >['unitsById']
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    useSnapshot.setState({ unitsById: new Map(), snapshot: null as UnitSnapshot | null });
  });

  it('walks across the stage frame by frame, then pauses off-stage and starts again', async () => {
    await act(async () => root.render(<WalkingBot faction="armada" reducedMotion={false} stageWidth={200} size={40} />));
    expect(bot().getAttribute('aria-label')).toBe('Sprinter');
    expect(left()).toBe(-40);

    await act(async () => vi.advanceTimersByTime(WALK_TICK_MS * 3));
    expect(left()).toBe(-40 + 3 * WALK_STEP_PX.armada);
    expect(bot().getAttribute('data-frame')).toBe('3');

    // 24 steps of 10 px reach 200; the next step leaves the stage and starts the pause
    await act(async () => vi.advanceTimersByTime(WALK_TICK_MS * 22));
    expect(left()).toBe(-40);
    await act(async () => vi.advanceTimersByTime(WALK_TICK_MS * WALK_PAUSE_STEPS));
    expect(left()).toBe(-40);
    await act(async () => vi.advanceTimersByTime(WALK_TICK_MS));
    expect(left()).toBe(-40 + WALK_STEP_PX.armada);
  });

  it('stands still beside the turbine with reduced motion, using a faction fallback label', async () => {
    await act(async () => root.render(<WalkingBot faction="cortex" reducedMotion={true} stageWidth={640} size={96} />));
    const before = left();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(left()).toBe(before);
    expect(before).toBeGreaterThan(320);
    expect(bot().getAttribute('data-frame')).toBe('0');
    expect(bot().getAttribute('aria-label')).toBe('Cortex bot');
  });
});
