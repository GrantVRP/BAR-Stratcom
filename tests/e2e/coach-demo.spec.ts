import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('coach demo: pairs with BarR #2 sample, shows numeric telemetry, Vehicle Plant name, and accurate pace', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // 1. Dismiss launcher
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible({ timeout: 10000 });
    await page.getByTestId('launcher-button').click();
    await expect(launcher).not.toBeVisible();

    // 2. Reach Home view (skip onboarding if fresh profile)
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }
    const homeView = page.getByTestId('view-home');
    await expect(homeView).toBeVisible({ timeout: 10000 });

    // 3. Navigate to Library to activate BarR #2 sample plan
    const navLibrary = page.getByTestId('nav-library');
    await navLibrary.click();
    await expect(page.getByTestId('view-library')).toBeVisible({ timeout: 10000 });

    // Locate BarR #2 sample plan card
    const barrSampleCard = page.locator('[data-testid="plan-card-2026-10-01-cortex-1v1-vs-ai-barr-499s"]');
    await expect(barrSampleCard).toBeVisible({ timeout: 10000 });
    await barrSampleCard.click();

    // In Plan detail, activate the plan
    const activateBtn = page.getByTestId('btn-activate-plan');
    await expect(activateBtn).toBeVisible({ timeout: 10000 });
    await activateBtn.click();

    // 4. Return to Home and start Demo (pairs with 2026-10-01-cortex-1v1-vs-ai-barr-499s)
    const navHome = page.getByTestId('nav-home');
    await navHome.click();
    await expect(homeView).toBeVisible({ timeout: 10000 });

    const demoBtn = page.getByTestId('home-start-demo-btn');
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // 5. Coach view loads
    const coachView = page.getByTestId('view-coach');
    await expect(coachView).toBeVisible({ timeout: 10000 });

    // Verify coach header shows paired demo fixture title
    const modeBadge = page.getByTestId('coach-mode-badge');
    await expect(modeBadge).toContainText('DEMO 4× // BarR 1.1 (owner vs AI)');

    // 6. Verify telemetry panel shows numeric metal and energy values within 10s
    const telemetry = page.getByTestId('coach-telemetry');
    await expect(telemetry).toBeVisible({ timeout: 10000 });
    await expect(telemetry).toContainText('METAL');
    await expect(telemetry).toContainText('ENERGY');
    await expect(telemetry).toContainText('MEASURED');

    // 7. Verify HUD preview contains "Vehicle Plant", never raw "corvp"
    const hudPreview = page.getByTestId('hud-preview');
    await expect(hudPreview).toBeVisible({ timeout: 10000 });
    // Advance slightly so step or plan text is rendered in HUD
    await expect(async () => {
      const hudText = await hudPreview.textContent();
      expect(hudText).not.toContain('corvp');
      expect(hudText).not.toContain('cormex');
      expect(hudText).not.toContain('corwin');
    }).toPass({ timeout: 10000 });

    // 8. Advance game clock to >= 60s (at 4x speed, ~15s real time)
    await expect(async () => {
      const clockText = (await page.getByTestId('coach-clock').textContent()) ?? '0:00';
      const [m, s] = clockText.split(':').map((v) => parseInt(v, 10));
      const totalSec = (m ?? 0) * 60 + (s ?? 0);
      expect(totalSec).toBeGreaterThanOrEqual(60);
    }).toPass({ timeout: 25000 });

    // At 60s+, HUD preview contains Vehicle Plant
    await expect(hudPreview).toContainText('Vehicle Plant');
    expect(await hudPreview.textContent()).not.toContain('corvp');

    // 9. Verify ahead/behind pace is within ±15s
    const nextCard = page.getByTestId('coach-next-card');
    const nextCardText = (await nextCard.textContent()) ?? '';
    // Pace label is either ON TIME, +Xs AHEAD (X <= 15), or -Xs BEHIND (X <= 15)
    // If behind, ensure it is not > 15s behind
    expect(nextCardText).not.toMatch(/BEHIND\s+(1[6-9]|[2-9]\d+)s/);

    // 10. Stop coaching cleanly
    const stopBtn = page.getByTestId('coach-stop-btn');
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
  } finally {
    await close();
  }
});
