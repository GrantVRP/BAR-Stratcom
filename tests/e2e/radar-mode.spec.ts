import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('radar mode: Home RADAR (NO PLAN) starts coaching without a plan; STOP ends it (T09.6)', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();
    await page.getByTestId('launcher-button').click();
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) await skipBtn.click();
    await expect(page.getByTestId('view-home')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('home-start-radar-btn').click();
    await expect(page.getByTestId('view-coach')).toBeVisible();
    await expect(page.getByTestId('coach-mode-badge')).toHaveText('RADAR (NO PLAN)');
    await expect(page.getByTestId('radar-contacts')).toContainText('The radar scope is drawn in game');
    await expect(page.getByTestId('coach-step-count')).toHaveCount(0);

    await page.getByTestId('coach-stop-btn').click();
    await expect(page.getByTestId('coach-stop-btn')).toHaveCount(0);
  } finally {
    await close();
  }
});
