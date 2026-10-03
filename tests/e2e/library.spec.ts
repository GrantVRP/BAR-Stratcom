import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('library: browse build plans, open detail view, and inspect timeline steps', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // 1. Dismiss launcher
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible();
    await page.keyboard.press('Space');
    await expect(launcher).not.toBeVisible();

    // 2. Navigate to Library via left rail
    const navLibrary = page.getByTestId('nav-library');
    await expect(navLibrary).toBeVisible();
    await navLibrary.click();

    // 3. Verify Library view loaded
    const libraryView = page.getByTestId('view-library');
    await expect(libraryView).toBeVisible();

    // 4. Check that plan cards are rendered
    const planCard = page.getByTestId('plan-card-armada-rocketeer-1v1');
    await expect(planCard).toBeVisible();
    await expect(planCard).toContainText('Armada Bot Rocketeer 1v1');
    await expect(planCard).toContainText('CURATED');

    // 5. Open plan detail
    await planCard.click();

    const planDetail = page.getByTestId('view-plan-detail');
    await expect(planDetail).toBeVisible();
    await expect(planDetail).toContainText('Armada Bot Rocketeer 1v1');

    // 6. Inspect validation badge, map selector, and timeline steps
    await expect(page.getByTestId('badge-validation-valid')).toBeVisible();
    await expect(page.getByTestId('map-combobox')).toBeVisible();
    await expect(page.getByTestId('plan-timeline')).toBeVisible();

    // Inspect first timeline step
    const firstStep = page.getByTestId('timeline-step-0');
    await expect(firstStep).toBeVisible();
    await expect(firstStep).toContainText('[CDR]');
    await expect(firstStep).toContainText('Metal Extractor');

    // 7. Click back to library
    const backBtn = page.getByTestId('btn-back-to-library');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await expect(page.getByTestId('view-library')).toBeVisible();
  } finally {
    await close();
  }
});
