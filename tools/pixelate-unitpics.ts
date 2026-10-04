/**
 * Turns the BAR unit pictures (by IceXuick and Floris, used with permission, STATUS Q-04) into
 * 32-bit style pixel sprites for the app (T10.5).
 *
 * Pipeline per unit: drop the soft ground shadow → crop to the unit → a little more saturation and
 * contrast → downscale to the sprite size → hard alpha → limited palette without dithering (clean
 * colour clusters) → remove stray pixels → coloured outline → top-left rim light → palette PNG.
 * Two sizes: 64 px (cards, dossier) and 32 px (timelines, small lists), each made from the original.
 *
 * Usage: npx tsx tools/pixelate-unitpics.ts   (after tools/fetch-unitpics.ts)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  alphaBounds,
  bandLightness,
  hardenAlpha,
  removeStrays,
  rimLight,
  selOutline,
  smoothClusters,
  type Rgba
} from './lib/pixel-art';

export interface PixelStyle {
  colors: number;
  /** Lightness steps; null keeps the original shading. */
  bands: number | null;
  /** Raises the darkest step (0–1). */
  lift: number;
}

export const SPRITE_STYLES: Record<64 | 32, PixelStyle> = {
  64: { colors: 28, bands: 7, lift: 0.08 },
  32: { colors: 20, bands: 6, lift: 0.08 }
};
/** Alpha below this (of 255) at full resolution is treated as the soft ground shadow. */
const SHADOW_ALPHA = 170;

async function raw(pipeline: ReturnType<typeof sharp>): Promise<Rgba> {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** One 32-bit style sprite of `size` × `size` from a unit picture. */
export async function pixelate(input: Buffer | string, size: 64 | 32, style: PixelStyle = SPRITE_STYLES[size]): Promise<Buffer> {
  const full = await raw(sharp(input));
  // The renders sit on a soft semi-transparent shadow; keep only the solid unit
  for (let i = 3; i < full.data.length; i += 4) if (full.data[i]! < SHADOW_ALPHA) full.data[i] = 0;
  const box = alphaBounds(full, 1);
  if (!box) throw new Error('empty unit picture');

  const inner = size - 2; // room for the 1-px outline on every side
  const unit = sharp(full.data, { raw: { width: full.width, height: full.height, channels: 4 } })
    .extract(box)
    .modulate({ saturation: 1.25, brightness: 1.06 })
    .linear(1.12, -10)
    .resize(inner, inner, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 1, bottom: 1, left: 1, right: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } });

  const small = await raw(unit);
  hardenAlpha(small);
  if (style.bands !== null) bandLightness(small, style.bands, style.lift);
  const quantised = await raw(
    sharp(await sharp(small.data, { raw: { width: size, height: size, channels: 4 } })
      .png({ palette: true, colors: style.colors, dither: 0 })
      .toBuffer())
  );
  hardenAlpha(quantised);
  smoothClusters(quantised);
  removeStrays(quantised);
  selOutline(quantised);
  rimLight(quantised);

  return sharp(quantised.data, { raw: { width: size, height: size, channels: 4 } })
    .png({ palette: true, colors: 64, dither: 0, compressionLevel: 9 })
    .toBuffer();
}

export async function main(
  rawDir = path.resolve(process.cwd(), 'data/raw/unitpics'),
  outDir = path.resolve(process.cwd(), 'src/renderer/src/assets/unitpics-32')
): Promise<void> {
  const files = fs.readdirSync(rawDir).filter((f) => /\.(webp|png)$/.test(f));
  for (const size of [64, 32] as const) fs.mkdirSync(path.join(outDir, String(size)), { recursive: true });
  for (const f of files) {
    const id = path.parse(f).name;
    for (const size of [64, 32] as const) {
      fs.writeFileSync(path.join(outDir, String(size), `${id}.png`), await pixelate(path.join(rawDir, f), size));
    }
  }
  console.log(`${files.length} units → ${outDir} (64 px and 32 px)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
