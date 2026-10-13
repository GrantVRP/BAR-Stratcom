/**
 * Writes the app icon (T11.4, original art; tools/lib/app-icon.ts):
 *   build/icon.ico  — Windows icon for the packaged exe (electron-builder `win.icon`)
 *   build/icon.png  — 512 px, for docs and the README
 *
 *   npm run make:icon
 */
import fs from 'node:fs';
import path from 'node:path';
import { appIcon, ICO_SIZES } from './lib/app-icon';
import { encodeIco, encodePng } from './lib/png';

const out = path.join(process.cwd(), 'build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.ico'), encodeIco(ICO_SIZES.map(appIcon)));
fs.writeFileSync(path.join(out, 'icon.png'), encodePng(appIcon(512)));
console.log(`wrote build/icon.ico (${ICO_SIZES.join(', ')} px) and build/icon.png (512 px)`);
