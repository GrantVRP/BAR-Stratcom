/**
 * Launcher ground (T06.14): a region of the Greenest Fields map texture (by IceXuick) turned into
 * pixel art, with a wheel-rut dirt track along the runner's path and clusters of pixel conifers, the
 * three things that give the map its look.
 */
import sharp from 'sharp';
import { smoothClusters, type Rgba } from '../lib/pixel-art';
import { SCENE_H, SCENE_W, TURBINE_BASE, samplePath, type Point } from '../../src/core/launch/scene-layout';

/** Crop of the 4096² map texture (grass, ruts and the southern sand patch), 16:10. */
export const TEXTURE_CROP = { left: 1500, top: 2240, width: 2560, height: 1600 } as const;

type Rgb = [number, number, number];

function blend(img: Rgba, x: number, y: number, [r, g, b]: Rgb, a: number): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= img.width || yi >= img.height) return;
  const i = (yi * img.width + xi) * 4;
  img.data[i] = Math.round(img.data[i]! * (1 - a) + r * a);
  img.data[i + 1] = Math.round(img.data[i + 1]! * (1 - a) + g * a);
  img.data[i + 2] = Math.round(img.data[i + 2]! * (1 - a) + b * a);
}

const RUT_LIGHT: Rgb = [214, 199, 158];
const RUT_DARK: Rgb = [112, 98, 64];
const TRACK_GRASS: Rgb = [150, 160, 74];

/** Two wheel ruts 6 px apart with a worn strip between them, following the run path. */
export function drawTrack(img: Rgba): void {
  const pts = samplePath(1600);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!;
    const prev = pts[i - 1]!;
    const len = Math.hypot(p.x - prev.x, p.y - prev.y) || 1;
    const nx = -(p.y - prev.y) / len;
    const ny = (p.x - prev.x) / len;
    for (let o = -2; o <= 2; o++) blend(img, p.x + nx * o, p.y + ny * o, TRACK_GRASS, 0.12);
    for (const side of [-3, 3]) {
      blend(img, p.x + nx * side, p.y + ny * side, RUT_LIGHT, 0.55);
      blend(img, p.x + nx * (side + Math.sign(-side)), p.y + ny * (side + Math.sign(-side)), RUT_DARK, 0.3);
    }
  }
}

// Conifers: k outline, g body, G light (sun side), d dark (shade side), t trunk
const SMALL_TREE = [
  '....k....',
  '...kGk...',
  '...kgdk..',
  '..kGgdk..',
  '..kGggk..',
  '.kGggddk.',
  '..kGgdk..',
  '.kGgggdk.',
  'kGGgggddk',
  '.kGggddk.',
  'kGgggggdk',
  'kkkkkkkkk',
  '....t....',
  '....t....'
];
const BIG_TREE = [
  '......k......',
  '.....kGk.....',
  '.....kgdk....',
  '....kGgdk....',
  '....kGggk....',
  '...kGgggdk...',
  '....kGgdk....',
  '...kGggddk...',
  '..kGGgggddk..',
  '...kGgggdk...',
  '..kGgggggdk..',
  '.kGGggggdddk.',
  '..kGgggggdk..',
  '.kGgggggggdk.',
  'kGGgggggggddk',
  '.kGggggggddk.',
  'kkkkkkkkkkkkk',
  '......t......',
  '......t......',
  '......t......'
];
const TREE_COLOURS: Record<string, Rgb> = {
  k: [16, 30, 12],
  g: [38, 66, 24],
  G: [72, 106, 38],
  d: [26, 46, 18],
  t: [66, 46, 26]
};
const SHADOW: Rgb = [10, 20, 6];

function stampTree(img: Rgba, x: number, y: number, sprite: string[]): void {
  // shadow falls to the bottom-right, like the map's low sun
  sprite.forEach((row, ry) =>
    [...row].forEach((c, rx) => {
      if (c !== '.') blend(img, x + rx + 4, y + ry + 3, SHADOW, 0.5);
    })
  );
  sprite.forEach((row, ry) =>
    [...row].forEach((c, rx) => {
      const colour = TREE_COLOURS[c];
      if (colour) blend(img, x + rx, y + ry, colour, 1);
    })
  );
}

/** Deterministic PRNG so the scene is identical on every build. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tree clumps (centre, spread, count), kept clear of the track, the turbine and the UI panels. */
const CLUSTERS: Array<[Point, number, number]> = [
  [{ x: 22, y: 18 }, 26, 11],
  [{ x: 70, y: 6 }, 12, 4],
  [{ x: 16, y: 104 }, 16, 6],
  [{ x: 292, y: 112 }, 24, 10],
  [{ x: 214, y: 112 }, 12, 4],
  [{ x: 176, y: 10 }, 10, 3],
  [{ x: 60, y: 150 }, 10, 3]
];

export function plantTrees(img: Rgba, seed = 7): Array<Point & { big: boolean }> {
  const rand = mulberry32(seed);
  const track = samplePath(240);
  const planted: Array<Point & { big: boolean }> = [];
  for (const [centre, spread, count] of CLUSTERS) {
    let tries = 0;
    let placed = 0;
    while (placed < count && tries++ < 400) {
      const big = rand() < 0.45;
      const w = big ? 13 : 9;
      const h = big ? 20 : 14;
      const p = { x: centre.x + (rand() * 2 - 1) * spread, y: centre.y + (rand() * 2 - 1) * spread * 0.7, big };
      const foot = { x: p.x + w / 2, y: p.y + h };
      const nearTrack = track.some((t) => Math.hypot(t.x - foot.x, t.y - foot.y) < 13 || Math.hypot(t.x - foot.x, t.y - (p.y + h / 2)) < 10);
      const nearTurbine = Math.abs(foot.x - TURBINE_BASE.x) < 30 && foot.y < TURBINE_BASE.y + 12 && foot.y > TURBINE_BASE.y - 104;
      const crowded = planted.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < (big || q.big ? 8 : 6));
      if (nearTrack || nearTurbine || crowded) continue;
      planted.push(p);
      placed++;
    }
  }
  // draw back to front so lower trees overlap higher ones
  for (const p of [...planted].sort((a, b) => a.y + (a.big ? 20 : 14) - (b.y + (b.big ? 20 : 14)))) {
    stampTree(img, Math.round(p.x), Math.round(p.y), p.big ? BIG_TREE : SMALL_TREE);
  }
  return planted;
}

/**
 * Hand-pixelled grass: short vertical tufts (a light pixel over a dark one) scattered over green
 * pixels, so the field reads as drawn grass rather than a shrunken photo.
 */
export function grassTufts(img: Rgba, rand: () => number, density = 0.05): void {
  for (let y = 1; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const [r, g, b] = [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
      const green = g > r * 1.08 && g > b * 1.35;
      if (!green || rand() > density) continue;
      blend(img, x, y - 1, [Math.min(255, r + 34), Math.min(255, g + 38), Math.min(255, b + 10)], 0.7);
      blend(img, x, y, [r * 0.72, g * 0.74, b * 0.7], 0.7);
    }
  }
}

export async function groundPng(texture: string): Promise<Buffer> {
  const { data, info } = await sharp(texture)
    .extract(TEXTURE_CROP)
    .resize(SCENE_W, SCENE_H, { kernel: 'lanczos3' })
    .modulate({ saturation: 1.12, brightness: 1.04 })
    .png({ palette: true, colors: 18, dither: 0 })
    .toBuffer()
    .then((png) => sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
  const img: Rgba = { data, width: info.width, height: info.height };
  smoothClusters(img);
  grassTufts(img, mulberry32(11));
  drawTrack(img);
  plantTrees(img);
  return sharp(img.data, { raw: { width: SCENE_W, height: SCENE_H, channels: 4 } })
    .png({ palette: true, colors: 48, dither: 0, compressionLevel: 9 })
    .toBuffer();
}
