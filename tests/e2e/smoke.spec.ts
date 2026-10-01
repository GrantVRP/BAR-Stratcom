import { test, expect, _electron as electron } from '@playwright/test';

test('smoke: launches the app, asserts window title and version text', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  try {
    const window = await electronApp.firstWindow();

    // Assert window title
    await expect(window).toHaveTitle('BAR StratCom');

    // Assert title text in the app
    const titleLocator = window.locator('h1');
    await expect(titleLocator).toHaveText('BAR STRATCOM');

    // Assert version text in the app
    const versionLocator = window.locator('p');
    await expect(versionLocator).toHaveText('3.0.0-dev.0');
  } finally {
    await electronApp.close();
  }
});
