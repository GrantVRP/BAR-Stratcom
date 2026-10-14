/**
 * Ground texture for the 3D launch scene: a grassy part of the Greenest Fields diffuse map
 * (by IceXuick) with the walking track drawn along PATH3D as two wide, pale sandy ruts with darker
 * worn edges, like the tracks in an in-game reference screenshot.
 */
import sharp from 'sharp';
import { mulberry32, samplePath3d } from '../../src/core/launch/scene3d';
import type { RgbaImage } from './dds';

/** The map is 16 × 16 map units = 8192 elmos; the diffuse map is 4096², so 2 elmos per texel. */
const ELMOS_PER_TEXEL = 2;
/** Centre of the cropped area on the diffuse map (texels): open meadow with a few old ruts. */
export const GROUND_CROP_CENTRE = { x: 980, y: 2560 } as const;
export const GROUND_TEXTURE_SIZE = 1024;

const SAND: [number, number, number] = [205, 186, 142];
const SAND_EDGE: [number, number, number] = [128, 110, 72];
const WORN: [number, number, number] = [126, 134, 64];

function blend(img: RgbaImage, x: number, y: number, c: [number, number, number], a: number): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= img.width || yi >= img.height) return;
  const i = (yi * img.width + xi) * 4;
  for (let k = 0; k < 3; k++) img.data[i + k] = img.data[i + k]! * (1 - a) + c[k]! * a;
}

/** Two ruts ±13 elmos from the centre line, ~9 elmos wide, ragged edges, worn grass between. */
export function drawRuts(img: RgbaImage, groundSize: number): void {
  const toTex = img.width / groundSize;
  const rand = mulberry32(19);
  const { points } = samplePath3d(5000);
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    const q = points[i - 1]!;
    const len = Math.hypot(p.x - q.x, p.z - q.z) || 1;
    const nx = -(p.z - q.z) / len;
    const nz = (p.x - q.x) / len;
    const cx = (p.x + groundSize / 2) * toTex;
    const cy = (p.z + groundSize / 2) * toTex;
    for (let o = -8; o <= 8; o++) blend(img, cx + nx * o * toTex, cy + nz * o * toTex, WORN, 0.12);
    for (const side of [-13, 13]) {
      const half = 4.5 + (rand() - 0.5) * 2.2;
      for (let o = -half - 1.5; o <= half + 1.5; o += 0.5) {
        const edge = Math.abs(o) > half;
        const x = cx + nx * (side + o) * toTex;
        const y = cy + nz * (side + o) * toTex;
        blend(img, x, y, edge ? SAND_EDGE : SAND, edge ? 0.35 : 0.82);
      }
    }
  }
}

export async function groundTexture(diffuse: RgbaImage, groundSize: number): Promise<Buffer> {
  const span = Math.round(groundSize / ELMOS_PER_TEXEL);
  const left = Math.round(GROUND_CROP_CENTRE.x - span / 2);
  const top = Math.round(GROUND_CROP_CENTRE.y - span / 2);
  const { data, info } = await sharp(Buffer.from(diffuse.data.buffer), {
    raw: { width: diffuse.width, height: diffuse.height, channels: 4 }
  })
    .extract({ left, top, width: span, height: span })
    .resize(GROUND_TEXTURE_SIZE, GROUND_TEXTURE_SIZE, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const img: RgbaImage = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  drawRuts(img, groundSize);
  return sharp(Buffer.from(img.data.buffer), { raw: { width: img.width, height: img.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
