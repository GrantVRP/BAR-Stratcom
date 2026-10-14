/**
 * Pixel-sprite palette for the original icon system. Sprites are 16 × 16 character
 * grids; each character is one pixel. Faction shades follow the design palette.
 */
import { factionAccent } from '../../lib/faction-style';

export const SPRITE_SIZE = 16;

export type FactionShades = { f: string; d: string; l: string };

const FACTION_SHADES: Record<string, FactionShades> = {
  armada: { f: factionAccent('armada'), d: '#1d4f91', l: '#9cc9f5' },
  cortex: { f: factionAccent('cortex'), d: '#8f1426', l: '#ff8a9b' },
  legion: { f: factionAccent('legion'), d: '#17635c', l: '#8de4dc' }
};

const NEUTRAL: FactionShades = { f: '#94a3b8', d: '#475569', l: '#cbd5e1' };

const FIXED: Record<string, string> = {
  k: '#05060a', // outline
  g: '#475569', // steel
  G: '#94a3b8', // metal
  w: '#e2e8f0', // highlight
  b: '#1e293b', // dark panel
  c: '#67e8f9', // glass / water / shield
  y: '#fbbf24', // energy
  Y: '#b45309', // energy, dark
  o: '#fb923c' // warning
};

/** Characters a sprite may use ('.' is transparent). */
export const PALETTE_CHARS = new Set(['.', 'f', 'd', 'l', ...Object.keys(FIXED)]);

export function shadesFor(factionId: string | null | undefined): FactionShades {
  return (factionId && FACTION_SHADES[factionId]) || NEUTRAL;
}

export function colorOf(char: string, shades: FactionShades): string | null {
  if (char === '.') return null;
  if (char === 'f' || char === 'd' || char === 'l') return shades[char];
  return FIXED[char] ?? null;
}
