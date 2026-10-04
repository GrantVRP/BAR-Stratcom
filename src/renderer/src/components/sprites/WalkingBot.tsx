import React, { useEffect, useState } from 'react';
import { useSnapshot } from '../../stores';
import { shadesFor } from '../icons/palette';
import { gridToPaths } from '../icons/pixel-paths';
import { WALKER_FRAMES, WALKER_SIZE, WALKER_UNIT } from './walker-sprites';

export interface WalkingBotProps {
  faction: 'armada' | 'cortex';
  reducedMotion: boolean;
  /** Width of the stage the bot crosses, in px. */
  stageWidth: number;
  /** Rendered sprite size in px. */
  size?: number;
}

/** Milliseconds per animation step (frames are stepped, not tweened). */
export const WALK_TICK_MS = 90;
/** Pixels moved per step: the Sprinter is a little quicker than the Fiend. */
export const WALK_STEP_PX: Record<WalkingBotProps['faction'], number> = { armada: 10, cortex: 9 };
/** Steps spent off-stage between passes (~1.2 s), so one pass repeats every 6–8 s. */
export const WALK_PAUSE_STEPS = 13;

interface WalkState {
  x: number;
  frame: number;
  pause: number;
}

/** A faction bot walking across the launcher stage past the turbine (T06.13). */
export function WalkingBot({ faction, reducedMotion, stageWidth, size = 96 }: WalkingBotProps): React.JSX.Element {
  const name = useSnapshot((s) => s.getUnit(WALKER_UNIT[faction])?.name);
  const [walk, setWalk] = useState<WalkState>({ x: -size, frame: 0, pause: 0 });

  // The parent keys this component by faction, so a faction switch starts a fresh pass
  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setWalk((w) => {
        if (w.pause > 0) return { ...w, pause: w.pause - 1 };
        const x = w.x + WALK_STEP_PX[faction];
        if (x > stageWidth) return { x: -size, frame: 0, pause: WALK_PAUSE_STEPS };
        return { x, frame: (w.frame + 1) % 4, pause: 0 };
      });
    }, WALK_TICK_MS);
    return () => window.clearInterval(timer);
  }, [faction, reducedMotion, stageWidth, size]);

  // Reduced motion: stand still to the right of the turbine
  const x = reducedMotion ? Math.round(stageWidth / 2 + size * 0.9) : walk.x;
  const frame = reducedMotion ? 0 : walk.frame;
  const paths = gridToPaths(WALKER_FRAMES[faction][frame]!, shadesFor(faction));
  const label = name ?? `${faction === 'armada' ? 'Armada' : 'Cortex'} bot`;

  return (
    <svg
      data-testid="walking-bot"
      data-frame={frame}
      width={size}
      height={size}
      viewBox={`0 0 ${WALKER_SIZE} ${WALKER_SIZE}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className="pointer-events-none absolute bottom-2 z-10 drop-shadow-[3px_3px_0px_#000]"
      style={{ left: x }}
    >
      <title>{label}</title>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
    </svg>
  );
}
