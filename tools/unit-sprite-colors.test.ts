import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { accentShare, dominantFaction } from './lib/sprite-colors';

const SPRITES = path.join(process.cwd(), 'src/renderer/src/assets/unitpics-32/64');
const units = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/snapshots/test-31479-433a460/units.json'), 'utf8')
) as { units: Array<{ id: string; factionId: string | null }> };
const factionOf = new Map(units.units.map((u) => [u.id, u.factionId]));

/** Checked by eye against the originals: their accent colour is legitimately not the faction's. */
const KNOWN_EXCEPTIONS: Record<string, string> = {
  corsolar: 'Cortex Solar Collector has blue solar panels in the original art',
  corfdrag: "Shark's Teeth are bare steel with a bluish sheen",
  armdrag: "Dragon's Teeth: bare stone, no faction paint",
  cordrag: "Dragon's Teeth: bare stone, no faction paint",
  armfort: 'Fortification Wall: no faction paint',
  corfort: 'Fortification Wall: no faction paint',
  cormaw: "Dragon's Maw: no faction paint"
};

describe('unit sprite faction colours', () => {
  it('every sprite shows its own faction colour (Armada blue, Cortex red)', async () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const file of fs.readdirSync(SPRITES).filter((f) => f.endsWith('.png'))) {
      const id = path.parse(file).name;
      if (KNOWN_EXCEPTIONS[id]) continue;
      const { data } = await sharp(path.join(SPRITES, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const looks = dominantFaction(accentShare(data));
      if (looks !== factionOf.get(id)) wrong.push(`${id}: ${factionOf.get(id)} but looks ${looks}`);
      checked++;
    }
    expect(wrong).toEqual([]);
    expect(checked).toBe(370);
  });

  it('classifies accent paint by hue', () => {
    const px = (r: number, g: number, b: number, n: number): number[] => Array.from({ length: n }, () => [r, g, b, 255]).flat();
    expect(dominantFaction(accentShare(new Uint8Array(px(68, 155, 237, 10))))).toBe('armada');
    expect(dominantFaction(accentShare(new Uint8Array(px(255, 34, 68, 10))))).toBe('cortex');
    expect(dominantFaction(accentShare(new Uint8Array(px(128, 128, 128, 10))))).toBeNull();
    expect(dominantFaction(accentShare(new Uint8Array([...px(68, 155, 237, 5), ...px(255, 34, 68, 5)])))).toBeNull();
  });
});
