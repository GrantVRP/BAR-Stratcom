import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ROTOR_FRAMES, ROTOR_SIZE, TURBINE_BASE, TURBINE_TOWER, samplePath } from '../../src/core/launch/scene-layout';
import { drawTrack, mulberry32, plantTrees } from './ground-art';
import { rotorSheetPng, towerPng } from './turbine-art';

function blank(w = 320, h = 200): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set([60, 100, 30, 255], i);
  return { data, width: w, height: h };
}

describe('launch scene art (T06.14)', () => {
  it('is deterministic', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('draws the dirt track along the run path', () => {
    const img = blank();
    drawTrack(img);
    const onPath = samplePath(10).filter((p) => p.x >= 0 && p.y >= 0 && p.x < 320 && p.y < 200);
    const changed = onPath.some((p) => {
      const i = (Math.round(p.y) * 320 + Math.round(p.x)) * 4;
      return img.data[i] !== 60 || img.data[i + 1] !== 100;
    });
    expect(changed).toBe(true);
  });

  it('plants trees clear of the track and the turbine', () => {
    const trees = plantTrees(blank());
    expect(trees.length).toBeGreaterThan(25);
    const track = samplePath(240);
    for (const t of trees) {
      const foot = { x: t.x + (t.big ? 6.5 : 4.5), y: t.y + (t.big ? 20 : 14) };
      expect(track.every((p) => Math.hypot(p.x - foot.x, p.y - foot.y) >= 13)).toBe(true);
      const underTurbine = Math.abs(foot.x - TURBINE_BASE.x) < 30 && foot.y < TURBINE_BASE.y + 12 && foot.y > TURBINE_BASE.y - 104;
      expect(underTurbine).toBe(false);
    }
  });

  it('renders the tower and a 24-frame rotor sheet whose frames differ', async () => {
    expect(await sharp(await towerPng('cortex')).metadata()).toMatchObject({ width: TURBINE_TOWER.w, height: TURBINE_TOWER.h });
    const sheet = await rotorSheetPng('armada');
    expect(await sharp(sheet).metadata()).toMatchObject({ width: ROTOR_SIZE * ROTOR_FRAMES, height: ROTOR_SIZE });
    const frame = (i: number): Promise<Buffer> =>
      sharp(sheet).extract({ left: i * ROTOR_SIZE, top: 0, width: ROTOR_SIZE, height: ROTOR_SIZE }).raw().toBuffer();
    expect((await frame(0)).equals(await frame(6))).toBe(false);
  });
});
