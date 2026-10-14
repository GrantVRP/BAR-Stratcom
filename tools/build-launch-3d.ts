/**
 * Builds the 3D launch-scene assets into src/renderer/src/assets/launch3d/:
 *   model-<name>.json   S3O models (armfast, corpyro, armwin, corwin, Aleppo pines): piece tree with
 *                       interleaved vertices (x y z nx ny nz u v) and triangle indices, base64
 *   walk-<unit>.json    baked walk keyframes from the unit scripts (made by Beherith)
 *   tex-<name>.png      unit textures with the faction colour baked in, the tree texture (colour +
 *                       alpha from texture 2), the ground (map diffuse + the track)
 *
 * Inputs (git-ignored): data/raw/bar3d/ (BAR repo: objects3d/Units, unittextures, scripts/Units) and
 * data/raw/greenest-fields/sd7/ (the map archive, extracted) and data/raw/greenest-fields/dry.webp.
 *
 * Usage: npx tsx tools/build-launch-3d.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { GROUND_SIZE, TREE_MODELS, type WalkData } from '../src/core/launch/scene3d';
import { parseWalk } from './bar3d/bos-anim';
import { decodeDds, type RgbaImage } from './bar3d/dds';
import { flattenPieces, parseS3O } from './bar3d/s3o';
import { decodeTga } from './bar3d/tga';
import { groundTexture } from './bar3d/ground3d';
import { fxLibrary, unitDeath } from './bar3d/death-assets';

const RAW = path.resolve(process.cwd(), 'data/raw');
const OUT = path.resolve(process.cwd(), 'src/renderer/src/assets/launch3d');

/** Faction colours baked into the team-colour mask (texture alpha), as BAR's unit shader does. */
export const TEAM_COLOUR = { arm: [68, 155, 237], cor: [255, 34, 68] } as const;

/** Keyframe length at full speed: 33 ms × animSpeed (2 for the Sprinter, 3 for the Fiend) − 1. */
const MS_PER_KEYFRAME = { armfast: 65, corpyro: 98 } as const;

function b64(arr: Float32Array | Uint16Array | Uint32Array): string {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
}

export function modelJson(buf: Buffer): string {
  const model = parseS3O(buf);
  const pieces = flattenPieces(model).map(({ piece, parent }) => {
    const wide = piece.vertices.length / 8 > 65535;
    return {
      name: piece.name,
      parent,
      offset: piece.offset.map((v) => Math.round(v * 1000) / 1000),
      v: b64(piece.vertices),
      i: b64(wide ? piece.indices : Uint16Array.from(piece.indices)),
      i32: wide
    };
  });
  return JSON.stringify({ height: model.height, radius: model.radius, pieces });
}

/** Unit colour map with the team colour mixed in by the alpha mask (BAR: mix(diffuse, team, alpha)), then opaque. */
export function bakeTeamColour(img: RgbaImage, team: readonly [number, number, number]): RgbaImage {
  const data = new Uint8ClampedArray(img.data);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]! / 255;
    for (let c = 0; c < 3; c++) data[i + c] = data[i + c]! * (1 - a) + team[c]! * a;
    data[i + 3] = 255;
  }
  return { ...img, data };
}

/** S3O feature textures keep colour in texture 1 and transparency in the alpha of texture 2. */
export function treeTexture(colour: RgbaImage, other: RgbaImage): RgbaImage {
  if (colour.width !== other.width || colour.height !== other.height) throw new Error('tree textures differ in size');
  const data = new Uint8ClampedArray(colour.data);
  for (let i = 3; i < data.length; i += 4) data[i] = other.data[i]!;
  return { ...colour, data };
}

async function rgbaFrom(file: string): Promise<RgbaImage> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

async function png(img: RgbaImage, size: number, colours?: number): Promise<Buffer> {
  const resized = sharp(Buffer.from(img.data.buffer), { raw: { width: img.width, height: img.height, channels: 4 } }).resize(
    size,
    size,
    { kernel: 'lanczos3' }
  );
  return colours ? resized.png({ palette: true, colors: colours, dither: 0 }).toBuffer() : resized.png({ compressionLevel: 9 }).toBuffer();
}

/** S3O wreck textures → launch asset names (no team colour on wrecks). */
const WRECK_TEXTURE: Record<string, string> = { 'arm_wreck_color.dds': 'tex-arm-wreck', 'cor_color_wreck.dds': 'tex-cor-wreck' };

/** Unit deaths: Killed() / DeathAnim() data, wreck models and textures, the explosion effects. */
async function deathAssets(write: (name: string, data: string | Buffer) => void): Promise<void> {
  const raw = (f: string): Buffer => fs.readFileSync(path.join(RAW, 'bar3d/death', f));
  const text = (f: string): string => raw(f).toString('utf8');
  const fxNames: string[] = [];
  for (const unit of ['armfast', 'corpyro'] as const) {
    const bos = fs.readFileSync(path.join(RAW, 'bar3d', `${unit}.bos`), 'utf8');
    const { death, wreckModel } = unitDeath(unit, { bos, unitDefLua: text(`${unit}.lua`), unitExplosionsLua: text('Unit_Explosions.lua') });
    if (wreckModel) {
      const s3o = raw(`${wreckModel}.s3o`);
      write(`model-${wreckModel}.json`, modelJson(s3o));
      death.corpseTexture = WRECK_TEXTURE[parseS3O(s3o).texture1.toLowerCase()] ?? null;
    }
    write(`death-${unit}.json`, JSON.stringify(death));
    fxNames.push(death.fx);
  }
  write('fx-library.json', JSON.stringify(fxLibrary(fxNames, text('genericunitexplosion.lua'), text('burn.lua'))));
  const opaque = (img: RgbaImage): RgbaImage => {
    const data = new Uint8ClampedArray(img.data);
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    return { ...img, data };
  };
  write('tex-arm-wreck.png', await png(opaque(decodeDds(raw('Arm_wreck_color.dds'), 512)), 512, 96));
  write('tex-cor-wreck.png', await png(opaque(decodeDds(raw('cor_color_wreck.dds'), 512)), 512, 96));
}

export async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const write = (name: string, data: string | Buffer): void => fs.writeFileSync(path.join(OUT, name), data);
  const bar = (f: string): Buffer => fs.readFileSync(path.join(RAW, 'bar3d', f));
  const map = (f: string): Buffer => fs.readFileSync(path.join(RAW, 'greenest-fields/sd7', f));

  for (const m of ['armfast', 'corpyro', 'armwin', 'corwin']) write(`model-${m}.json`, modelJson(bar(`${m}.s3o`)));
  for (const t of TREE_MODELS) write(`model-${t}.json`, modelJson(map(`objects3d/${t}.s3o`)));

  for (const unit of ['armfast', 'corpyro'] as const) {
    const walk = parseWalk(bar(`${unit}.bos`).toString('utf8'));
    const data: WalkData = { msPerKeyframe: MS_PER_KEYFRAME[unit], loopFrom: walk.loopFrom, keyframes: walk.keyframes };
    write(`walk-${unit}.json`, JSON.stringify(data));
  }

  write('tex-arm.png', await png(bakeTeamColour(decodeDds(bar('Arm_color.dds'), 512), TEAM_COLOUR.arm), 512, 96));
  write('tex-cor.png', await png(bakeTeamColour(decodeDds(bar('cor_color.dds'), 512), TEAM_COLOUR.cor), 512, 96));
  write('tex-tree.png', await png(treeTexture(decodeTga(map('unittextures/ad0_aleppo2_1.tga')), decodeDds(map('unittextures/ad0_aleppo2_2.dds'), 1024)), 512));
  // The visible ground is the map's diffuse texture (from beyondallreason.info/map/greenest-fields);
  // the archive's *_albedo_specular.dds is the specular layer.
  write('tex-ground.png', await groundTexture(await rgbaFrom(path.join(RAW, 'greenest-fields/dry.webp')), GROUND_SIZE));
  await deathAssets(write);
  console.log(`3D launch assets → ${OUT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
