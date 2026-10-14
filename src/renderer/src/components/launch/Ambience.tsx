import React from 'react';
import { CLOUD, SCENE_W } from '../../../../core/launch/scene-layout';
import { sceneAsset } from './scene-assets';

export interface AmbienceProps {
  k: number;
}

/** Cloud shadows drifting over the field (scene px, seconds per pass, delay). */
const CLOUDS: Array<{ y: number; dur: number; delay: number }> = [
  { y: 34, dur: 70, delay: -18 },
  { y: 118, dur: 95, delay: -62 }
];

/** Wind gusts: thin light streaks blowing across, the wind the turbine is turning in. */
const GUSTS: Array<{ y: number; len: number; dur: number; delay: number; o: number }> = [
  { y: 22, len: 18, dur: 2.6, delay: 0, o: 0.35 },
  { y: 58, len: 12, dur: 2.2, delay: 0.9, o: 0.3 },
  { y: 84, len: 22, dur: 3.0, delay: 1.7, o: 0.32 },
  { y: 104, len: 10, dur: 2.0, delay: 0.4, o: 0.28 },
  { y: 142, len: 16, dur: 2.8, delay: 2.2, o: 0.3 },
  { y: 170, len: 14, dur: 2.4, delay: 1.2, o: 0.26 }
];

/** Drifting cloud shadows and wind gusts over the Greenest Fields scene. */
export function Ambience({ k }: AmbienceProps): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 40 }} aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <img
          key={`cloud-${i}`}
          src={sceneAsset('cloud')}
          alt=""
          draggable={false}
          className="launch-px launch-cloud absolute left-0 select-none"
          style={
            {
              top: c.y * k,
              width: CLOUD.w * k,
              height: CLOUD.h * k,
              opacity: 0.2,
              '--from': `${-CLOUD.w * k}px`,
              '--to': `${SCENE_W * k}px`,
              '--dur': `${c.dur}s`,
              '--delay': `${c.delay}s`,
              '--steps': String(SCENE_W + CLOUD.w)
            } as React.CSSProperties
          }
        />
      ))}
      {GUSTS.map((g, i) => (
        <span
          key={`gust-${i}`}
          className="launch-gust absolute left-0"
          style={
            {
              top: g.y * k,
              width: g.len * k,
              height: k,
              background: '#f1f5d8',
              opacity: 0,
              '--from': `${-g.len * k}px`,
              '--to': `${SCENE_W * k}px`,
              '--dur': `${g.dur}s`,
              '--delay': `${g.delay}s`,
              '--o': String(g.o),
              '--steps': String(Math.round((SCENE_W + g.len) / 2))
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
