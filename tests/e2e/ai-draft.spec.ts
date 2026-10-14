import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('AI draft: pick a provider, draft, save, find it in the library (fake provider)', async () => {
  const { app, close } = await launchApp([], undefined, { env: { STRATCOM_FAKE_AI: '1' } });
  try {
    const page = await app.firstWindow();
    await page.getByTestId('launcher-button').click();
    const skipBtn = page.getByTestId('onboarding-skip-btn');
    if (await skipBtn.isVisible()) await skipBtn.click();
    await expect(page.getByTestId('view-home')).toBeVisible({ timeout: 10000 });

    // AI is off by default: no draft button
    await page.getByTestId('nav-library').click();
    await expect(page.getByTestId('view-library')).toBeVisible();
    await expect(page.getByTestId('btn-draft-ai')).toHaveCount(0);

    // Settings → AI: a local provider needs no key; the fake answers the connection test
    await page.getByTestId('nav-settings').click();
    await page.locator('button[role="tab"]', { hasText: 'AI' }).click();
    await expect(page.getByTestId('ai-off-note')).toBeVisible();
    await page.getByTestId('ai-provider-select').selectOption('ollama');
    await expect(page.getByTestId('ai-base-url-input')).toBeVisible();
    await page.getByTestId('ai-test-btn').click();
    await expect(page.getByTestId('ai-status')).toHaveText('Connected // 1 models');

    // Library → DRAFT WITH AI → draft → save
    await page.getByTestId('nav-library').click();
    await page.getByTestId('btn-draft-ai').click();
    await expect(page.getByTestId('ai-draft-form')).toBeVisible();
    await page.getByTestId('ai-draft-factionId').selectOption('armada');
    await page.getByTestId('ai-draft-opening').selectOption('hover');
    await page.getByTestId('ai-draft-note').fill('safe opening');
    await page.getByTestId('ai-draft-start').click();

    const result = page.getByTestId('ai-draft-result');
    await expect(result).toBeVisible({ timeout: 20000 });
    await expect(result).toContainText('AI DRAFT');
    await expect(page.getByTestId('editor-validation-valid')).toBeVisible();
    // no map chosen: the stall numbers say wind is unknown
    await expect(page.getByTestId('ai-draft-wind-unknown')).toBeVisible();
    await page.getByTestId('ai-draft-save').click();

    await expect(page.getByTestId('view-plan-detail')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('view-plan-detail')).toContainText('ollama/stratcom-fake');
    await expect(page.getByTestId('view-plan-detail').getByTestId('provenance-AI DRAFT')).toBeVisible();
    const saved = await page.evaluate(async () => {
      const win = globalThis as unknown as {
        stratcom: { invoke: (channel: string, arg?: unknown) => Promise<{ ok: boolean; data: unknown }> };
      };
      const res = await win.stratcom.invoke('plans:list', undefined);
      const plans = (res.ok ? res.data : []) as Array<{ id: string; opening: string; source: { kind: string; model?: string } }>;
      return plans.filter((p) => p.source.kind === 'ai-draft');
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]!.source.model).toBe('stratcom-fake');

    // DRAFT VARIANT WITH AI prefills from the plan (the fake copies the closest library build, so read its opening)
    await page.getByTestId('btn-draft-variant').click();
    await expect(page.getByTestId('ai-draft-opening')).toHaveValue(saved[0]!.opening);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('ai-draft-form')).toHaveCount(0);

    await page.getByTestId('btn-back-to-library').click();
    await expect(page.getByTestId(`plan-card-${saved[0]!.id}`)).toContainText('AI DRAFT // stratcom-fake');
  } finally {
    await close();
  }
});
