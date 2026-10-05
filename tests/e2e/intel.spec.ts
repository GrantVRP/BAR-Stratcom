import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

// STRATCOM_FAKE_INTEL=1 answers the intel IPC from the recorded BAR API fixtures (src/main/intel/__fixtures__)
test('intel: battles, leaderboard, replays with capture help, balance links to the catalog (T10.2)', async () => {
  const { app, close } = await launchApp([], undefined, { env: { STRATCOM_FAKE_INTEL: '1' } });
  try {
    const page = await app.firstWindow();
    await page.getByTestId('launcher-button').click();
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) await skipBtn.click();
    await expect(page.getByTestId('view-home')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('nav-intel').click();
    await expect(page.getByTestId('view-intel')).toBeVisible();

    // Battles: both recorded lobbies, the first one's players, the filter
    const battles = page.getByTestId('intel-battles');
    await expect(battles.locator('button[data-testid^="intel-battle-"]')).toHaveCount(2);
    await expect(page.getByTestId('intel-battle-detail')).toContainText('aikatsu');
    await expect(page.getByTestId('intel-status')).toContainText('UPDATED');
    await page.getByTestId('intel-battles-filter').fill('Glitters');
    await expect(page.getByTestId('intel-battle-detail')).toContainText('All That Glitters');

    // Leaderboard: season discovered (4 answers "invalid", 3 works), categories as tabs
    await page.locator('button[role="tab"]', { hasText: 'LEADERBOARD' }).click();
    await expect(page.getByTestId('intel-leaderboard')).toContainText('SEASON 3');
    await expect(page.getByTestId('intel-leaderboard')).toContainText('TM_autopilot');
    await page.locator('button[role="tab"]', { hasText: 'LARGE TEAM' }).click();
    await expect(page.getByTestId('intel-leaderboard')).toContainText('[AFUS]Trotski');

    // Replays: "How to capture this replay" with the replay's page
    await page.locator('button[role="tab"]', { hasText: 'REPLAYS' }).click();
    const replayId = '2ccec16a84002600f94d50118c7fd1b8';
    await expect(page.getByTestId(`intel-replay-${replayId}`)).toContainText('Great Divide V1');
    await page.getByTestId(`intel-capture-${replayId}`).click();
    await expect(page.getByTestId(`intel-capture-steps-${replayId}`)).toContainText(`https://www.beyondallreason.info/replays?gameId=${replayId}`);
    await expect(page.getByTestId(`intel-capture-steps-${replayId}`)).toContainText('Review');

    // Balance: changed units named from the snapshot and linked to their dossier
    await page.locator('button[role="tab"]', { hasText: 'BALANCE' }).click();
    const link = page.getByTestId('intel-balance').getByTestId('unit-link-armemp').first();
    await expect(link).toHaveText('Paralyzer');
    await link.click();
    await expect(page.getByTestId('view-units')).toBeVisible();
    await expect(page.getByTestId('unit-dossier')).toContainText('Paralyzer');

    // Alt+5 returns to Intel
    await page.keyboard.press('Escape');
    await page.keyboard.press('Alt+5');
    await expect(page.getByTestId('view-intel')).toBeVisible();
  } finally {
    await close();
  }
});
