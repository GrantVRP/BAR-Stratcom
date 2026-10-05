import { SRGBColorSpace, TextureLoader, type Texture } from 'three';

/**
 * 3D launch-scene assets made by tools/build-launch-3d.ts from BAR's game files: the Sprinter and
 * Fiend models and walk animations, the Armada and Cortex wind turbines, Greenest Fields' Aleppo
 * pines and ground. JSON is code-split and only loaded when the launcher needs it.
 */
const json = import.meta.glob<unknown>('../../assets/launch3d/*.json', { import: 'default' });
const png = import.meta.glob('../../assets/launch3d/*.png', { eager: true, query: '?url', import: 'default' });

function key(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1).replace(/\.(json|png)$/, '');
}

const jsonByName = new Map(Object.entries(json).map(([file, load]) => [key(file), load]));
const pngByName = new Map(Object.entries(png).map(([file, url]) => [key(file), String(url)]));

/** Models, walks, deaths and the effect library (each typed by its caller). */
export async function loadJson<T>(name: string): Promise<T> {
  const load = jsonByName.get(name);
  if (!load) throw new Error(`Launch 3D asset missing: ${name}.json (run npx tsx tools/build-launch-3d.ts)`);
  return (await load()) as T;
}

export async function loadTexture(name: string): Promise<Texture> {
  const url = pngByName.get(name);
  if (!url) throw new Error(`Launch 3D asset missing: ${name}.png (run npx tsx tools/build-launch-3d.ts)`);
  const texture = await new TextureLoader().loadAsync(url);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export const MODEL_CREDITS =
  'Launch scene 3D models: Sprinter (FireStorm, PtaQ), Fiend (Beherith, PtaQ), wind turbines, wrecks, Aleppo pines (Beherith, 0 A.D.); walk and death animations by Beherith; explosion effects from Beyond All Reason; Armada textures by Cremuss (CC BY-SA); Greenest Fields by IceXuick. Beyond All Reason models, textures and animations used with permission.';
