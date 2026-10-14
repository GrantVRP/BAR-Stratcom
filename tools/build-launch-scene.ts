/**
 * Builds the launcher scene assets into src/renderer/src/assets/launch/:
 *   ground.png                 320 × 200 Greenest Fields ground with the dirt track and trees
 *   tower-<faction>.png        wind turbine tower
 *   rotor-<faction>.png        24-frame rotor sprite sheet
 *   runner-<unit>-<size>.png   the Sprinter (armfast) / Fiend (corpyro) at the four depth sizes
 *   shadow-<size>.png          ground shadow under the runner
 *   cloud.png                  dithered cloud shadow drifting over the field
 *
 * Inputs (git-ignored): data/raw/greenest-fields/dry.webp (map texture, by IceXuick, from
 * beyondallreason.info/map/greenest-fields) and data/raw/unitpics/ (tools/fetch-unitpics.ts).
 *
 * Usage: npx tsx tools/build-launch-scene.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CLOUD, RUNNER_SIZES, shadowSize } from '../src/core/launch/scene-layout';
import { groundPng } from './launch/ground-art';
import { rotorSheetPng, towerPng, type Faction } from './launch/turbine-art';
import { pixelate } from './pixelate-unitpics';

export const RUNNER_UNIT: Record<Faction, string> = { armada: 'armfast', cortex: 'corpyro' };

function svg(w: number, h: number, body: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">${body}</svg>`
  );
}

/** A flat pixel ellipse for the ground shadow. */
export async function shadowPng(size: number): Promise<Buffer> {
  const { w, h } = shadowSize(size);
  return sharp(svg(w, h, `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="#0a1405"/>`))
    .png({ palette: true, colors: 2, compressionLevel: 9 })
    .toBuffer();
}

/** A soft-looking cloud shadow made of checkerboard dither (pixel-art transparency). */
export async function cloudPng(): Promise<Buffer> {
  const { w, h } = CLOUD;
  const blob = await sharp(
    svg(
      w,
      h,
      '<ellipse cx="50" cy="40" rx="44" ry="24" fill="#000"/><ellipse cx="88" cy="30" rx="40" ry="22" fill="#000"/><ellipse cx="96" cy="48" rx="34" ry="18" fill="#000"/>'
    )
  )
    .ensureAlpha()
    .raw()
    .toBuffer();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      blob[i + 3] = blob[i + 3]! > 128 && (x + y) % 2 === 0 ? 255 : 0;
      blob[i] = 8;
      blob[i + 1] = 18;
      blob[i + 2] = 4;
    }
  }
  return sharp(blob, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colors: 2 }).toBuffer();
}

export async function main(
  outDir = path.resolve(process.cwd(), 'src/renderer/src/assets/launch'),
  rawDir = path.resolve(process.cwd(), 'data/raw')
): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const write = (name: string, png: Buffer): void => fs.writeFileSync(path.join(outDir, name), png);

  write('ground.png', await groundPng(path.join(rawDir, 'greenest-fields/dry.webp')));
  write('cloud.png', await cloudPng());
  for (const faction of ['armada', 'cortex'] as const) {
    write(`tower-${faction}.png`, await towerPng(faction));
    write(`rotor-${faction}.png`, await rotorSheetPng(faction));
    const unit = RUNNER_UNIT[faction];
    for (const size of RUNNER_SIZES) {
      write(`runner-${unit}-${size}.png`, await pixelate(path.join(rawDir, 'unitpics', `${unit}.webp`), size));
    }
  }
  for (const size of RUNNER_SIZES) write(`shadow-${size}.png`, await shadowPng(size));
  console.log(`Launch scene assets → ${outDir}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
