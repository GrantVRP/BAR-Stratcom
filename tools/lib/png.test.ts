import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ICO_SIZES } from './app-icon';
import { crc32, decodeApng, decodePng, encodeApng, encodeIco, encodePng, type Rgba } from './png';

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

/** An opaque sample with some noise, so the rows pick different filters. */
function opaque(width: number, height: number, seed = 1): Rgba {
  const data = new Uint8Array(width * height * 4);
  let r = seed;
  for (let i = 0; i < data.length; i += 4) {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    const p = i / 4;
    data.set([(p % width) * 9, Math.floor(p / width) * 7, r % 7 === 0 ? r & 0xff : 90, 255], i);
  }
  return { width, height, data };
}

function chunks(png: Buffer): Array<{ type: string; body: Buffer }> {
  const out: Array<{ type: string; body: Buffer }> = [];
  for (let pos = 8; pos < png.length; pos += 12 + png.readUInt32BE(pos)) {
    out.push({ type: png.toString('ascii', pos + 4, pos + 8), body: png.subarray(pos + 8, pos + 8 + png.readUInt32BE(pos)) });
  }
  return out;
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

  it('reads a filtered PNG, and an RGB one as opaque RGBA', () => {
    const img = opaque(40, 30);
    const apng = encodeApng([img], 10);
    // a plain PNG reader shows the APNG's first frame; its rows use more than one filter type
    expect(decodePng(apng)).toEqual(img);
    const raw = zlib.inflateSync(chunks(apng).find((c) => c.type === 'IDAT')!.body);
    expect(new Set(Array.from({ length: 30 }, (_, y) => raw[y * (40 * 4 + 1)])).size).toBeGreaterThan(1);

    // 2 × 1 RGB (colour type 2), one unfiltered row
    const rgb = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
    const ihdr = Buffer.from([0, 0, 0, 2, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
    const idat = zlib.deflateSync(Buffer.from([0, 10, 20, 30, 40, 50, 60]));
    for (const [type, data] of [['IHDR', ihdr], ['IDAT', idat], ['IEND', Buffer.alloc(0)]] as const) {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(data.length, 0);
      head.write(type, 4, 'ascii');
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
      rgb.push(head, data, crc);
    }
    expect(decodePng(Buffer.concat(rgb))).toEqual({ width: 2, height: 1, data: new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]) });
  });

  it('rejects a PNG with a damaged chunk', () => {
    const png = encodePng(sample(4));
    png[png.length - 20] = png[png.length - 20]! ^ 0xff;
    expect(() => decodePng(png)).toThrow(/bad CRC/);
  });

  it('an APNG plays back frame for frame, storing only what changed and merging repeats', () => {
    const a = opaque(32, 24, 1);
    const b = { ...a, data: a.data.slice() };
    b.data.set([255, 0, 0, 255], (5 * 32 + 7) * 4);
    b.data.set([0, 255, 0, 255], (9 * 32 + 12) * 4);
    const c = opaque(32, 24, 2);
    const apng = encodeApng([a, b, b, c], 25);
    const played = decodeApng(apng);
    expect(played.fps).toBe(25);
    expect(played.plays).toBe(0);
    expect(played.frames).toEqual([a, b, b, c]);
    const fctl = chunks(apng).filter((ch) => ch.type === 'fcTL').map((ch) => ch.body);
    expect(fctl).toHaveLength(3);
    // the second frame is just the rectangle around the two changed pixels, and lasts two ticks
    expect([fctl[1]!.readUInt32BE(4), fctl[1]!.readUInt32BE(8), fctl[1]!.readUInt32BE(12), fctl[1]!.readUInt32BE(16)]).toEqual([6, 5, 7, 5]);
    expect(fctl[1]!.readUInt16BE(20)).toBe(2);
    // chunk sequence numbers run 0, 1, 2, … over fcTL and fdAT
    const seq = chunks(apng).filter((ch) => ch.type === 'fcTL' || ch.type === 'fdAT').map((ch) => ch.body.readUInt32BE(0));
    expect(seq).toEqual(seq.map((_, i) => i));
  });

  it('refuses frames that are see-through or of different sizes', () => {
    expect(() => encodeApng([sample(8)], 10)).toThrow(/opaque/);
    expect(() => encodeApng([opaque(8, 8), opaque(9, 8)], 10)).toThrow(/size/);
  });
});
