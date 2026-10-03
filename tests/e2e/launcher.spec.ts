import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('launcher: shows title screen on startup and a key press reaches Home', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // Launcher title screen should be visible
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible();

    // Verify faction emblem and disclaimer
    await expect(launcher).toContainText('BAR STRATCOM');
    await expect(launcher).toContainText('UNOFFICIAL COMMUNITY TOOL');

    // Press Space key to launch into Home
    await page.keyboard.press('Space');

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
