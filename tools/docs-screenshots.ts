/**
 * The README screenshots (not part of verify; run after `npm run build`):
 *   npx tsx tools/docs-screenshots.ts
 *
 * Starts the built app through the e2e launcher (temporary profile, --no-bar: never a real game
 * folder), so every picture shows a PC without BAR: home, the curated library and a recorded
 * real game's report. Writes docs/images/*.png (the animated header is tools/readme-showcase.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { launchApp } from '../tests/e2e/launch';

const OUT = path.join('docs', 'images');
const SIZE = { width: 1280, height: 800 };

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(600); // let entry animations settle
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`docs/images/${name}.png`);
}

async function go(page: Page, hash: string, testId: string): Promise<void> {
  await page.evaluate((h) => {
    (globalThis as unknown as { location: { hash: string } }).location.hash = h;
  }, hash);
  await page.getByTestId(testId).waitFor({ timeout: 15000 });
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0]?.setContentSize(size.width, size.height), SIZE);
    await page.getByTestId('launch-window').waitFor({ timeout: 30000 });
    await page.getByTestId('launcher-button').click();
    await page.getByTestId('onboarding-skip-btn').click();
    await page.getByTestId('view-home').waitFor({ timeout: 15000 });
    await shot(page, 'home');

    await go(page, '#/library', 'view-library');
    await page.locator('[data-testid^="plan-card"]').first().waitFor({ timeout: 15000 });
    await shot(page, 'library');
    await page.locator('[data-testid^="plan-card"]').first().click();
    await page.waitForTimeout(1500); // the simulator graph
    await shot(page, 'plan-detail');

    // the report at the end of a demo (played fast through IPC, as the review e2e test does)
    await page.evaluate(async () => {
      const api = (globalThis as unknown as { stratcom: { invoke: (c: string, a?: unknown) => Promise<unknown> } }).stratcom;
      const demos = (await api.invoke('demo:list')) as { data: Array<{ id: string }> };
      await api.invoke('coach:start', { mode: 'demo', demoId: demos.data[0]!.id, speed: 500 });
    });
    await page.getByTestId('toast-view-report').click({ timeout: 30000 });
    await page.getByTestId('session-filter-demo').click({ timeout: 15000 });
    await page.locator('[data-testid^="session-item-"]').first().click();
    await page.getByTestId('review-grade-badge').waitFor({ timeout: 15000 });
    await shot(page, 'review');
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
