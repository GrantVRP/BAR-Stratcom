/**
 * Faction colour check for the 32-bit unit sprites (T10.7): how much of a sprite's saturated
 * "accent" paint is Armada blue versus Cortex red. Pure function over RGBA pixels.
 */
export interface AccentShare {
  blue: number;
  red: number;
  /** Accent pixels counted (saturated, mid lightness). */
  accent: number;
}

function hueSatLight(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h *= 60;
  return [h, s, l];
}

/** Blue = hue 195–255°, red = hue ≥ 340° or ≤ 15°, among saturated (≥ 0.45), mid-light (0.15–0.85) pixels. */
export function accentShare(data: Uint8Array | Uint8ClampedArray): AccentShare {
  let blue = 0;
  let red = 0;
  let accent = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! === 0) continue;
    const [h, s, l] = hueSatLight(data[i]!, data[i + 1]!, data[i + 2]!);
    if (s < 0.45 || l < 0.15 || l > 0.85) continue;
    accent++;
    if (h >= 195 && h <= 255) blue++;
    else if (h >= 340 || h <= 15) red++;
  }
  return { blue, red, accent };
}

/** The faction whose colour dominates the accent paint, or null when neither clearly does. */
export function dominantFaction(share: AccentShare): 'armada' | 'cortex' | null {
  if (share.blue + share.red < 4) return null;
  if (share.blue >= share.red * 1.5) return 'armada';
  if (share.red >= share.blue * 1.5) return 'cortex';
  return null;
}
