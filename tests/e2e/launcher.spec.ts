import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('launcher: shows title screen on startup and only LAUNCH reaches Home', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // Launcher title screen should be visible
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible();

    // Title; the unofficial notice lives on the About page (owner request, T06.16)
    await expect(launcher).toContainText('BAR STRATCOM');
    await expect(launcher).not.toContainText('NOT AFFILIATED');

    // Only the LAUNCH button enters the app: a key press keeps the launcher open (T06.16)
    await expect(launcher).not.toContainText('PRESS ANY KEY');
    await page.keyboard.press('Space');
    await expect(launcher).toBeVisible();
    await page.getByTestId('launcher-button').click();

    // Launcher should close
    await expect(launcher).not.toBeVisible();

    // If fresh profile auto-runs onboarding, skip to reach Home
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    const homeView = page.getByTestId('view-home');
    await expect(homeView).toBeVisible();

    // TopBar chips should be visible
    await expect(page.getByTestId('health-chip')).toBeVisible();
  } finally {
    await close();
  }
});

test('routing: unknown route displays 404 panel with link back to Home', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // Dismiss launcher
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible();
    await page.getByTestId('launcher-button').click();
    await expect(launcher).not.toBeVisible();

    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    // Navigate to unknown route
    await page.evaluate(() => {
      (globalThis as unknown as { location: { hash: string } }).location.hash = '#/editor';
    });

    const notFound = page.getByTestId('not-found-view');
    await expect(notFound).toBeVisible();
    await expect(notFound).toContainText('404 // ROUTE NOT FOUND');
    await expect(notFound).toContainText('#/editor');

    // Click return to home
    const returnBtn = page.getByTestId('btn-not-found-home');
    await returnBtn.click();

    await expect(notFound).not.toBeVisible();
    await expect(page.getByTestId('view-home')).toBeVisible();
  } finally {
    await close();
  }
});


test('launcher: clicking the walking unit destroys it, and a new one runs in later (owner request)', async () => {
  test.setTimeout(60000);
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();
    const scene = page.getByTestId('launch-scene-3d');
    await expect(scene).not.toHaveAttribute('data-status', 'loading', { timeout: 30000 });
    test.skip((await scene.getAttribute('data-status')) !== 'ready', 'no WebGL on this machine: the 2D fallback has no units to click');

    const canvas = page.getByTestId('launch-scene-canvas');
    // wait until the unit is well inside the window, then click where the scene says it is
    let at = '';
    await expect
      .poll(async () => {
        at = (await canvas.getAttribute('data-runner')) ?? '';
        const [x, y] = at.split(',').map(Number);
        return at !== '' && x! > 0.15 && x! < 0.85 && y! > 0.2 && y! < 0.85;
      }, { timeout: 20000 })
      .toBe(true);
    const box = (await canvas.boundingBox())!;
    const [fx, fy] = at.split(',').map(Number);
    await page.mouse.click(box.x + fx! * box.width, box.y + fy! * box.height);

    // destroyed: no walking unit, and the launcher is still open (only LAUNCH enters the app)
    await expect(canvas).toHaveAttribute('data-runner', '');
    await expect(page.getByTestId('launch-window')).toBeVisible();
    // death animation (under 2 s) + 3 s, then a new unit is walking again
    await expect(canvas).not.toHaveAttribute('data-runner', '', { timeout: 10000 });
  } finally {
    await close();
  }
});
