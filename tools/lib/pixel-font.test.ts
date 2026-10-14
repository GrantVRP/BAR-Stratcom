import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOGO_FONT } from '../make-icon';
import { inside, PixelFont, type TextBitmap } from './pixel-font';

function rows(bm: TextBitmap): string[] {
  return Array.from({ length: bm.height }, (_, r) =>
    Array.from(bm.owner.subarray(r * bm.width, (r + 1) * bm.width), (o) => (o < 0 ? '.' : String(o))).join('')
  );
}

describe('pixel font reader (window icon, owner request 2026-10-13)', () => {
  it('fills by non-zero winding: a square ring is solid, its hole is empty', () => {
    const outer = { x: [0, 3, 3, 0], y: [0, 0, 3, 3] }; // counter-clockwise
    const hole = { x: [1, 1, 2, 2], y: [1, 2, 2, 1] }; // clockwise
    expect(inside([outer, hole], 0.5, 0.5)).toBe(true);
    expect(inside([outer, hole], 1.5, 1.5)).toBe(false);
    expect(inside([outer, hole], 3.5, 1.5)).toBe(false);
  });

  it('reads Press Start 2P, the logo font, on its 8 × 8 pixel grid', () => {
    const font = new PixelFont(fs.readFileSync(LOGO_FONT));
    expect([font.unitsPerEm, font.cell]).toEqual([1000, 125]);
  });

  it('sets "BS" as the font does: two 7 × 7 letters one pixel apart, each pixel owned by its letter', () => {
    const bs = new PixelFont(fs.readFileSync(LOGO_FONT)).text('BS');
    expect([bs.width, bs.height]).toEqual([15, 7]);
    expect(rows(bs)).toEqual([
      '000000...11111.',
      '00...00.11...11',
      '00...00.11.....',
      '000000...11111.',
      '00...00......11',
      '00...00.11...11',
      '000000...11111.'
    ]);
  });

  it('a space has no ink; a file that is not WOFF is refused', () => {
    const font = new PixelFont(fs.readFileSync(LOGO_FONT));
    expect(font.text(' ')).toMatchObject({ width: 0, height: 0 });
    expect(() => new PixelFont(Buffer.from('not a font at all, just some bytes here', 'latin1'))).toThrow(/WOFF/);
  });
});
