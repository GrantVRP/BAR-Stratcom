import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('coach demo: runs demo at 4x on Cortex fixture, shows NEXT card, completes step, and displays alert', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // 1. Dismiss launcher
    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Space');
    await expect(launcher).not.toBeVisible();

    // 2. Reach Home view
    const homeView = page.getByTestId('view-home');
    await expect(homeView).toBeVisible({ timeout: 10000 });

    // 3. Start Demo at 4x on Cortex fixture
    const demoBtn = page.getByTestId('home-start-demo-btn');
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // 4. Coach view loads with NEXT card
    const coachView = page.getByTestId('view-coach');
    await expect(coachView).toBeVisible({ timeout: 10000 });

    const nextCard = page.getByTestId('coach-next-card');
    await expect(nextCard).toBeVisible();

    // 5. Clock advances (4x demo speed)
    await expect(async () => {
      const clockText = await page.getByTestId('coach-clock').textContent();
      expect(clockText).not.toBe('0:00');
    }).toPass({ timeout: 10000 });

    // 6. Alert appears within fixture's known alert window (at 29s game time ≈ 7.25s real time)
    const alertRegion = page.getByTestId('coach-alerts');
    await expect(alertRegion).toContainText('ENERGY', { timeout: 15000 });

    // 7. Stop coaching cleanly
    const stopBtn = page.getByTestId('coach-stop-btn');
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();
  } finally {
    await close();
  }
});
