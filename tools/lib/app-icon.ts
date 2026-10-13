import type { Rgba } from './png';

/**
 * The app icon (T11.4, original art): a pixel radar scope — rings, a crosshair, the commander in the
 * middle, one friendly and two enemy blips — in the app's own colours (06 §3), on its dark ground.
 * Drawn from geometry on a 32-unit grid, so every size is drawn, not resampled; above 32 px the 32 px
 * drawing is enlarged pixel for pixel to keep the pixel-art look.
 */
type Color = [number, number, number, number];

const hex = (h: string, a = 255): Color => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];

const PALETTE = {
  ground: hex('#0a0c14'),
  frame: hex('#2b3245'),
  ring: hex('#4ade80'),
  innerRing: hex('#1f7a43'),
  cross: hex('#14532d'),
  commander: hex('#f4f4f5'),
  enemy: hex('#f87171'),
  friend: hex('#4ade80')
};

const CENTER = 16;
/** Blips as [x, y] grid cells (2 × 2 units each). */
const ENEMIES: Array<[number, number]> = [
  [21, 8],
  [8, 20]
];
const FRIEND: [number, number] = [19, 19];

function inRoundedSquare(u: number, v: number, min: number, max: number, r: number): boolean {
  if (u < min || u > max || v < min || v > max) return false;
  const cx = Math.min(Math.max(u, min + r), max - r);
  const cy = Math.min(Math.max(v, min + r), max - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}

/** The colour at grid point (u, v) of the 32-unit design, or null for transparent. */
function designAt(u: number, v: number): Color | null {
  if (!inRoundedSquare(u, v, 1, 31, 5)) return null;
  if (!inRoundedSquare(u, v, 2, 30, 4)) return PALETTE.frame;
  const inBox = (x: number, y: number, size: number): boolean => u >= x && u < x + size && v >= y && v < y + size;
  if (inBox(CENTER - 1.5, CENTER - 1.5, 3)) return PALETTE.commander;
  for (const [x, y] of ENEMIES) if (inBox(x, y, 2)) return PALETTE.enemy;
  if (inBox(FRIEND[0], FRIEND[1], 2)) return PALETTE.friend;
  const d = Math.hypot(u - CENTER, v - CENTER);
  if (Math.abs(d - 11) <= 0.85) return PALETTE.ring;
  if (Math.abs(d - 6) <= 0.6) return PALETTE.innerRing;
  if (d < 11 && (Math.abs(u - CENTER) <= 0.5 || Math.abs(v - CENTER) <= 0.5)) return PALETTE.cross;
  return PALETTE.ground;
}

function draw(size: number): Rgba {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = designAt(((x + 0.5) * 32) / size, ((y + 0.5) * 32) / size);
      if (c) data.set(c, (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

function enlarge(img: Rgba, factor: number): Rgba {
  const size = img.width * factor;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = (Math.floor(y / factor) * img.width + Math.floor(x / factor)) * 4;
      data.set(img.data.subarray(src, src + 4), (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

/** The icon at `size` px: drawn up to 32 (and at sizes that are not a multiple of 32), enlarged above. */
export function appIcon(size: number): Rgba {
  return size > 32 && size % 32 === 0 ? enlarge(draw(32), size / 32) : draw(size);
}

/** Sizes in the Windows .ico (electron-builder needs 256). */
export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
