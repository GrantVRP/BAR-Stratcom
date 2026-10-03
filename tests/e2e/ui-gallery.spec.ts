import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('dev-ui: renders UI primitives gallery and matches screenshot', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // Navigate to Dev UI gallery via hash
    await page.evaluate(() => {
      const loc = (globalThis as { location?: { hash: string } }).location;
      if (loc) {
        loc.hash = '#/dev/ui';
      }
    });

    const gallery = page.getByTestId('dev-ui-gallery');
    await expect(gallery).toBeVisible();

    // Assert visual stability via screenshot with threshold 0.2 (06 §3 / T06.1)
    await expect(page).toHaveScreenshot('dev-ui-gallery.png', {
      maxDiffPixelRatio: 0.2
    });
  } finally {
    await close();
  }
});
