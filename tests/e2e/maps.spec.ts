import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

// STRATCOM_FAKE_INTEL=1 answers the minimap lookup from the recorded map-list fixture
test('maps: list by popularity, search, map facts with BAR wind table, minimap credit, adapt a plan (T10.4)', async () => {
  const { app, close } = await launchApp([], undefined, { env: { STRATCOM_FAKE_INTEL: '1' } });
  try {
    const page = await app.firstWindow();
    await page.getByTestId('launcher-button').click();
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) await skipBtn.click();
    await expect(page.getByTestId('view-home')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('nav-maps').click();
    await expect(page.getByTestId('view-maps')).toBeVisible();
    // the most played map comes first and is shown
    const first = page.locator('[data-testid^="map-item-"]').first();
    await expect(first).toContainText('#1');

    await page.getByTestId('maps-search').fill('isidis crack 1.1');
    await page.getByTestId('map-item-isidis_crack_1.1').click();
    const detail = page.getByTestId('map-detail');
    await expect(detail).toContainText('Isidis crack 1.1 // by Phalange');
    await expect(page.getByTestId('map-facts')).toContainText('14 × 14');
    await expect(page.getByTestId('map-facts')).toContainText('14.9 (BAR table)');
    await expect(page.getByTestId('map-facts')).toContainText('6.6% below 6 (BAR table)'); // wind risk
    await expect(page.getByTestId('map-start-position')).toHaveCount(8);
    await expect(page.getByTestId('map-minimap-credit')).toContainText('maps-metadata.beyondallreason.dev // map by Phalange');
    await expect(page.getByTestId('wind-turbine')).toContainText('avg wind 14.9 (BAR table)');

    // adapt a curated plan to this map and save it
    await page.getByTestId('map-adapt-plan').selectOption('pro-armada-bot-isidis-crack-41f195-t1');
    await page.getByTestId('btn-adapt-for-map').click();
    await expect(page.getByTestId('adapt-preview')).toBeVisible();
    await page.getByTestId('adapt-save-btn').click();
    await expect(page.getByTestId('view-plan-detail')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('view-plan-detail')).toContainText('ADAPTED');

    await page.keyboard.press('Alt+7');
    await expect(page.getByTestId('view-maps')).toBeVisible();
  } finally {
    await close();
  }
});
