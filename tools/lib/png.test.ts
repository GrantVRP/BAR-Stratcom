import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ICO_SIZES } from './app-icon';
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

/** A sample image: a colour ramp with see-through corners. */
function sample(size: number): Rgba {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const corner = (x === 0 || x === size - 1) && (y === 0 || y === size - 1);
      data.set([(x * 255) / size, (y * 255) / size, 128, corner ? 0 : 255], (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

describe('PNG and ICO writers', () => {
  it('crc32 matches the PNG spec check value', () => {
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
  });

  it('a PNG reads back pixel for pixel', () => {
    const img = sample(24);
    expect(decodePng(encodePng(img))).toEqual(img);
  });

  it('the ICO holds one PNG per size, 256 written as 0, offsets pointing at each image', () => {
    const images = ICO_SIZES.map(sample);
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
