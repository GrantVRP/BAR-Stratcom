import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RUN_TIMING, TURBINE_BASE, runnerSizeAt, samplePath, shadowSize, type Point } from '../../../../core/launch/scene-layout';
import { RUNNER_UNIT, sceneAsset, type SceneFaction } from './scene-assets';
import { useSnapshot } from '../../stores';

export interface RunnerProps {
  faction: SceneFaction;
  k: number;
  reducedMotion: boolean;
}

const SAMPLES = 600;
/** Where the runner stands when motion is reduced: on the track in front of the turbine. */
export const STILL_T = 0.3;

interface Puff {
  id: number;
  x: number;
  y: number;
}

interface Pose {
  p: Point;
  size: number;
  bob: number;
}

/** Where the runner is `elapsed` ms into the loop, or null while it is off-screen between passes. */
export function runnerPose(faction: SceneFaction, elapsed: number, lut: Point[]): (Pose & { step: number }) | null {
  const { passMs, pauseMs, stepMs } = RUN_TIMING[faction];
  const t = elapsed % (passMs + pauseMs);
  if (t >= passMs) return null;
  const p = lut[Math.round((t / passMs) * (lut.length - 1))]!;
  const step = Math.floor(t / stepMs);
  return { p: { x: Math.round(p.x), y: Math.round(p.y) }, size: runnerSizeAt(p.y), bob: step % 2 === 1 ? -1 : 0, step };
}

/** The faction's bot running up the track: path, depth sizes, step bob, shadow and dust. */
export function Runner({ faction, k, reducedMotion }: RunnerProps): React.JSX.Element {
  const lut = useMemo(() => samplePath(SAMPLES), []);
  const unit = RUNNER_UNIT[faction];
  const name = useSnapshot((s) => s.getUnit(unit)?.name);
  const still = lut[Math.round(STILL_T * (SAMPLES - 1))]!;
  // With motion the runner first appears entering from the bottom-left; without it, it stands still
  const [pose, setPose] = useState<Pose | null>(() =>
    reducedMotion ? { p: { x: Math.round(still.x), y: Math.round(still.y) }, size: runnerSizeAt(still.y), bob: 0 } : null
  );
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const lastStep = useRef(-1);
  const puffId = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const next = runnerPose(faction, now - start, lut);
      setPose((prev) =>
        next === null
          ? null
          : prev && prev.p.x === next.p.x && prev.p.y === next.p.y && prev.size === next.size && prev.bob === next.bob
            ? prev
            : { p: next.p, size: next.size, bob: next.bob }
      );
      if (next && next.step !== lastStep.current) {
        lastStep.current = next.step;
        if (next.step % 2 === 0) {
          const id = ++puffId.current;
          setPuffs((ps) => [...ps.slice(-5), { id, x: next.p.x - 3, y: next.p.y - 1 }]);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [faction, lut, reducedMotion]);

  const removePuff = useCallback((id: number) => setPuffs((ps) => ps.filter((p) => p.id !== id)), []);
  const label = name ?? (faction === 'armada' ? 'Armada bot' : 'Cortex bot');

  if (!pose) return <div data-testid="launch-runner" data-visible="false" />;
  const { p, size, bob } = pose;
  const shadow = shadowSize(size);
  const z = p.y >= TURBINE_BASE.y - 4 ? 30 : 15;

  return (
    <div data-testid="launch-runner" data-visible="true" data-unit={unit} data-size={size} className="absolute inset-0" style={{ zIndex: z }}>
      <img
        src={sceneAsset(`shadow-${size}`)}
        alt=""
        draggable={false}
        className="launch-px absolute select-none"
        style={{ left: (p.x - shadow.w / 2) * k, top: (p.y - 2) * k, width: shadow.w * k, height: shadow.h * k, opacity: 0.42 }}
      />
      {puffs.map((puff) => (
        <span
          key={puff.id}
          className="launch-dust absolute"
          onAnimationEnd={() => removePuff(puff.id)}
          style={
            {
              left: puff.x * k,
              top: puff.y * k,
              width: 2 * k,
              height: 2 * k,
              background: '#d6c79e',
              boxShadow: `${-2 * k}px ${k}px 0 0 #b8a77a, ${2 * k}px ${k}px 0 -${Math.floor(k / 2)}px #e8dcb8`,
              '--dx': `${-3 * k}px`,
              '--dy': `${2 * k}px`
            } as React.CSSProperties
          }
        />
      ))}
      <img
        src={sceneAsset(`runner-${unit}-${size}`)}
        alt={label}
        title={label}
        draggable={false}
        className="launch-px absolute select-none"
        style={{ left: (p.x - size / 2) * k, top: (p.y - size + 2 + bob) * k, width: size * k, height: size * k }}
      />
    </div>
  );
}
