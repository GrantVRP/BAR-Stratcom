import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('smoke: launches the app, asserts window title and version text', async () => {
  const { app, close } = await launchApp();
  try {
    const window = await app.firstWindow();

    // Assert window title
    await expect(window).toHaveTitle('BAR StratCom');

    // Assert title text in the app
    const titleLocator = window.locator('h1');
    await expect(titleLocator).toHaveText('BAR STRATCOM');

    // Assert version text in the app
    const versionLocator = window.locator('p');
    await expect(versionLocator).toHaveText('3.0.0-dev.0');
  } finally {
    await close();
  }
});
