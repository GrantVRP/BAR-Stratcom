import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { appIcon, ICO_SIZES } from './app-icon';
import { crc32, encodeIco, encodePng, type Rgba } from './png';

/** Reads back an unfiltered RGBA PNG written by encodePng (checks every chunk CRC on the way). */
function decodePng(png: Buffer): Rgba {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    const body = png.subarray(pos + 8, pos + 8 + len);
    expect(png.readUInt32BE(pos + 8 + len)).toBe(crc32(png.subarray(pos + 4, pos + 8 + len)));
    if (type === 'IHDR') [width, height] = [body.readUInt32BE(0), body.readUInt32BE(4)];
    if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) data.set(raw.subarray(y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1)), y * width * 4);
  return { width, height, data };
}

describe('PNG and ICO writers (T11.4 app icon)', () => {
  it('crc32 matches the PNG spec check value', () => {
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
  });

  it('a PNG reads back pixel for pixel', () => {
    const img = appIcon(24);
    expect(decodePng(encodePng(img))).toEqual(img);
  });

  it('the ICO holds one PNG per size, 256 written as 0, offsets pointing at each image', () => {
    const images = ICO_SIZES.map(appIcon);
    const ico = encodeIco(images);
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, ICO_SIZES.length]);
    ICO_SIZES.forEach((size, i) => {
      const e = 6 + 16 * i;
      expect(ico[e]).toBe(size === 256 ? 0 : size);
      const png = ico.subarray(ico.readUInt32LE(e + 12), ico.readUInt32LE(e + 12) + ico.readUInt32LE(e + 8));
      expect(decodePng(png)).toEqual(images[i]);
    });
  });
});

describe('app icon (original pixel art)', () => {
  const at = (img: Rgba, x: number, y: number) => Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

  it('transparent corners, the commander in the middle, only palette colours (no blending)', () => {
    for (const size of ICO_SIZES) {
      const img = appIcon(size);
      expect(img.width).toBe(size);
      expect(at(img, 0, 0)[3]).toBe(0);
      expect(at(img, Math.floor(size / 2), Math.floor(size / 2))).toEqual([0xf4, 0xf4, 0xf5, 255]);
      for (let i = 3; i < img.data.length; i += 4) expect([0, 255]).toContain(img.data[i]);
    }
  });

  it('above 32 px it is the 32 px drawing enlarged pixel for pixel', () => {
    const small = appIcon(32);
    const big = appIcon(256);
    for (const [x, y] of [
      [3, 3],
      [16, 16],
      [21, 8],
      [27, 16]
    ] as const)
      expect(at(big, x * 8 + 4, y * 8 + 4)).toEqual(at(small, x, y));
  });
});
