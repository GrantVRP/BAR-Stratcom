/**
 * Pixel-art finishing passes on raw RGBA buffers (T10.5): hard alpha, stray-pixel cleanup,
 * selective coloured outline ("sel-out") and a top-left rim light, the hallmarks of 32-bit
 * hand-made sprites. Pure functions so they can be unit-tested without image files.
 */

export interface Rgba {
  data: Uint8ClampedArray | Buffer;
  width: number;
  height: number;
}

const OFFSETS4: Array<[number, number]> = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1]
];

function idx(img: Rgba, x: number, y: number): number {
  return (y * img.width + x) * 4;
}

function opaque(img: Rgba, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return false;
  return img.data[idx(img, x, y) + 3]! > 0;
}

/** Pixel art has no soft edges: alpha becomes 0 or 255. */
export function hardenAlpha(img: Rgba, threshold = 128): void {
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i]! >= threshold ? 255 : 0;
}

/** Removes opaque pixels with fewer than `minNeighbours` opaque 4-neighbours (specks, noise). */
export function removeStrays(img: Rgba, minNeighbours = 1): number {
  const drop: number[] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!opaque(img, x, y)) continue;
      const n = OFFSETS4.filter(([dx, dy]) => opaque(img, x + dx, y + dy)).length;
      if (n < minNeighbours) drop.push(idx(img, x, y));
    }
  }
  for (const i of drop) img.data[i + 3] = 0;
  return drop.length;
}

/**
 * Adds a 1-px outline outside the silhouette. Each outline pixel takes the colour of the sprite
 * pixel it touches, darkened and pushed slightly towards blue, instead of flat black (sel-out).
 */
export function selOutline(img: Rgba, darkness = 0.32): number {
  const add: Array<[number, number, number, number]> = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (opaque(img, x, y)) continue;
      const src = OFFSETS4.find(([dx, dy]) => opaque(img, x + dx, y + dy));
      if (!src) continue;
      const s = idx(img, x + src[0], y + src[1]);
      add.push([
        idx(img, x, y),
        Math.round(img.data[s]! * darkness),
        Math.round(img.data[s + 1]! * darkness),
        Math.min(255, Math.round(img.data[s + 2]! * darkness + 18))
      ]);
    }
  }
  for (const [i, r, g, b] of add) {
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = 255;
  }
  return add.length;
}

/** Brightens sprite pixels whose top or left neighbour is empty (light from the top-left). */
export function rimLight(img: Rgba, amount = 0.22): void {
  const lit: number[] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!opaque(img, x, y)) continue;
      if (!opaque(img, x, y - 1) || !opaque(img, x - 1, y)) lit.push(idx(img, x, y));
    }
  }
  for (const i of lit) {
    for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(img.data[i + c]! + (255 - img.data[i + c]!) * amount);
  }
}

/** Bounding box of pixels with alpha ≥ threshold, or null when there are none. */
export function alphaBounds(img: Rgba, threshold: number): { left: number; top: number; width: number; height: number } | null {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[idx(img, x, y) + 3]! < threshold) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? null : { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h /= 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255].map(Math.round) as [number, number, number];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number): number => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => Math.round(v * 255)) as [number, number, number];
}

const GREY_SATURATION = 0.18;
const STEEL_HUE = 0.6;
const STEEL_SATURATION = 0.1;

/**
 * Cel-style shading: lightness snaps to `bands` steps (hue and saturation kept), like the hand-picked
 * colour ramps of 32-bit sprites. `lift` raises the darkest step so dark armour stays readable.
 */
export function bandLightness(img: Rgba, bands = 6, lift = 0.1): void {
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!);
    const step = Math.min(bands - 1, Math.floor(l * bands));
    const banded = lift + (1 - lift) * ((step + 0.5) / bands);
    // Near-greys have no stable hue: give them one cool steel ramp instead of random tints
    const grey = s < GREY_SATURATION;
    const [r, g, b] = hslToRgb(grey ? STEEL_HUE : h, grey ? STEEL_SATURATION : Math.min(1, s * 1.1), banded);
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
  }
}

/**
 * Removes single-pixel noise inside the sprite: a pixel whose colour matches none of its 4
 * neighbours takes the most common neighbour colour (clean colour clusters, no "photo" grain).
 */
export function smoothClusters(img: Rgba): number {
  const key = (i: number): number => (img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!;
  const changes: Array<[number, number]> = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!opaque(img, x, y)) continue;
      const here = key(idx(img, x, y));
      const around = OFFSETS4.filter(([dx, dy]) => opaque(img, x + dx, y + dy)).map(([dx, dy]) =>
        key(idx(img, x + dx, y + dy))
      );
      if (around.length < 3 || around.includes(here)) continue;
      const counts = new Map<number, number>();
      for (const k of around) counts.set(k, (counts.get(k) ?? 0) + 1);
      const [best, n] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
      if (n >= 2) changes.push([idx(img, x, y), best]);
    }
  }
  for (const [i, k] of changes) {
    img.data[i] = (k >> 16) & 255;
    img.data[i + 1] = (k >> 8) & 255;
    img.data[i + 2] = k & 255;
  }
  return changes.length;
}
