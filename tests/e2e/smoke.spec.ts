import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchApp } from './launch';

test('smoke: consolidated end-to-end journey (launch -> launcher -> skip onboarding -> library -> plan -> demo 4x -> alert -> stop -> settings persists)', async () => {
  test.setTimeout(90000);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-smoke-'));

  try {
    // ------------------------------------------------------------------------
    // Part 1: First Run
    // ------------------------------------------------------------------------
    const first = await launchApp([], tmpDir);
    try {
      const page = await first.app.firstWindow();

      // 1. Launch & Window Title
      await expect(page).toHaveTitle('BAR StratCom');

      // 2. Launcher Title Screen
      const launcher = page.getByTestId('launch-window');
      await expect(launcher).toBeVisible({ timeout: 10000 });
      await page.getByTestId('launcher-button').click();
      await expect(launcher).not.toBeVisible();

      // 3. Skip Onboarding (fresh profile)
      const onboardingView = page.getByTestId('view-onboarding');
      await expect(onboardingView).toBeVisible({ timeout: 10000 });
      const skipBtn = page.getByTestId('onboarding-skip-btn');
      await skipBtn.click();
      await expect(onboardingView).not.toBeVisible();

      // 4. Command Home Reached
      const homeView = page.getByTestId('view-home');
      await expect(homeView).toBeVisible({ timeout: 10000 });

      // 5. Library & Plan Browser
      const navLibrary = page.getByTestId('nav-library');
      await navLibrary.click();
      const libraryView = page.getByTestId('view-library');
      await expect(libraryView).toBeVisible({ timeout: 10000 });

      const plansGrid = page.getByTestId('plans-grid');
      await expect(plansGrid).toBeVisible();
      const planCard = page.locator('[data-testid="plan-card-2026-10-01-cortex-1v1-vs-ai-barr"]');
      await expect(planCard).toBeVisible();

      // 6. Plan Detail & Activation
      await planCard.click();
      const planDetailView = page.getByTestId('view-plan-detail');
      await expect(planDetailView).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('plan-timeline')).toBeVisible();

      const activateBtn = page.getByTestId('btn-activate-plan');
      await activateBtn.click();

      // 7. Start Demo at 4x on Cortex fixture
      const navHome = page.getByTestId('nav-home');
      await navHome.click();
      await expect(homeView).toBeVisible();

      const demoBtn = page.getByTestId('home-start-demo-btn');
      await expect(demoBtn).toBeVisible();
      await demoBtn.click();

      // 8. Coach view loads with NEXT card
      const coachView = page.getByTestId('view-coach');
      await expect(coachView).toBeVisible({ timeout: 10000 });
      const nextCard = page.getByTestId('coach-next-card');
      await expect(nextCard).toBeVisible();

      // Clock advances (4x demo speed)
      await expect(async () => {
        const clockText = await page.getByTestId('coach-clock').textContent();
        expect(clockText).not.toBe('0:00');
      }).toPass({ timeout: 10000 });

      // Telemetry shows numeric metal and energy in demo
      const telemetry = page.getByTestId('coach-telemetry');
      await expect(telemetry).toBeVisible({ timeout: 10000 });
      await expect(telemetry).toContainText('METAL');
      await expect(telemetry).toContainText('ENERGY');

      // HUD preview is visible and has no raw unit ids
      const hudPreview = page.getByTestId('hud-preview');
      await expect(hudPreview).toBeVisible({ timeout: 10000 });
      expect(await hudPreview.textContent()).not.toContain('corvp');

      // Coach alert triggers
      const alertRegion = page.getByTestId('coach-alerts');
      await expect(alertRegion).toContainText('ENERGY', { timeout: 15000 });

      // 9. Stop coaching cleanly
      const stopBtn = page.getByTestId('coach-stop-btn');
      await expect(stopBtn).toBeVisible();
      await stopBtn.click();

      // 10. Change Settings (Skill Profile to ADVANCED)
      const navSettings = page.getByTestId('nav-settings');
      await navSettings.click();
      const settingsView = page.getByTestId('view-settings');
      await expect(settingsView).toBeVisible({ timeout: 10000 });

      const coachTab = page.locator('button[role="tab"]', { hasText: 'COACH' });
      await expect(coachTab).toBeVisible();
      await coachTab.click();
      await expect(page.getByTestId('settings-section-coach')).toBeVisible();

      const advancedBtn = page.getByTestId('profile-card-advanced');
      await expect(advancedBtn).toBeVisible();
      await advancedBtn.click();
      await expect(advancedBtn).toContainText('✓');

      // Wait a moment for settings store file write
      await page.waitForTimeout(500);
    } finally {
      await first.app.close();
    }

    // ------------------------------------------------------------------------
    // Part 2: Second Run (Verify Settings Persist Across App Restart)
    // ------------------------------------------------------------------------
    const second = await launchApp([], tmpDir);
    try {
      const page2 = await second.app.firstWindow();

      // Dismiss launcher
      const launcher2 = page2.getByTestId('launch-window');
      await expect(launcher2).toBeVisible({ timeout: 10000 });
      await page2.getByTestId('launcher-button').click();
      await expect(launcher2).not.toBeVisible();

      // Navigate to Settings
      const navSettings2 = page2.getByTestId('nav-settings');
      await expect(navSettings2).toBeVisible({ timeout: 10000 });
      await navSettings2.click();
      await expect(page2.getByTestId('view-settings')).toBeVisible();

      // Switch to COACH tab
      const coachTab2 = page2.locator('button[role="tab"]', { hasText: 'COACH' });
      await expect(coachTab2).toBeVisible();
      await coachTab2.click();
      await expect(page2.getByTestId('settings-section-coach')).toBeVisible();

      // Verify 'ADVANCED' profile persisted in settings.json
      const advancedBtn2 = page2.getByTestId('profile-card-advanced');
      await expect(advancedBtn2).toContainText('✓');
    } finally {
      await second.app.close();
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  }
});
