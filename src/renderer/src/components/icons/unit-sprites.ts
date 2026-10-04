/**
 * 32-bit pixel versions of the BAR unit icons (T10.5). Original unit icons by IceXuick and Floris
 * (Beyond All Reason), used with their permission (STATUS Q-04); converted by
 * tools/pixelate-unitpics.ts. Units without a picture fall back to the original class sprites.
 */
const sprites64 = import.meta.glob('../../assets/unitpics-32/64/*.png', { eager: true, query: '?url', import: 'default' });
const sprites32 = import.meta.glob('../../assets/unitpics-32/32/*.png', { eager: true, query: '?url', import: 'default' });

export const UNIT_ART_CREDIT =
  'Unit art: 32-bit pixel versions of the Beyond All Reason unit icons by IceXuick and Floris, used with permission.';

function byUnitId(files: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [file, url] of Object.entries(files)) {
    const id = file.slice(file.lastIndexOf('/') + 1, -'.png'.length);
    map.set(id, String(url));
  }
  return map;
}

const SPRITES = { 64: byUnitId(sprites64), 32: byUnitId(sprites32) } as const;

/** The sprite closest to the display size (32 px art up to 32 px, 64 px art above), or null. */
export function unitSpriteUrl(unitId: string, displaySize: number): { url: string; nativeSize: 32 | 64 } | null {
  const id = unitId.toLowerCase();
  const preferred: 32 | 64 = displaySize <= 32 ? 32 : 64;
  for (const nativeSize of [preferred, preferred === 32 ? 64 : 32] as const) {
    const url = SPRITES[nativeSize].get(id);
    if (url) return { url, nativeSize };
  }
  return null;
}

export function unitSpriteCount(): number {
  return SPRITES[64].size;
}
