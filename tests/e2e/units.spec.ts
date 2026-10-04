import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('unit catalog: legacy name search, original icons and dossier (T10.3)', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Space');
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) await skipBtn.click();

    await page.getByTestId('nav-units').click();
    await expect(page.getByTestId('view-units')).toBeVisible();
    await expect(page.getByTestId('units-game-version')).toContainText('Data from game version');

    // "Rocko" is a legacy name (data/aliases.json); the card shows the unit under its current name
    await page.getByTestId('input-units-search').fill('Rocko');
    const card = page.getByTestId('unit-card-armrock');
    await expect(card).toBeVisible();
    await expect(card).not.toContainText('Rocko');
    await expect(card.locator('img[data-unit-sprite="armrock"]')).toBeVisible();
    await expect(page.getByTestId('units-art-credit')).toContainText('IceXuick and Floris');

    await card.click();
    const dossier = page.getByTestId('unit-dossier');
    await expect(dossier).toBeVisible();
    await expect(dossier).toContainText('armrock');
    await expect(dossier).toContainText('BUILT BY');

    // Following a "Built by" link opens that unit's dossier
    await dossier.getByRole('button', { name: /Bot Lab/ }).first().click();
    await expect(page.getByTestId('unit-dossier')).toContainText('armlab');
  } finally {
    await close();
  }
});
