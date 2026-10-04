// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RUN_TIMING, RUNNER_SIZES, samplePath } from '../../../../core/launch/scene-layout';
import { LaunchScene } from './LaunchScene';
import { runnerPose } from './Runner';
import { coverScale } from './useSceneScale';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('launch scene timing and scale (T06.14)', () => {
  const lut = samplePath(600);

  it('scales the 320 × 200 scene by whole pixels to cover the window', () => {
    expect(coverScale(1280, 800)).toBe(4);
    expect(coverScale(960, 600)).toBe(3);
    expect(coverScale(1920, 1080)).toBe(6);
    expect(coverScale(100, 50)).toBe(1);
  });

  it('runs in from below the bottom-left, shrinking as it climbs, then waits off-screen', () => {
    const start = runnerPose('armada', 0, lut)!;
    expect(start.p.y).toBeGreaterThan(200);
    expect(start.size).toBe(RUNNER_SIZES[0]);
    const late = runnerPose('armada', RUN_TIMING.armada.passMs * 0.9, lut)!;
    expect(late.p.y).toBeLessThan(40);
    expect(late.size).toBe(RUNNER_SIZES[3]);
    expect(runnerPose('armada', RUN_TIMING.armada.passMs + 10, lut)).toBeNull();
    const loop = RUN_TIMING.armada.passMs + RUN_TIMING.armada.pauseMs;
    expect(runnerPose('armada', loop, lut)!.p).toEqual(start.p);
  });

  it('bobs one pixel on every other step, and the Sprinter is quicker than the Fiend', () => {
    const { stepMs } = RUN_TIMING.armada;
    expect(runnerPose('armada', 1, lut)!.bob).toBe(0);
    expect(runnerPose('armada', stepMs + 1, lut)!.bob).toBe(-1);
    expect(RUN_TIMING.armada.passMs).toBeLessThan(RUN_TIMING.cortex.passMs);
  });
});

describe('LaunchScene (T06.14)', () => {
  let container: HTMLDivElement;
  let root: Root;
  const q = (id: string): HTMLElement | null => container.querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('draws the field, the faction turbine with its spinning rotor, and brings the runner in from the bottom', async () => {
    await act(async () => root.render(<LaunchScene faction="armada" reducedMotion={false} />));
    expect(q('launch-scene')!.getAttribute('aria-label')).toContain('Armada Sprinter');
    expect(q('launch-turbine')!.getAttribute('data-faction')).toBe('armada');
    const rotor = q('launch-rotor')!;
    expect(rotor.className).toContain('launch-rotor');
    expect(rotor.style.backgroundImage).toMatch(/rotor-armada/);
    expect(q('launch-rotor-shadow')).not.toBeNull();
    // Either not on screen yet, or already entering from below the bottom-left (never parked by the turbine)
    const runner = q('launch-runner')!;
    if (runner.getAttribute('data-visible') === 'true') {
      const k = Number(q('launch-scene')!.getAttribute('data-scale'));
      const bot = runner.querySelector<HTMLImageElement>('img[title]')!;
      expect(parseFloat(bot.style.top)).toBeGreaterThan(150 * k);
    }
  });

  it('with reduced motion, shows the Fiend standing in front of the Cortex turbine', async () => {
    await act(async () => root.render(<LaunchScene faction="cortex" reducedMotion={true} />));
    const runner = q('launch-runner')!;
    expect(runner.getAttribute('data-visible')).toBe('true');
    expect(runner.getAttribute('data-unit')).toBe('corpyro');
    expect(runner.querySelector('img[title]')!.getAttribute('src')).toMatch(/runner-corpyro/);
    expect(q('launch-rotor')!.style.backgroundImage).toMatch(/rotor-cortex/);
  });
});
