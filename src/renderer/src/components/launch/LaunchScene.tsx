import React, { useRef } from 'react';
import { SCENE_H, SCENE_W } from '../../../../core/launch/scene-layout';
import { sceneAsset, type SceneFaction } from './scene-assets';
import { useSceneScale } from './useSceneScale';
import { Turbine } from './Turbine';
import { Runner } from './Runner';
import { Ambience } from './Ambience';

export interface LaunchSceneProps {
  faction: SceneFaction;
  reducedMotion: boolean;
}

/**
 * The launcher's animated pixel-art scene (T06.14): Greenest Fields ground, a spinning wind turbine
 * generating power, and the faction's bot (Sprinter / Fiend) running up the track off the top-right,
 * then coming back in from the bottom-left. 320 × 200 scene pixels at a whole-number scale, centred
 * and cropped to cover the window.
 */
export function LaunchScene({ faction, reducedMotion }: LaunchSceneProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const k = useSceneScale(rootRef);
  const unitLabel = faction === 'armada' ? 'An Armada Sprinter' : 'A Cortex Fiend';

  return (
    <div
      ref={rootRef}
      data-testid="launch-scene"
      data-scale={k}
      role="img"
      aria-label={`${unitLabel} running past a spinning wind turbine on Greenest Fields`}
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[#2b3f16]"
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: SCENE_W * k, height: SCENE_H * k, transform: 'translate(-50%, -50%)' }}
      >
        <img
          src={sceneAsset('ground')}
          alt=""
          draggable={false}
          className="launch-px absolute inset-0 h-full w-full select-none"
        />
        <Turbine faction={faction} k={k} />
        <Runner key={faction} faction={faction} k={k} reducedMotion={reducedMotion} />
        <Ambience k={k} />
      </div>
      {/* Soft vignette so the UI panels and edges read well over the field */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 45% 50%, transparent 55%, rgba(6, 10, 4, 0.55) 100%)', zIndex: 45 }}
      />
    </div>
  );
}
