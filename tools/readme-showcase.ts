/**
 * The README's animated header (not part of verify; run after `npm run build`):
 *   npx tsx tools/readme-showcase.ts
 *
 * Starts the built app through the e2e launcher (temporary profile, --no-bar) and opens
 * #/dev/showcase at 854 × 534: two screen pixels per scene pixel, so the scene is the launcher's
 * 427 pixels across. Draws every frame of the 8 s loop exactly, screenshots each one, and writes
 * docs/images/showcase.png as an animated PNG (25 frames a second, looping forever).
 */
import fs from 'node:fs';
import path from 'node:path';
import { SHOWCASE, SHOWCASE_FRAME_EVENT } from '../src/core/launch/scene3d';
import { launchApp } from '../tests/e2e/launch';
import { decodePng, encodeApng, type Rgba } from './lib/png';

const OUT = path.join('docs', 'images', 'showcase.png');
const SIZE = { width: 854, height: 534 };
const FPS = 25;

interface PageGlobals {
  location: { hash: string };
  document: { fonts: { ready: Promise<unknown> } };
  dispatchEvent(e: unknown): void;
  CustomEvent: new (name: string, init: { detail: number }) => unknown;
  requestAnimationFrame(cb: () => void): void;
}

const same = (a: Rgba, b: Rgba): boolean => Buffer.from(a.data).equals(Buffer.from(b.data));

async function main(): Promise<void> {
  const { app, close } = await launchApp(['--force-device-scale-factor=1']);
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows()[0]!;
      win.setMinimumSize(1, 1); // the app's own minimum is larger than the README picture
      win.setContentSize(size.width, size.height);
    }, SIZE);
    await page.evaluate(() => {
      (globalThis as unknown as PageGlobals).location.hash = '#/dev/showcase';
    });
    await page.locator('[data-testid="showcase"][data-status="ready"]').waitFor({ timeout: 30000 });
    await page.evaluate(() => (globalThis as unknown as PageGlobals).document.fonts.ready);

    const count = (SHOWCASE.loopMs / 1000) * FPS;
    const frames: Rgba[] = [];
    for (let i = 0; i <= count; i++) {
      await page.evaluate(
        ({ name, ms }) =>
          new Promise<void>((resolve) => {
            const g = globalThis as unknown as PageGlobals;
            g.dispatchEvent(new g.CustomEvent(name, { detail: ms }));
            // two frames on, the drawn canvas is on screen
            g.requestAnimationFrame(() => g.requestAnimationFrame(resolve));
          }),
        { name: SHOWCASE_FRAME_EVENT, ms: (i * 1000) / FPS }
      );
      const img = decodePng(await page.screenshot());
      if (img.width !== SIZE.width || img.height !== SIZE.height) {
        throw new Error(`Screenshot is ${img.width} × ${img.height}, not ${SIZE.width} × ${SIZE.height} (display scaling?)`);
      }
      // the rotors turn every frame, so a repeat means the screenshot missed the new frame
      if (i > 0 && same(img, frames[i - 1]!)) throw new Error(`Frame ${i} did not change`);
      frames.push(img);
      if (i % FPS === 0) console.log(`${i / FPS} s`);
    }
    // one loop on, the picture must be the first again, or the loop would jump
    if (!same(frames.pop()!, frames[0]!)) throw new Error('The frame one loop on differs from the first');

    const apng = encodeApng(frames, FPS);
    fs.writeFileSync(OUT, apng);
    console.log(`${OUT}: ${frames.length} frames, ${(apng.length / 1024 / 1024).toFixed(2)} MB`);
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
