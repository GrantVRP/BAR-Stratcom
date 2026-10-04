import React from 'react';
import { ROTOR_FRAMES, ROTOR_SIZE, TOWER_HUB, TURBINE_BASE, TURBINE_TOWER } from '../../../../core/launch/scene-layout';
import { sceneAsset, type SceneFaction } from './scene-assets';

export interface TurbineProps {
  faction: SceneFaction;
  /** Screen pixels per scene pixel. */
  k: number;
}

const TOWER_LEFT = TURBINE_BASE.x - TURBINE_TOWER.w / 2;
const TOWER_TOP = TURBINE_BASE.y - 96;
const HUB = { x: TOWER_LEFT + TOWER_HUB.x, y: TOWER_TOP + TOWER_HUB.y };
/** Where the spinning rotor's shadow falls (low sun from the top-left, as on the trees). */
const ROTOR_SHADOW = { dx: 22, dy: 64 };

function Rotor({ faction, k, x, y, shadow = false }: TurbineProps & { x: number; y: number; shadow?: boolean }): React.JSX.Element {
  const size = ROTOR_SIZE * k;
  return (
    <div
      data-testid={shadow ? 'launch-rotor-shadow' : 'launch-rotor'}
      className="launch-px launch-rotor absolute"
      style={
        {
          left: (x - ROTOR_SIZE / 2) * k,
          top: (y - ROTOR_SIZE / 2) * k,
          width: size,
          height: size,
          backgroundImage: `url(${sceneAsset(`rotor-${faction}`)})`,
          backgroundSize: `${size * ROTOR_FRAMES}px ${size}px`,
          backgroundRepeat: 'no-repeat',
          '--sheet-w': `${size * ROTOR_FRAMES}px`,
          ...(shadow ? { filter: 'brightness(0)', opacity: 0.28 } : {})
        } as React.CSSProperties
      }
    />
  );
}

/** Wind turbine generating power: spinning rotor, its moving shadow, and an energy spark down the tower. */
export function Turbine({ faction, k }: TurbineProps): React.JSX.Element {
  const fall = TURBINE_BASE.y - 10 - HUB.y;
  return (
    <div data-testid="launch-turbine" data-faction={faction} className="absolute inset-0" style={{ zIndex: 20 }}>
      <Rotor faction={faction} k={k} x={HUB.x + ROTOR_SHADOW.dx} y={HUB.y + ROTOR_SHADOW.dy} shadow />
      <img
        src={sceneAsset(`tower-${faction}`)}
        alt=""
        draggable={false}
        className="launch-px absolute select-none"
        style={{ left: TOWER_LEFT * k, top: TOWER_TOP * k, width: TURBINE_TOWER.w * k, height: TURBINE_TOWER.h * k }}
      />
      <div
        className="launch-spark absolute"
        style={
          {
            left: (HUB.x - 1) * k,
            top: (HUB.y + 4) * k,
            width: 2 * k,
            height: 2 * k,
            background: '#fde68a',
            boxShadow: `0 0 0 ${k}px rgba(251, 191, 36, 0.45)`,
            '--fall': `${fall * k}px`,
            '--steps': String(Math.round(fall / 2))
          } as React.CSSProperties
        }
      />
      <div
        className="launch-glow absolute"
        style={{
          left: (TURBINE_BASE.x - 11) * k,
          top: (TURBINE_BASE.y - 13) * k,
          width: 22 * k,
          height: 6 * k,
          border: `${k}px solid #fbbf24`,
          opacity: 0
        }}
      />
      <Rotor faction={faction} k={k} x={HUB.x} y={HUB.y} />
    </div>
  );
}
