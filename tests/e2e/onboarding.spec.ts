import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('onboarding: a fresh profile dir auto-runs wizard, skip reaches Home, and re-runnable from settings', async () => {
  const { app, close } = await launchApp();

  try {
    const page = await app.firstWindow();

    // 1. Dismiss launcher
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible();
    await page.getByTestId('launcher-button').click();
    await expect(launcher).not.toBeVisible();

    // 2. Fresh profile dir without BAR path auto-runs the onboarding wizard
    const onboardingView = page.getByTestId('view-onboarding');
    await expect(onboardingView).toBeVisible();
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible();
    await expect(page.getByTestId('onboarding-step-1')).toContainText('WELCOME TO BAR STRATCOM');

    // 3. Skip setup reaches Home view
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // 4. Wizard closes and Home view is visible
    await expect(onboardingView).not.toBeVisible();
    const homeView = page.getByTestId('view-home');
    await expect(homeView).toBeVisible();

    // 5. Verify re-runnable from Settings
    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible();
    await navSettings.click();
    await expect(page.getByTestId('view-settings')).toBeVisible();

    // Switch to APP tab and click RE-RUN SETUP WIZARD
    const appTab = page.locator('button[role="tab"]', { hasText: 'APP' });
    await expect(appTab).toBeVisible();
    await appTab.click();

    const rerunBtn = page.getByTestId('rerun-onboarding-btn');
    await expect(rerunBtn).toBeVisible();
    await rerunBtn.click();

    // Onboarding wizard opens again
    await expect(onboardingView).toBeVisible();
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible();
  } finally {
    await close();
  }
});
