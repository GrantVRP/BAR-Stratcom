import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('dev-ui: renders UI primitives gallery and matches screenshot', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();
    // one window size on every machine, small enough for a 1024×768 screen (GitHub's runner), so the
    // screenshot is compared like for like
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setContentSize(1000, 640));

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
