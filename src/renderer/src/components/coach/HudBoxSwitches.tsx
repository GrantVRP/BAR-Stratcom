import React from 'react';
import type { HudBoxesSettings } from '../../../../core/schemas/settings';
import { hudBoxes } from '../../../../core/coach/hud-settings';
import { useSettings } from '../../stores';
import { Toggle } from '../ui/Toggle';

/** In the order the boxes stack in game, so the switches read like the HUD itself. */
const BOXES: Array<{ key: keyof HudBoxesSettings; label: string }> = [
  { key: 'build', label: 'BUILDINGS' },
  { key: 'factory', label: 'FACTORY' },
  { key: 'radar', label: 'RADAR' }
];

/**
 * IN-GAME HUD (owner request T09.6): show or hide each widget box while coaching; the change reaches
 * the game within half a second and is kept for next time (Settings → hud.boxes). A quiet, secondary
 * panel: the coaching content above it stays the focus.
 */
export function HudBoxSwitches(): React.JSX.Element {
  const hud = useSettings((s) => s.settings?.hud);
  const update = useSettings((s) => s.update);
  const enabled = hud?.enabled ?? true;
  const boxes = hudBoxes(hud);

  return (
    <div data-testid="hud-box-switches" className="rounded border border-[#27272a] bg-[#12131a] p-3 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#a1a1aa]">IN-GAME HUD</span>
        {BOXES.map(({ key, label }) => (
          <Toggle
            key={key}
            label={label}
            checked={boxes[key]}
            disabled={!enabled}
            onChange={(checked) => void update({ hud: { enabled, boxes: { ...boxes, [key]: checked } } })}
            data-testid={`hud-box-switch-${key}`}
            className="text-[11px] text-[#e4e4e7]"
          />
        ))}
      </div>
      {!enabled && <p className="mt-2 text-[11px] text-[#71717a]">The HUD is off (Settings → Coach → Widget HUD Display).</p>}
    </div>
  );
}
