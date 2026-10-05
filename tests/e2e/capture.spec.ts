import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

const FIXTURE = '2026-10-02-multi-large-team-owner-vs-ai-mediterraneum';

test('captures a plan from a recorded replay session and saves it to the library (T08.2)', async () => {
  const { app, close } = await launchApp([], undefined, { seedSessions: [FIXTURE] });
  try {
    const page = await app.firstWindow();

    const launcher = page.getByTestId('launch-window');
    await expect(launcher).toBeVisible({ timeout: 10000 });
    await page.getByTestId('launcher-button').click();
    await expect(launcher).not.toBeVisible();

    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }
    await expect(page.getByTestId('view-home')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('nav-review').click();
    await expect(page.getByTestId('view-review')).toBeVisible({ timeout: 10000 });
    await page.getByTestId(`session-item-${FIXTURE}`).click();

    await page.getByTestId('btn-capture-plan').click();
    const modal = page.getByTestId('save-opening-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('CAPTURE PLAN FROM MATCH');

    // 16 teams, all Armada or Cortex, so every option is capturable
    const select = page.getByTestId('select-capture-player');
    await expect(select.locator('option')).toHaveCount(16);
    await select.selectOption('5');

    await expect(page.getByTestId('capture-validation-badge')).toHaveText('VALID', { timeout: 10000 });
    await expect(page.getByTestId('capture-preview-timeline')).toBeVisible();
    await page.getByTestId('btn-preview-sim').click();
    await expect(page.getByTestId('capture-preview-graph')).toBeVisible();

    await page.getByTestId('input-capture-replay').fill('not a replay');
    await expect(page.getByTestId('capture-replay-error')).toBeVisible();
    await expect(page.getByTestId('save-plan-confirm-btn')).toBeDisabled();
    await page.getByTestId('input-capture-replay').fill('');

    await page.getByTestId('save-opening-title-input').fill('E2E Capture Team 5');
    await page.getByTestId('save-plan-confirm-btn').click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    const saved = await page.evaluate(async () => {
      const win = globalThis as unknown as {
        stratcom: { invoke: (channel: string, arg?: unknown) => Promise<{ ok: boolean; data: unknown }> };
      };
      const res = await win.stratcom.invoke('plans:list', undefined);
      const plans = (res.ok ? res.data : []) as Array<{ title: string; source: { kind: string } }>;
      return plans.find((p) => p.title === 'E2E Capture Team 5') ?? null;
    });
    expect(saved?.source.kind).toBe('replay-capture');
  } finally {
    await close();
  }
});
