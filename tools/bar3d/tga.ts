/** TGA reader (types 2 and 10: 24/32-bit truecolour, raw or RLE) for map feature textures (T06.15). */
import type { RgbaImage } from './dds';

export function decodeTga(buf: Buffer): RgbaImage {
  const idLength = buf[0]!;
  const colorMapType = buf[1]!;
  const type = buf[2]!;
  const width = buf.readUInt16LE(12);
  const height = buf.readUInt16LE(14);
  const bpp = buf[16]!;
  const topDown = (buf[17]! & 0x20) !== 0;
  if (colorMapType !== 0 || (type !== 2 && type !== 10) || (bpp !== 24 && bpp !== 32)) {
    throw new Error(`Unsupported TGA (type ${type}, ${bpp} bpp)`);
  }
  const bytes = bpp / 8;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let at = 18 + idLength;
  let i = 0;
  const put = (p: number): void => {
    pixels.set([buf[p + 2]!, buf[p + 1]!, buf[p]!, bytes === 4 ? buf[p + 3]! : 255], i * 4);
    i++;
  };
  while (i < width * height) {
    if (type === 2) {
      put(at);
      at += bytes;
      continue;
    }
    const header = buf[at++]!;
    const count = (header & 0x7f) + 1;
    if (header & 0x80) {
      for (let n = 0; n < count && i < width * height; n++) put(at);
      at += bytes;
    } else {
      for (let n = 0; n < count && i < width * height; n++, at += bytes) put(at);
    }
  }
  if (topDown) return { width, height, data: pixels };
  const flipped = new Uint8ClampedArray(pixels.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) flipped.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
  return { width, height, data: flipped };
}
