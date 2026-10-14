/**
 * Writes the app icons (owner request, 2026-10-13; tools/lib/app-icon.ts): "BS" in the logo's font,
 * the S in the faction's colour.
 *   build/icons/stratcom-<faction>.ico  — the window icon per faction (the app switches it at run time)
 *   build/icon.ico                       — the packaged exe's icon: Armada, the launcher's first faction
 *   build/icon.png                       — 512 px, for docs
 *
 *   npm run make:icon
 */
import fs from 'node:fs';
import path from 'node:path';
import { FACTION_ACCENTS } from '../src/shared/faction-colors';
import { WINDOW_FACTIONS } from '../src/shared/ipc';
import { appIcon, ICO_SIZES } from './lib/app-icon';
import { PixelFont } from './lib/pixel-font';
import { encodeIco, encodePng } from './lib/png';

export const LOGO_FONT = 'node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff';

/** Every icon file, by path relative to the repo, as bytes. */
export function iconFiles(): Map<string, Buffer> {
  const text = new PixelFont(fs.readFileSync(LOGO_FONT)).text('BS');
  const ico = (faction: string): Buffer => encodeIco(ICO_SIZES.map((size) => appIcon(text, FACTION_ACCENTS[faction]!, size)));
  const files = new Map<string, Buffer>();
  for (const faction of WINDOW_FACTIONS) files.set(`build/icons/stratcom-${faction}.ico`, ico(faction));
  files.set('build/icon.ico', ico('armada'));
  files.set('build/icon.png', encodePng(appIcon(text, FACTION_ACCENTS.armada!, 512)));
  return files;
}

if (process.argv[1]?.endsWith('make-icon.ts')) {
  for (const [file, bytes] of iconFiles()) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    console.log(`wrote ${file}`);
  }
}
