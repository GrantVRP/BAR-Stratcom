/**
 * DDS texture decoder for the launch-scene asset build (T06.15): DXT1, DXT3 and DXT5 (BC1–BC3) and
 * uncompressed 32-bit RGBA, decoding a chosen mip level only.
 */

export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface DdsInfo {
  width: number;
  height: number;
  mips: number;
  format: 'DXT1' | 'DXT3' | 'DXT5' | 'RGBA';
  dataOffset: number;
}

export function ddsInfo(buf: Buffer): DdsInfo {
  if (buf.toString('latin1', 0, 4) !== 'DDS ') throw new Error('Not a DDS file');
  const height = buf.readUInt32LE(12);
  const width = buf.readUInt32LE(16);
  const mips = Math.max(1, buf.readUInt32LE(28));
  const fourCC = buf.toString('latin1', 84, 88);
  const rgbBits = buf.readUInt32LE(88);
  let dataOffset = 128;
  let format: DdsInfo['format'];
  if (fourCC === 'DXT1' || fourCC === 'DXT3' || fourCC === 'DXT5') format = fourCC;
  else if (fourCC === 'DX10') throw new Error('DX10 DDS not supported');
  else if (rgbBits === 32) format = 'RGBA';
  else throw new Error(`Unsupported DDS format ${JSON.stringify(fourCC)}`);
  if (fourCC === 'DX10') dataOffset += 20;
  return { width, height, mips, format, dataOffset };
}

function blockBytes(format: DdsInfo['format']): number {
  return format === 'DXT1' ? 8 : 16;
}

function mipSize(info: DdsInfo, level: number): number {
  const w = Math.max(1, info.width >> level);
  const h = Math.max(1, info.height >> level);
  if (info.format === 'RGBA') return w * h * 4;
  return Math.max(1, Math.ceil(w / 4)) * Math.max(1, Math.ceil(h / 4)) * blockBytes(info.format);
}

function rgb565(c: number): [number, number, number] {
  return [((c >> 11) & 31) * 255 / 31, ((c >> 5) & 63) * 255 / 63, (c & 31) * 255 / 31];
}

function colourBlock(buf: Buffer, at: number, dxt1: boolean): Array<[number, number, number, number]> {
  const c0 = buf.readUInt16LE(at);
  const c1 = buf.readUInt16LE(at + 2);
  const [a, b] = [rgb565(c0), rgb565(c1)];
  const mix = (t: number): [number, number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    255
  ];
  const palette: Array<[number, number, number, number]> =
    !dxt1 || c0 > c1 ? [[...a, 255], [...b, 255], mix(1 / 3), mix(2 / 3)] : [[...a, 255], [...b, 255], mix(0.5), [0, 0, 0, 0]];
  const bits = buf.readUInt32LE(at + 4);
  return Array.from({ length: 16 }, (_, i) => palette[(bits >> (2 * i)) & 3]!);
}

function alphaDxt5(buf: Buffer, at: number): number[] {
  const a0 = buf[at]!;
  const a1 = buf[at + 1]!;
  const table =
    a0 > a1
      ? [a0, a1, ...[1, 2, 3, 4, 5, 6].map((i) => ((7 - i) * a0 + i * a1) / 7)]
      : [a0, a1, ...[1, 2, 3, 4].map((i) => ((5 - i) * a0 + i * a1) / 5), 0, 255];
  let bits = 0n;
  for (let i = 0; i < 6; i++) bits |= BigInt(buf[at + 2 + i]!) << BigInt(8 * i);
  return Array.from({ length: 16 }, (_, i) => table[Number((bits >> BigInt(3 * i)) & 7n)]!);
}

function alphaDxt3(buf: Buffer, at: number): number[] {
  return Array.from({ length: 16 }, (_, i) => ((buf[at + (i >> 1)]! >> ((i & 1) * 4)) & 15) * 17);
}

/** Decodes the largest mip level whose width is at most `maxWidth` (the full image by default). */
export function decodeDds(buf: Buffer, maxWidth = Infinity): RgbaImage {
  const info = ddsInfo(buf);
  let level = 0;
  let offset = info.dataOffset;
  while (level < info.mips - 1 && info.width >> level > maxWidth) {
    offset += mipSize(info, level);
    level++;
  }
  const width = Math.max(1, info.width >> level);
  const height = Math.max(1, info.height >> level);
  const data = new Uint8ClampedArray(width * height * 4);

  if (info.format === 'RGBA') {
    for (let i = 0; i < width * height; i++) {
      const p = offset + i * 4; // BGRA in file
      data.set([buf[p + 2]!, buf[p + 1]!, buf[p]!, buf[p + 3]!], i * 4);
    }
    return { width, height, data };
  }

  const bw = Math.max(1, Math.ceil(width / 4));
  const bh = Math.max(1, Math.ceil(height / 4));
  const size = blockBytes(info.format);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const at = offset + (by * bw + bx) * size;
      const alpha = info.format === 'DXT5' ? alphaDxt5(buf, at) : info.format === 'DXT3' ? alphaDxt3(buf, at) : null;
      const colours = colourBlock(buf, info.format === 'DXT1' ? at : at + 8, info.format === 'DXT1');
      for (let i = 0; i < 16; i++) {
        const x = bx * 4 + (i & 3);
        const y = by * 4 + (i >> 2);
        if (x >= width || y >= height) continue;
        const c = colours[i]!;
        data.set([c[0], c[1], c[2], alpha ? alpha[i]! : c[3]], (y * width + x) * 4);
      }
    }
  }
  return { width, height, data };
}
