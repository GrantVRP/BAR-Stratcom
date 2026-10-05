import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchApp } from './launch';

test('settings: changing skill profile persists across restart', async () => {
  test.setTimeout(60000);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-e2e-settings-'));

  try {
    // 1. First run: change profile to 'advanced'
    const first = await launchApp([], tmpDir);
    try {
      const page1 = await first.app.firstWindow();

      // Dismiss launcher
      const launcher1 = page1.getByTestId('launch-window');
      await expect(launcher1).toBeVisible();
      await page1.getByTestId('launcher-button').click();
      await expect(launcher1).not.toBeVisible();

      // Navigate to Settings view
      const navSettings1 = page1.getByTestId('nav-settings');
      await expect(navSettings1).toBeVisible();
      await navSettings1.click();
      await expect(page1.getByTestId('view-settings')).toBeVisible();

      // Switch to COACH tab
      const coachTab1 = page1.locator('button[role="tab"]', { hasText: 'COACH' });
      await expect(coachTab1).toBeVisible();
      await coachTab1.click();
      await expect(page1.getByTestId('settings-section-coach')).toBeVisible();

      // Select 'ADVANCED' profile
      const advancedBtn1 = page1.getByTestId('profile-card-advanced');
      await expect(advancedBtn1).toBeVisible();
      await advancedBtn1.click();
      await expect(advancedBtn1).toContainText('✓');

      // Wait a moment for settings IPC write to disk
      await page1.waitForTimeout(500);
    } finally {
      await first.app.close();
    }

    // 2. Second run: restart with same user-data-dir and assert persisted profile
    const second = await launchApp([], tmpDir);
    try {
      const page2 = await second.app.firstWindow();

      // Dismiss launcher
      const launcher2 = page2.getByTestId('launch-window');
      await expect(launcher2).toBeVisible();
      await page2.getByTestId('launcher-button').click();
      await expect(launcher2).not.toBeVisible();

      // Navigate to Settings view
      const navSettings2 = page2.getByTestId('nav-settings');
      await expect(navSettings2).toBeVisible();
      await navSettings2.click();
      await expect(page2.getByTestId('view-settings')).toBeVisible();

      // Switch to COACH tab
      const coachTab2 = page2.locator('button[role="tab"]', { hasText: 'COACH' });
      await expect(coachTab2).toBeVisible();
      await coachTab2.click();
      await expect(page2.getByTestId('settings-section-coach')).toBeVisible();

      // Verify 'ADVANCED' profile is still selected
      const advancedBtn2 = page2.getByTestId('profile-card-advanced');
      await expect(advancedBtn2).toBeVisible();
      await expect(advancedBtn2).toContainText('✓');
    } finally {
      await second.app.close();
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to clean up temp user data dir ${tmpDir}:`, err);
    }
  }
});
