import type { Rgba } from './png';
import type { TextBitmap } from './pixel-font';

/**
 * The app icon (owner request, 2026-10-13): "BS", the B of BAR and the S of StratCom, in the logo's font
 * (Press Start 2P, read from the font file by tools/lib/pixel-font.ts). The B is white like the logo; the
 * S takes the faction's colour, so there is one icon per faction. A dark rounded tile with the panels'
 * frame keeps the white B readable on light title bars. Each font pixel becomes k × k icon pixels, the
 * largest whole k that leaves a margin, so the letters stay crisp at every size.
 */
type Color = [number, number, number, number];

const hex = (h: string): Color => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

export const ICON_COLORS = { ground: '#0a0c14', frame: '#2b3245', b: '#ffffff' };

/** Sizes in the Windows .ico (electron-builder needs 256). */
export const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

export interface IconLayout {
  /** Icon pixels per font pixel. */
  scale: number;
  left: number;
  top: number;
  /** Whether the frame ring is drawn (only when the letters leave a margin for it). */
  frame: boolean;
}

/** Small icons (title bar, taskbar) give the letters every pixel; larger ones keep room around them. */
export function iconLayout(text: TextBitmap, size: number): IconLayout {
  const margin = size <= 32 ? 1 : Math.ceil(size / 16) + 1;
  const scale = Math.max(1, Math.floor((size - 2 * margin) / text.width));
  const left = Math.floor((size - text.width * scale) / 2);
  const top = Math.floor((size - text.height * scale) / 2);
  return { scale, left, top, frame: left >= 2 && size - left - text.width * scale >= 2 };
}

function inTile(x: number, y: number, size: number, r: number): boolean {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** The icon at `size` px: `text` (the owner of each pixel is the index of its letter) with the B white
 * and every later letter in `accent`. */
export function appIcon(text: TextBitmap, accent: string, size: number): Rgba {
  const { scale, left, top, frame } = iconLayout(text, size);
  const radius = Math.max(1.5, size / 8);
  const [ground, edge, b, s] = [hex(ICON_COLORS.ground), hex(ICON_COLORS.frame), hex(ICON_COLORS.b), hex(accent)];
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [px, py] = [x + 0.5, y + 0.5];
      if (!inTile(px, py, size, radius)) continue;
      let c = frame && !inInner(px, py, size, radius) ? edge : ground;
      const col = Math.floor((x - left) / scale);
      const row = Math.floor((y - top) / scale);
      if (x >= left && y >= top && col < text.width && row < text.height) {
        const owner = text.owner[row * text.width + col]!;
        if (owner >= 0) c = owner === 0 ? b : s;
      }
      data.set(c, (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

/** Inside the tile shrunk by one pixel on every side: the frame is the ring between it and the tile. */
function inInner(x: number, y: number, size: number, r: number): boolean {
  if (x < 1 || y < 1 || x > size - 1 || y > size - 1) return false;
  const inner = Math.max(0.5, r - 1);
  const cx = Math.min(Math.max(x, 1 + inner), size - 1 - inner);
  const cy = Math.min(Math.max(y, 1 + inner), size - 1 - inner);
  return (x - cx) ** 2 + (y - cy) ** 2 <= inner * inner;
}
