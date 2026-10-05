import { test, expect } from '@playwright/test';
import { launchApp } from './launch';

test('demo completion triggers in-memory review report with DEMO badge (T07.4)', async () => {
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

    // Dismiss any stale toast from prior bridge heartbeats if present
    const staleDismiss = page.getByTestId('toast-dismiss');
    if (await staleDismiss.isVisible()) {
      await staleDismiss.click();
    }

    // 3. Start demo at high speed (500x) via coach:start IPC so it completes in ~1-2s
    await page.evaluate(async () => {
      const win = globalThis as unknown as {
        stratcom: {
          invoke: (channel: string, arg?: unknown) => Promise<unknown>;
        };
      };
      const demos = (await win.stratcom.invoke('demo:list', undefined)) as Array<{ id: string }>;
      const demoId = demos[0]?.id ?? '2026-10-01-cortex-1v1-vs-ai-barr-499s';
      await win.stratcom.invoke('coach:start', {
        mode: 'demo',
        demoId,
        speed: 500
      });
    });

    // 4. Verify report-ready-toast appears upon demo completion
    const toast = page.getByTestId('report-ready-toast');
    await expect(toast).toBeVisible({ timeout: 15000 });
    await expect(toast).toContainText('MATCH REPORT READY');

    // 5. Click VIEW REPORT on the toast
    const viewReportBtn = page.getByTestId('toast-view-report');
    await expect(viewReportBtn).toBeVisible();
    await viewReportBtn.click();

    // 6. Review view loads
    const reviewView = page.getByTestId('view-review');
    await expect(reviewView).toBeVisible({ timeout: 10000 });

    // 7. Filter or select the DEMO session from the match list
    const demoFilterBtn = page.getByTestId('session-filter-demo');
    await expect(demoFilterBtn).toBeVisible({ timeout: 10000 });
    await demoFilterBtn.click();

    const firstDemoSession = page.locator('[data-testid^="session-item-"]').first();
    await expect(firstDemoSession).toBeVisible({ timeout: 10000 });
    await firstDemoSession.click();

    // 8. Verify the DEMO badge appears on the active report
    const demoBadge = page.getByTestId('review-demo-badge');
    await expect(demoBadge).toBeVisible({ timeout: 10000 });
    await expect(demoBadge).toHaveText('DEMO');

    // 9. Verify execution grade badge, metric tiles, and top tips appear
    const gradeBadge = page.getByTestId('review-grade-badge');
    await expect(gradeBadge).toBeVisible();
    await expect(page.getByTestId('metric-tiles-grid')).toBeVisible();
    await expect(page.getByTestId('review-tips-list')).toBeVisible();

    // 10. Verify save opening action is available
    const saveBtn = page.getByTestId('btn-save-opening');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toHaveText('SAVE MY OPENING AS PLAN');
  } finally {
    await close();
  }
});
