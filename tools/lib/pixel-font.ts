/**
 * Reads the letters of a pixel font straight from its WOFF file, so the app icon shows the logo's own
 * font (Press Start 2P) and not hand-drawn letters. WOFF 1.0 tables are zlib-compressed TrueType tables;
 * this reads `head`, `hhea`, `hmtx`, `cmap` (format 4), `loca` and `glyf` (simple glyphs). A pixel font
 * draws every glyph as straight-edged squares on a grid of `unitsPerEm / 8`, so sampling each grid cell's
 * centre against the outline (non-zero winding, as TrueType fills) gives the exact pixels.
 */
import zlib from 'node:zlib';

export interface Contour {
  x: number[];
  y: number[];
}

export interface TextBitmap {
  width: number;
  height: number;
  /** Per pixel, row by row from the top: the index of the character in the text that inks it, or -1. */
  owner: Int8Array;
}

interface Glyph {
  advance: number;
  contours: Contour[];
}

function tables(woff: Buffer): Map<string, Buffer> {
  if (woff.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 file');
  const out = new Map<string, Buffer>();
  const count = woff.readUInt16BE(12);
  for (let i = 0; i < count; i++) {
    const e = 44 + i * 20;
    const [offset, compLength, origLength] = [woff.readUInt32BE(e + 4), woff.readUInt32BE(e + 8), woff.readUInt32BE(e + 12)];
    const raw = woff.subarray(offset, offset + compLength);
    out.set(woff.toString('latin1', e, e + 4), compLength < origLength ? zlib.inflateSync(raw) : Buffer.from(raw));
  }
  return out;
}

function need(t: Map<string, Buffer>, tag: string): Buffer {
  const table = t.get(tag);
  if (!table) throw new Error(`font has no ${tag} table`);
  return table;
}

/** The glyph index of a character through the Windows Unicode (3, 1) format 4 cmap. */
function glyphIndex(cmap: Buffer, code: number): number {
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const r = 4 + i * 8;
    if (cmap.readUInt16BE(r) !== 3 || cmap.readUInt16BE(r + 2) !== 1) continue;
    const sub = cmap.readUInt32BE(r + 4);
    if (cmap.readUInt16BE(sub) !== 4) continue;
    const segs = cmap.readUInt16BE(sub + 6) / 2;
    const ends = sub + 14;
    const starts = ends + segs * 2 + 2;
    const deltas = starts + segs * 2;
    const ranges = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      if (cmap.readUInt16BE(ends + s * 2) < code) continue;
      const start = cmap.readUInt16BE(starts + s * 2);
      if (start > code) return 0;
      const delta = cmap.readInt16BE(deltas + s * 2);
      const range = cmap.readUInt16BE(ranges + s * 2);
      if (range === 0) return (code + delta) & 0xffff;
      const g = cmap.readUInt16BE(ranges + s * 2 + range + (code - start) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
  }
  throw new Error('font has no Unicode format 4 cmap');
}

function readGlyph(glyf: Buffer, start: number, end: number): Contour[] {
  if (end <= start) return [];
  const contours = glyf.readInt16BE(start);
  if (contours < 0) throw new Error('composite glyphs are not supported');
  const endPts = Array.from({ length: contours }, (_, i) => glyf.readUInt16BE(start + 10 + i * 2));
  const points = (endPts[contours - 1] ?? -1) + 1;
  let p = start + 10 + contours * 2;
  p += 2 + glyf.readUInt16BE(p);
  const flags: number[] = [];
  while (flags.length < points) {
    const f = glyf[p++]!;
    flags.push(f);
    if (f & 8) for (let r = glyf[p++]!; r > 0; r--) flags.push(f);
  }
  const coords = (short: number, same: number): number[] => {
    let v = 0;
    return flags.map((f) => {
      if (f & short) {
        v += f & same ? glyf[p++]! : -glyf[p++]!;
      } else if (!(f & same)) {
        v += glyf.readInt16BE(p);
        p += 2;
      }
      return v;
    });
  };
  const xs = coords(2, 16);
  const ys = coords(4, 32);
  if (flags.some((f) => !(f & 1))) throw new Error('curved outline: not a pixel font');
  let from = 0;
  return endPts.map((last) => {
    const c = { x: xs.slice(from, last + 1), y: ys.slice(from, last + 1) };
    from = last + 1;
    return c;
  });
}

/** Non-zero winding number of point (px, py) against closed straight-edged contours. */
export function inside(contours: Contour[], px: number, py: number): boolean {
  let winding = 0;
  for (const { x, y } of contours) {
    for (let i = 0; i < x.length; i++) {
      const j = (i + 1) % x.length;
      const [x0, y0, x1, y1] = [x[i]!, y[i]!, x[j]!, y[j]!];
      const side = (x1 - x0) * (py - y0) - (px - x0) * (y1 - y0);
      if (y0 <= py && y1 > py && side > 0) winding++;
      else if (y0 > py && y1 <= py && side < 0) winding--;
    }
  }
  return winding !== 0;
}

export class PixelFont {
  readonly unitsPerEm: number;
  /** Font units per pixel of the font's 8 × 8 grid. */
  readonly cell: number;
  private readonly t: Map<string, Buffer>;

  constructor(woff: Buffer) {
    this.t = tables(woff);
    this.unitsPerEm = need(this.t, 'head').readUInt16BE(18);
    this.cell = this.unitsPerEm / 8;
  }

  glyph(char: string): Glyph {
    const head = need(this.t, 'head');
    const loca = need(this.t, 'loca');
    const index = glyphIndex(need(this.t, 'cmap'), char.codePointAt(0)!);
    if (index === 0) throw new Error(`the font has no glyph for "${char}"`);
    const long = head.readInt16BE(50) === 1;
    const at = (i: number): number => (long ? loca.readUInt32BE(i * 4) : loca.readUInt16BE(i * 2) * 2);
    const metrics = need(this.t, 'hhea').readUInt16BE(34);
    const advance = need(this.t, 'hmtx').readUInt16BE(Math.min(index, metrics - 1) * 4);
    const contours = readGlyph(need(this.t, 'glyf'), at(index), at(index + 1));
    for (const v of [advance, ...contours.flatMap((c) => [...c.x, ...c.y])]) {
      if (v % this.cell !== 0) throw new Error(`"${char}" is off the font's pixel grid: not a pixel font`);
    }
    return { advance, contours };
  }

  /** The text set at one font pixel per bitmap pixel, cropped to its ink. */
  text(text: string): TextBitmap {
    const chars = [...text];
    const glyphs = chars.map((c) => this.glyph(c));
    const cols = glyphs.reduce((sum, g) => sum + g.advance, 0) / this.cell;
    const inked: Array<{ col: number; row: number; owner: number }> = [];
    let pen = 0;
    glyphs.forEach((g, owner) => {
      for (let col = 0; col < g.advance / this.cell; col++) {
        for (let row = -8; row < 8; row++) {
          if (inside(g.contours, (col + 0.5) * this.cell, (row + 0.5) * this.cell)) inked.push({ col: col + pen / this.cell, row, owner });
        }
      }
      pen += g.advance;
    });
    if (inked.length === 0 || cols === 0) return { width: 0, height: 0, owner: new Int8Array(0) };
    const [minCol, maxCol] = [Math.min(...inked.map((p) => p.col)), Math.max(...inked.map((p) => p.col))];
    const [minRow, maxRow] = [Math.min(...inked.map((p) => p.row)), Math.max(...inked.map((p) => p.row))];
    const width = maxCol - minCol + 1;
    const height = maxRow - minRow + 1;
    const owner = new Int8Array(width * height).fill(-1);
    // font rows grow upwards; bitmap rows grow downwards
    for (const p of inked) owner[(maxRow - p.row) * width + (p.col - minCol)] = p.owner;
    return { width, height, owner };
  }
}
