import { describe, expect, it } from 'vitest';
import {
  alphaBounds,
  bandLightness,
  bevel,
  glint,
  hardenAlpha,
  removeStrays,
  rimLight,
  selOutline,
  smoothClusters,
  verticalShade,
  type Rgba
} from './pixel-art';

/** Builds an RGBA image from rows; '#' = opaque colour, '.' = transparent, other letters = given colours. */
function image(rows: string[], colours: Record<string, [number, number, number]> = { '#': [100, 120, 200] }): Rgba {
  const width = rows[0]!.length;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const [r, g, b] = colours[ch]!;
      data.set([r, g, b, 255], (y * width + x) * 4);
    })
  );
  return { data, width, height: rows.length };
}

const alphaRows = (img: Rgba): string[] =>
  Array.from({ length: img.height }, (_, y) =>
    Array.from({ length: img.width }, (_, x) => (img.data[(y * img.width + x) * 4 + 3]! > 0 ? '#' : '.')).join('')
  );

describe('pixel-art passes', () => {
  it('hardens soft alpha to 0 or 255', () => {
    const img: Rgba = { data: new Uint8ClampedArray([0, 0, 0, 90, 0, 0, 0, 200]), width: 2, height: 1 };
    hardenAlpha(img);
    expect([img.data[3], img.data[7]]).toEqual([0, 255]);
  });

  it('removes isolated specks but keeps connected shapes', () => {
    const img = image(['#....', '..##.', '..##.']);
    expect(removeStrays(img)).toBe(1);
    expect(alphaRows(img)).toEqual(['.....', '..##.', '..##.']);
  });

  it('draws a 1-px outline in a darkened version of the touching colour', () => {
    const img = image(['...', '.#.', '...']);
    expect(selOutline(img)).toBe(4);
    expect(alphaRows(img)).toEqual(['.#.', '###', '.#.']);
    const top = Array.from(img.data.slice(4, 8));
    expect(top).toEqual([32, 38, 82, 255]);
  });

  it('lights the top-left edge of the sprite', () => {
    const img = image(['##', '##']);
    rimLight(img, 0.5);
    expect(Array.from(img.data.slice(0, 3))).toEqual([178, 188, 228]);
    expect(Array.from(img.data.slice(12, 15))).toEqual([100, 120, 200]);
  });

  it('snaps lightness to steps and turns near-greys into one steel ramp', () => {
    const img = image(['ab'], { a: [128, 126, 120], b: [30, 60, 220] });
    bandLightness(img, 4, 0);
    const grey = Array.from(img.data.slice(0, 3));
    const blue = Array.from(img.data.slice(4, 7));
    expect(grey[2]).toBeGreaterThan(grey[0]!); // cool steel, not the original warm grey
    // (30, 60, 220) has lightness 0.49, so it snaps to the step centred on 0.375 and stays blue
    expect(blue[2]).toBeGreaterThan(150);
    expect(blue[0]).toBeLessThan(60);
  });

  it('replaces a lone off-colour pixel with its neighbours colour', () => {
    const img = image(['aaa', 'aba', 'aaa'], { a: [10, 20, 30], b: [200, 0, 0] });
    expect(smoothClusters(img)).toBe(1);
    expect(Array.from(img.data.slice(16, 19))).toEqual([10, 20, 30]);
  });

  it('finds the bounding box of opaque pixels', () => {
    expect(alphaBounds(image(['....', '.##.', '..#.']), 1)).toEqual({ left: 1, top: 1, width: 2, height: 2 });
    expect(alphaBounds(image(['..']), 1)).toBeNull();
  });

  it('bevels flat emblems: lit top-left edge, shaded bottom-right edge, untouched middle', () => {
    const img = image(['#####', '#####', '#####', '#####', '#####']);
    bevel(img, 1, 0.5);
    const px = (x: number, y: number): number => img.data[(y * 5 + x) * 4 + 2]!;
    expect(px(0, 0)).toBeGreaterThan(200); // lit
    expect(px(4, 4)).toBeLessThan(150); // shaded
    expect(px(2, 2)).toBe(200); // middle unchanged
  });

  it('shades emblems in steps from light (top) to dark (bottom) and adds a glint', () => {
    const img = image(['####', '####', '####', '####']);
    verticalShade(img, 2, 0.2);
    expect(img.data[2]!).toBeGreaterThan(img.data[(3 * 4) * 4 + 2]!);
    glint(img, 1);
    expect(Array.from(img.data.slice((1 * 4 + 1) * 4, (1 * 4 + 1) * 4 + 3))).toEqual([255, 255, 255]);
  });
});
