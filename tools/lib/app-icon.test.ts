import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FACTION_ACCENTS } from '../../src/shared/faction-colors';
import { WINDOW_FACTIONS } from '../../src/shared/ipc';
import { iconFiles, LOGO_FONT } from '../make-icon';
import { appIcon, ICO_SIZES, ICON_COLORS, iconLayout } from './app-icon';
import { PixelFont } from './pixel-font';
import type { Rgba } from './png';

const text = new PixelFont(fs.readFileSync(LOGO_FONT)).text('BS');
const at = (img: Rgba, x: number, y: number): string => {
  const [r, g, b, a] = img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
  return a === 0 ? 'clear' : `#${[r, g, b].map((v) => v!.toString(16).padStart(2, '0')).join('')}`;
};

describe('app icon: "BS" in the logo font, the S in the faction colour (owner request 2026-10-13)', () => {
  it('small icons give the letters every pixel, larger ones keep a margin; the frame never touches them', () => {
    expect(iconLayout(text, 16)).toMatchObject({ scale: 1, frame: false });
    expect(iconLayout(text, 24)).toMatchObject({ scale: 1, frame: true });
    expect(iconLayout(text, 32)).toMatchObject({ scale: 2, frame: false });
    expect(iconLayout(text, 256)).toMatchObject({ scale: 14, left: 23, frame: true });
  });

  it('B is white, S is the faction colour, letters are whole k × k blocks; corners are clear', () => {
    for (const faction of WINDOW_FACTIONS) {
      const accent = FACTION_ACCENTS[faction]!;
      for (const size of ICO_SIZES) {
        const img = appIcon(text, accent, size);
        const { scale, left, top } = iconLayout(text, size);
        expect(at(img, 0, 0)).toBe('clear');
        for (let row = 0; row < text.height; row++) {
          for (let col = 0; col < text.width; col++) {
            const owner = text.owner[row * text.width + col]!;
            if (owner < 0) continue;
            const want = owner === 0 ? ICON_COLORS.b : accent;
            for (const [dx, dy] of [[0, 0], [scale - 1, scale - 1]] as const) {
              expect(at(img, left + col * scale + dx, top + row * scale + dy)).toBe(want);
            }
          }
        }
        const used = new Set<string>();
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) used.add(at(img, x, y));
        expect([...used].sort()).toEqual(['clear', ICON_COLORS.ground, ICON_COLORS.b, accent, ...(iconLayout(text, size).frame ? [ICON_COLORS.frame] : [])].sort());
      }
    }
  });

  it('the committed icons are what `npm run make:icon` draws now', () => {
    const files = iconFiles();
    expect([...files.keys()].sort()).toEqual(
      ['build/icon.ico', 'build/icon.png', ...WINDOW_FACTIONS.map((f) => `build/icons/stratcom-${f}.ico`)].sort()
    );
    for (const [file, bytes] of files) expect(fs.readFileSync(file).equals(bytes), file).toBe(true);
  });
});
