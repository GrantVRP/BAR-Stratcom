import zlib from 'node:zlib';

/** An RGBA image: width × height, 4 bytes per pixel, rows top to bottom. */
export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** PNG, 8-bit RGBA, no filtering (PNG spec: IHDR, IDAT, IEND). */
export function encodePng(img: Rgba): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc((img.width * 4 + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    const row = y * (img.width * 4 + 1);
    raw[row] = 0; // filter: none
    raw.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4), row + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0))
  ]);
}

/** ICO with PNG-compressed entries (Windows Vista and later), one per image; 256 px is written as 0. */
export function encodeIco(images: Rgba[]): Buffer {
  const pngs = images.map(encodePng);
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const e = 6 + 16 * i;
    header[e] = img.width >= 256 ? 0 : img.width;
    header[e + 1] = img.height >= 256 ? 0 : img.height;
    header[e + 2] = 0; // palette size
    header[e + 3] = 0;
    header.writeUInt16LE(1, e + 4); // planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(pngs[i]!.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += pngs[i]!.length;
  });
  return Buffer.concat([header, ...pngs]);
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The PNG filter predictor (types 0–4) from the left, up and up-left bytes. */
function predict(type: number, left: number, up: number, upLeft: number): number {
  return type === 1 ? left : type === 2 ? up : type === 3 ? (left + up) >> 1 : type === 4 ? paeth(left, up, upLeft) : 0;
}

/** Undoes the PNG row filters of 8-bit pixels with `bpp` bytes each. */
function unfilter(raw: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const type = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? out[row + x - bpp]! : 0;
      const up = y > 0 ? out[row - stride + x]! : 0;
      const upLeft = y > 0 && x >= bpp ? out[row - stride + x - bpp]! : 0;
      out[row + x] = (raw[src + x]! + predict(type, left, up, upLeft)) & 0xff;
    }
  }
  return out;
}

/** Filters each RGBA row with whichever filter gives the smallest sum (the usual heuristic). */
function filterRows(img: Rgba): Buffer {
  const stride = img.width * 4;
  const out = Buffer.alloc((stride + 1) * img.height);
  const trial = new Uint8Array(stride);
  for (let y = 0; y < img.height; y++) {
    const row = y * stride;
    let best = Infinity;
    for (let type = 0; type < 5; type++) {
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const left = x >= 4 ? img.data[row + x - 4]! : 0;
        const up = y > 0 ? img.data[row - stride + x]! : 0;
        const upLeft = y > 0 && x >= 4 ? img.data[row - stride + x - 4]! : 0;
        const v = (img.data[row + x]! - predict(type, left, up, upLeft)) & 0xff;
        trial[x] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < best) {
        best = sum;
        out[y * (stride + 1)] = type;
        out.set(trial, y * (stride + 1) + 1);
      }
    }
  }
  return out;
}

function readChunks(png: Buffer): Array<{ type: string; body: Buffer }> {
  if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG');
  const chunks: Array<{ type: string; body: Buffer }> = [];
  for (let pos = 8; pos < png.length; ) {
    const len = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    if (png.readUInt32BE(pos + 8 + len) !== crc32(png.subarray(pos + 4, pos + 8 + len))) throw new Error(`PNG chunk ${type}: bad CRC`);
    chunks.push({ type, body: png.subarray(pos + 8, pos + 8 + len) });
    pos += 12 + len;
  }
  return chunks;
}

/** Reads an 8-bit RGB or RGBA PNG that is not interlaced (a screenshot, say) as RGBA. */
export function decodePng(png: Buffer): Rgba {
  const chunks = readChunks(png);
  const ihdr = chunks.find((c) => c.type === 'IHDR')!.body;
  const [width, height, depth, colour, interlace] = [ihdr.readUInt32BE(0), ihdr.readUInt32BE(4), ihdr[8], ihdr[9], ihdr[12]];
  if (depth !== 8 || (colour !== 2 && colour !== 6) || interlace !== 0) {
    throw new Error(`Unsupported PNG: bit depth ${depth}, colour type ${colour}, interlace ${interlace}`);
  }
  const bpp = colour === 6 ? 4 : 3;
  const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.body));
  const pixels = unfilter(zlib.inflateSync(idat), width, height, bpp);
  if (bpp === 4) return { width, height, data: pixels };
  const data = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) data.set([pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, 255], j);
  return { width, height, data };
}

function samePixel(a: Uint8Array, b: Uint8Array, i: number): boolean {
  return a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2];
}

/**
 * Animated PNG of opaque frames shown `fps` times a second, looping forever. The first frame is
 * also the still image; each later one stores only the rectangle that changed, with the unchanged
 * pixels in it left see-through and drawn over the frame before. A frame equal to the one before
 * just lengthens it. Browsers (and GitHub) play it; other viewers show the first frame.
 */
export function encodeApng(frames: Rgba[], fps: number): Buffer {
  const { width, height } = frames[0]!;
  for (const f of frames) {
    if (f.width !== width || f.height !== height) throw new Error('APNG frames differ in size');
    for (let i = 3; i < f.data.length; i += 4) if (f.data[i] !== 255) throw new Error('APNG frames must be opaque');
  }
  const shown: Array<{ x: number; y: number; img: Rgba; ticks: number }> = [{ x: 0, y: 0, img: frames[0]!, ticks: 1 }];
  for (let k = 1; k < frames.length; k++) {
    const prev = frames[k - 1]!.data;
    const cur = frames[k]!.data;
    let [x0, y0, x1, y1] = [width, height, -1, -1];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (samePixel(prev, cur, (y * width + x) * 4)) continue;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
    }
    if (x1 < 0) {
      shown[shown.length - 1]!.ticks++;
      continue;
    }
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = ((y0 + y) * width + x0 + x) * 4;
        if (!samePixel(prev, cur, i)) data.set(cur.subarray(i, i + 4), (y * w + x) * 4);
      }
    }
    shown.push({ x: x0, y: y0, img: { width: w, height: h, data }, ticks: 1 });
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(shown.length, 0);
  actl.writeUInt32BE(0, 4); // plays: forever
  const out: Buffer[] = [SIGNATURE, chunk('IHDR', ihdr), chunk('acTL', actl)];
  let seq = 0;
  shown.forEach((f, k) => {
    const fctl = Buffer.alloc(26);
    fctl.writeUInt32BE(seq++, 0);
    fctl.writeUInt32BE(f.img.width, 4);
    fctl.writeUInt32BE(f.img.height, 8);
    fctl.writeUInt32BE(f.x, 12);
    fctl.writeUInt32BE(f.y, 16);
    fctl.writeUInt16BE(f.ticks, 20); // delay: ticks / fps seconds
    fctl.writeUInt16BE(fps, 22);
    fctl[24] = 0; // dispose: keep
    fctl[25] = k === 0 ? 0 : 1; // blend: the first frame replaces everything, the rest draw over
    out.push(chunk('fcTL', fctl));
    const compressed = zlib.deflateSync(filterRows(f.img), { level: 9, memLevel: 9 });
    if (k === 0) {
      out.push(chunk('IDAT', compressed));
    } else {
      const seqNo = Buffer.alloc(4);
      seqNo.writeUInt32BE(seq++, 0);
      out.push(chunk('fdAT', Buffer.concat([seqNo, compressed])));
    }
  });
  out.push(chunk('IEND', new Uint8Array(0)));
  return Buffer.concat(out);
}

/** Plays an APNG written by encodeApng back into whole frames, one per tick (for checks and tests). */
export function decodeApng(png: Buffer): { frames: Rgba[]; fps: number; plays: number } {
  const chunks = readChunks(png);
  const ihdr = chunks.find((c) => c.type === 'IHDR')!.body;
  const [width, height] = [ihdr.readUInt32BE(0), ihdr.readUInt32BE(4)];
  const actl = chunks.find((c) => c.type === 'acTL')!.body;
  const canvas = new Uint8Array(width * height * 4);
  const frames: Rgba[] = [];
  let fps = 0;
  chunks.forEach((c, k) => {
    if (c.type !== 'fcTL') return;
    const b = c.body;
    const [w, h, x0, y0, ticks, blend] = [b.readUInt32BE(4), b.readUInt32BE(8), b.readUInt32BE(12), b.readUInt32BE(16), b.readUInt16BE(20), b[25]];
    fps = b.readUInt16BE(22);
    const next = chunks[k + 1]!;
    const img = unfilter(zlib.inflateSync(next.type === 'IDAT' ? next.body : next.body.subarray(4)), w, h, 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4;
        if (blend === 1 && img[s + 3] === 0) continue;
        canvas.set(img.subarray(s, s + 4), ((y0 + y) * width + x0 + x) * 4);
      }
    }
    for (let t = 0; t < ticks; t++) frames.push({ width, height, data: canvas.slice() });
  });
  return { frames, fps, plays: actl.readUInt32BE(4) };
}
