/**
 * Pixel-art wind turbines for the launcher scene (T06.14): a static tower and a rotor rendered at
 * 24 angles (5° apart, one third of a turn) so the blades spin crisply instead of being rotated by
 * CSS. Shapes follow the in-game Armada (slim pole, blue claw feet) and Cortex (dark angular tower,
 * fin, red hex platform) wind turbines. Drawn as SVG with crisp edges, then pixel-finished.
 */
import sharp from 'sharp';
import { hardenAlpha, rimLight, selOutline, type Rgba } from '../lib/pixel-art';
import {
  ROTOR_FRAMES,
  ROTOR_SIZE,
  ROTOR_STEP_DEG,
  TOWER_HUB,
  TURBINE_TOWER
} from '../../src/core/launch/scene-layout';

export type Faction = 'armada' | 'cortex';

const TOWER_SVG: Record<Faction, string> = {
  armada: `
    <path d="M24 82 L6 94 L8 98 L24 89 L40 98 L42 94 Z" fill="#2f6fd6"/>
    <path d="M24 85 L14 97 L18 99 L24 92 L30 99 L34 97 Z" fill="#1d3f86"/>
    <path d="M24 82 L24 89 L40 98 L42 94 Z" fill="#1d4f91"/>
    <rect x="17" y="78" width="14" height="8" fill="#3a3f4a"/>
    <rect x="17" y="78" width="14" height="2" fill="#6b7480"/>
    <path d="M21 80 L22.5 22 L25.5 22 L27 80 Z" fill="#aab3bd"/>
    <path d="M24.2 80 L24.2 22 L25.5 22 L27 80 Z" fill="#6b7480"/>
    <rect x="21.5" y="48" width="5" height="3" fill="#fbbf24"/>
    <rect x="21.5" y="51" width="5" height="3" fill="#2f6fd6"/>
    <rect x="21" y="66" width="6" height="2" fill="#2f6fd6"/>
    <rect x="18" y="15" width="13" height="9" fill="#59616d"/>
    <rect x="18" y="15" width="13" height="3" fill="#8b95a1"/>
    <rect x="29" y="17" width="4" height="5" fill="#3a3f4a"/>`,
  cortex: `
    <path d="M6 90 L13 83 L35 83 L42 90 L35 97 L13 97 Z" fill="#8f1426"/>
    <path d="M9 89 L14 85 L34 85 L39 89 L34 92 L14 92 Z" fill="#ff2244"/>
    <path d="M14 92 L34 92 L35 97 L13 97 Z" fill="#5c0d18"/>
    <rect x="16" y="76" width="16" height="9" fill="#2b2f36"/>
    <rect x="16" y="76" width="16" height="2" fill="#4b5260"/>
    <path d="M18 78 L21 24 L27 24 L30 78 Z" fill="#3e444f"/>
    <path d="M24.5 78 L24.5 24 L27 24 L30 78 Z" fill="#23262c"/>
    <rect x="19.5" y="40" width="9" height="2" fill="#23262c"/>
    <rect x="18.5" y="58" width="11" height="2" fill="#23262c"/>
    <rect x="21" y="30" width="6" height="3" fill="#ff2244"/>
    <path d="M26 2 L30 4 L30 22 L26 24 Z" fill="#23262c"/>
    <path d="M26 2 L28 3 L28 22 L26 23 Z" fill="#3e444f"/>
    <rect x="17" y="15" width="13" height="9" fill="#2b2f36"/>
    <rect x="17" y="15" width="13" height="2" fill="#4b5260"/>
    <rect x="18" y="18" width="3" height="2" fill="#ff2244"/>`
};

/** One blade pointing up from the hub (local coordinates); light leading edge, dark trailing edge. */
const BLADE: Record<Faction, { body: string; edge: string; light: string; dark: string; hub: string; hubLight: string }> = {
  armada: {
    body: 'M-2 -4 L2 -4 L1.6 -20 L0.6 -34 L-0.6 -34 L-1.6 -20 Z',
    edge: 'M0.3 -4 L2 -4 L1.6 -20 L0.6 -34 L0.2 -34 Z',
    light: '#d4dbe2',
    dark: '#7b8591',
    hub: '#2f6fd6',
    hubLight: '#9cc9f5'
  },
  cortex: {
    body: 'M-2.6 -4 L2.6 -4 L2.2 -18 L1 -33 L-1 -33 L-2.2 -18 Z',
    edge: 'M0.3 -4 L2.6 -4 L2.2 -18 L1 -33 L0.2 -33 Z',
    light: '#8a93a0',
    dark: '#3e444f',
    hub: '#ff2244',
    hubLight: '#ff8a9b'
  }
};

function svgDoc(w: number, h: number, body: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`
  );
}

async function rasterise(svg: Buffer): Promise<Rgba> {
  const { data, info } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function toPng(img: Rgba, colors = 24): Promise<Buffer> {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .png({ palette: true, colors, dither: 0, compressionLevel: 9 })
    .toBuffer();
}

export async function towerPng(faction: Faction): Promise<Buffer> {
  const img = await rasterise(svgDoc(TURBINE_TOWER.w, TURBINE_TOWER.h, TOWER_SVG[faction]));
  hardenAlpha(img);
  selOutline(img, 0.3);
  rimLight(img, 0.12);
  return toPng(img);
}

function rotorSvg(faction: Faction, angle: number): Buffer {
  const b = BLADE[faction];
  const c = ROTOR_SIZE / 2;
  const blades = [0, 120, 240]
    .map(
      (a) => `<g transform="rotate(${angle + a})"><path d="${b.body}" fill="${b.light}"/><path d="${b.edge}" fill="${b.dark}"/></g>`
    )
    .join('');
  return svgDoc(
    ROTOR_SIZE,
    ROTOR_SIZE,
    `<g transform="translate(${c} ${c})">${blades}<rect x="-3" y="-3" width="6" height="6" fill="${b.hub}"/><rect x="-2" y="-2" width="2" height="2" fill="${b.hubLight}"/></g>`
  );
}

/** Sprite sheet: ROTOR_FRAMES frames side by side, each ROTOR_SIZE square, rotating clockwise. */
export async function rotorSheetPng(faction: Faction): Promise<Buffer> {
  const frames: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let i = 0; i < ROTOR_FRAMES; i++) {
    const img = await rasterise(rotorSvg(faction, i * ROTOR_STEP_DEG));
    hardenAlpha(img);
    selOutline(img, 0.3);
    frames.push({ input: await toPng(img, 12), left: i * ROTOR_SIZE, top: 0 });
  }
  return sharp({
    create: { width: ROTOR_SIZE * ROTOR_FRAMES, height: ROTOR_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(frames)
    .png({ palette: true, colors: 24, dither: 0, compressionLevel: 9 })
    .toBuffer();
}

export { TOWER_HUB };
