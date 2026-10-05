import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('launcher: shows title screen on startup and a key press reaches Home', async () => {
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

