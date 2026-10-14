/**
 * Vitest global setup of the node project (T11.7). Electron 44 has no install script: it downloads its
 * binary on the first `require('electron')`. Main-process tests load it from several workers at once,
 * and on a fresh `npm ci` (CI, a new clone) those workers raced to unpack the same files and one failed
 * ("Cannot create a file when that file already exists"). Loading it here, once, before any worker
 * starts, does the download first; afterwards `require('electron')` only reads the path.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

export function ensureElectronBinary(load: (id: string) => unknown = createRequire(import.meta.url)): string {
  const binary = load('electron');
  if (typeof binary !== 'string' || !fs.existsSync(binary)) {
    throw new Error(`The Electron binary is missing after its download: ${String(binary)}`);
  }
  return binary;
}

export default function setup(): void {
  ensureElectronBinary();
}
