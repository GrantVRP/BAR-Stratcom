/**
 * 32-bit style faction emblems from the BAR faction icons (sidepics/armada.png, sidepics/cortex.png
 * in the Beyond All Reason repository), used with permission (T10.6).
 *
 * The originals are flat 64 × 64 logos; the 32-bit look adds depth: bevelled edges lit from the
 * top-left, stepped top-to-bottom shading, a coloured outline and a small glint.
 *
 * Usage: npx tsx tools/pixelate-factions.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaBounds, bevel, glint, hardenAlpha, selOutline, verticalShade, type Rgba } from './lib/pixel-art';

const SOURCE = 'https://raw.githubusercontent.com/beyond-all-reason/Beyond-All-Reason/master/sidepics';
export const FACTION_ICONS = ['armada', 'cortex'] as const;

async function raw(pipeline: ReturnType<typeof sharp>): Promise<Rgba> {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** One 32-bit style emblem of `size` × `size` from a flat faction icon. */
export async function stylizeEmblem(input: Buffer | string, size: 64 | 32): Promise<Buffer> {
  const full = await raw(sharp(input));
  hardenAlpha(full);
  const box = alphaBounds(full, 1);
  if (!box) throw new Error('empty faction icon');
  const inner = size - 2;
  const scaled = await raw(
    sharp(full.data, { raw: { width: full.width, height: full.height, channels: 4 } })
      .extract(box)
      .resize(inner, inner, { fit: 'contain', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 1, bottom: 1, left: 1, right: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  );
  hardenAlpha(scaled);
  verticalShade(scaled, 4, size === 64 ? 0.16 : 0.12);
  bevel(scaled, size === 64 ? 2 : 1, 0.42);
  selOutline(scaled, 0.28);
  glint(scaled, size === 64 ? 3 : 2);
  return sharp(scaled.data, { raw: { width: size, height: size, channels: 4 } })
    .png({ palette: true, colors: 32, dither: 0, compressionLevel: 9 })
    .toBuffer();
}

export async function main(
  rawDir = path.resolve(process.cwd(), 'data/raw/factions'),
  outDir = path.resolve(process.cwd(), 'src/renderer/src/assets/factions-32')
): Promise<void> {
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const faction of FACTION_ICONS) {
    const file = path.join(rawDir, `${faction}.png`);
    if (!fs.existsSync(file)) {
      const res = await fetch(`${SOURCE}/${faction}.png`, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${faction}.png`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    for (const size of [64, 32] as const) {
      fs.writeFileSync(path.join(outDir, `${faction}-${size}.png`), await stylizeEmblem(file, size));
    }
  }
  console.log(`${FACTION_ICONS.length} faction emblems → ${outDir}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
