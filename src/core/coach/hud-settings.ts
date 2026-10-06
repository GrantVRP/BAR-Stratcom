import type { CoachHud } from '../schemas/protocol';
import type { HudBoxesSettings, HudSettings } from '../schemas/settings';
import type { Registry } from '../registry';
import { buildRadarBox } from './hud-boxes';

export const HUD_BOXES_ALL: HudBoxesSettings = { build: true, factory: true, radar: true };

/** The boxes to show (Settings → hud.boxes; all when not set yet). */
export function hudBoxes(settings: HudSettings | undefined): HudBoxesSettings {
  return settings?.boxes ?? HUD_BOXES_ALL;
}

/**
 * Applies the player's HUD choices to what the coach sends (T09.6): Widget HUD Display off hides the
 * HUD; a box switched off is not sent, so the widget closes the gap (alerts stay).
 */
export function applyHudSettings(hud: CoachHud, settings: HudSettings | undefined): CoachHud {
  const boxes = hudBoxes(settings);
  return {
    ...hud,
    visible: hud.visible && settings?.enabled !== false,
    ...(boxes.build ? {} : { build: null }),
    ...(boxes.factory ? {} : { factory: null }),
    ...(boxes.radar ? {} : { radar: null })
  };
}

/** Radar mode (owner request T09.6): no plan, the widget shows only the radar box. */
export function buildRadarModeHud(
  enemies: Readonly<Record<string, number>>,
  seenAt: Readonly<Record<string, number>>,
  registry: Registry,
  clock: number
): CoachHud {
  return {
    visible: true,
    title: 'RADAR',
    lines: [],
    progress: null,
    build: null,
    factory: null,
    radar: buildRadarBox(enemies, seenAt, registry, clock),
    alerts: []
  };
}
