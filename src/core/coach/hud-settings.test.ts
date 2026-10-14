import { describe, expect, it } from 'vitest';
import type { Registry } from '../registry';
import { CoachHudSchema, type CoachHud } from '../schemas/protocol';
import { applyHudSettings, buildRadarModeHud, hudBoxes } from './hud-settings';

const box = { title: 'X', lines: [{ text: 'a', tone: 'info' as const }] };
const hud: CoachHud = {
  visible: true,
  title: 'T',
  lines: [],
  progress: null,
  build: box,
  factory: box,
  radar: { range: 2400, lines: [] },
  alerts: [{ text: 'ENERGY STALL', tone: 'danger' }]
};

describe('HUD settings', () => {
  it('all boxes are shown until the player chooses', () => {
    expect(hudBoxes(undefined)).toEqual({ build: true, factory: true, radar: true });
    expect(hudBoxes({ enabled: true })).toEqual({ build: true, factory: true, radar: true });
    expect(applyHudSettings(hud, { enabled: true })).toEqual(hud);
  });

  it('a box switched off is not sent; the alerts stay', () => {
    const out = applyHudSettings(hud, { enabled: true, boxes: { build: false, factory: true, radar: false } });
    expect(out.build).toBeNull();
    expect(out.factory).toEqual(box);
    expect(out.radar).toBeNull();
    expect(out.alerts).toEqual(hud.alerts);
  });

  it('Widget HUD Display off hides the HUD; a hidden HUD stays hidden', () => {
    expect(applyHudSettings(hud, { enabled: false }).visible).toBe(false);
    expect(applyHudSettings({ ...hud, visible: false }, { enabled: true }).visible).toBe(false);
  });

  it('radar mode: only the radar box', () => {
    const registry = { get: () => ({ name: 'Pawn' }) } as unknown as Registry;
    const out = buildRadarModeHud({ armpw: 1 }, { armpw: 0 }, registry, 60);
    expect(CoachHudSchema.safeParse(out).success).toBe(true);
    expect(out).toEqual(expect.objectContaining({ build: null, factory: null, alerts: [], lines: [] }));
    expect(out.radar?.lines).toEqual([{ text: '1× Pawn', tone: 'info', right: '1:00 ago' }]);
  });
});
