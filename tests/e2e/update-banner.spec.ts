import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

// STRATCOM_FAKE_UPDATE answers the version check without going online (non-packaged builds only)
test('version check: a newer release shows a dismissable banner; switched off in Settings it is not asked (T11.4)', async () => {
  const { app, close } = await launchApp([], undefined, { env: { STRATCOM_FAKE_UPDATE: '9.9.9' } });
  try {
    const page = await app.firstWindow();
    await page.getByTestId('launcher-button').click();
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) await skipBtn.click();
    await expect(page.getByTestId('view-home')).toBeVisible({ timeout: 10000 });

    const banner = page.getByTestId('update-banner');
    await expect(banner).toContainText('BAR StratCom 9.9.9 is out.');
    await page.getByTestId('update-banner-dismiss').click();
    await expect(banner).toHaveCount(0);

    await page.getByTestId('nav-settings').click();
    await page.locator('button[role="tab"]', { hasText: 'APP' }).click();
    await expect(page.getByTestId('settings-section-app')).toContainText('Nothing about you or your games is sent');
    await page.getByTestId('updates-check-toggle').click();
    await expect(page.getByTestId('updates-check-toggle')).toHaveAttribute('aria-checked', 'false');
  } finally {
    await close();
  }
});
