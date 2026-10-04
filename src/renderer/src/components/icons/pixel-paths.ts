import { colorOf, type FactionShades } from './palette';

export interface ColorPath {
  color: string;
  d: string;
}

const cache = new Map<string, ColorPath[]>();

/**
 * Turns a character grid into one SVG path per colour (horizontal runs merged), offset by (x, y).
 * Hundreds of icons stay cheap this way: about 8 path elements per sprite instead of ~150 rects.
 */
export function gridToPaths(grid: readonly string[], shades: FactionShades, x = 0, y = 0): ColorPath[] {
  const key = `${grid.join('/')}|${shades.f}|${x},${y}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const byColor = new Map<string, string[]>();
  grid.forEach((row, ry) => {
    let start = 0;
    for (let rx = 1; rx <= row.length; rx++) {
      if (rx < row.length && row[rx] === row[start]) continue;
      const color = colorOf(row[start]!, shades);
      if (color) {
        const parts = byColor.get(color) ?? [];
        parts.push(`M${x + start} ${y + ry}h${rx - start}v1h-${rx - start}z`);
        byColor.set(color, parts);
      }
      start = rx;
    }
  });

  const paths = [...byColor].map(([color, parts]) => ({ color, d: parts.join('') }));
  cache.set(key, paths);
  return paths;
}
