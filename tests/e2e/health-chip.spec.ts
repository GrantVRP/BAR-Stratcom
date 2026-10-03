import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('health-chip: displays NO BAR when no BAR instance or data dir is configured', async () => {
  const { app, close } = await launchApp();
  try {
    const page = await app.firstWindow();

    // Health chip in top bar should be visible
    const healthChip = page.getByTestId('health-chip');
    await expect(healthChip).toBeVisible();

    // Assert that status is NO BAR (05 §9, 06 §2, T06.2)
    await expect(healthChip).toContainText('NO BAR');
  } finally {
    await close();
  }
});
