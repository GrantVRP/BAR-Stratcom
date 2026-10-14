/**
 * App-level budgets on the built app, in its own temporary profile. Long-running, not
 * part of verify.
 *
 *   npm run build && npx tsx tools/perf/app-perf.ts [--minutes 30]
 *
 * Measures cold start to the launcher, the coach view's frame rate and long tasks during the 4× demo,
 * and the app's memory every minute while the demo runs (restarted whenever it ends) for the given
 * number of minutes: the working set of every Electron process (what Task Manager shows; shared DLL
 * pages are counted once per process) and the private bytes (memory no other process shares).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};
const MINUTES = arg('--minutes', 30);
const PLAN_CARD = 'plan-card-2026-10-01-cortex-1v1-vs-ai-barr-499s';

async function startDemo(page: Page): Promise<void> {
  await page.getByTestId('nav-home').click();
  await page.getByTestId('home-start-demo-btn').click();
  await page.getByTestId('view-coach').waitFor({ timeout: 15000 });
  await page.getByTestId('coach-telemetry').waitFor({ timeout: 15000 });
}

type Memory = { totalMb: number; privateMb: number; byType: Record<string, number>; privateByType: Record<string, number> };

/** Working set and private bytes (MB) of every Electron process, in total and by process type. */
async function memory(app: ElectronApplication): Promise<Memory> {
  const metrics = await app.evaluate(({ app: a }) =>
    a.getAppMetrics().map((m) => ({ type: m.type, kb: m.memory.workingSetSize, privateKb: m.memory.privateBytes ?? 0 }))
  );
  const byType: Record<string, number> = {};
  const privateByType: Record<string, number> = {};
  for (const m of metrics) {
    byType[m.type] = Math.round(((byType[m.type] ?? 0) + m.kb / 1024) * 10) / 10;
    privateByType[m.type] = Math.round(((privateByType[m.type] ?? 0) + m.privateKb / 1024) * 10) / 10;
  }
  const mb = (key: 'kb' | 'privateKb'): number => Math.round(metrics.reduce((n, m) => n + m[key], 0) / 1024);
  return { totalMb: mb('kb'), privateMb: mb('privateKb'), byType, privateByType };
}

/** Frames per second and long tasks (> 50 ms) in the page over `seconds`. */
async function frameRate(page: Page, seconds: number): Promise<{ fps: number; longTasks: number; longestTaskMs: number }> {
  // sent as text: the tsx transform would add helpers to a function that do not exist in the page
  const script = `new Promise((resolve) => {
    const ms = ${seconds * 1000};
    const long = [];
    const observer = new PerformanceObserver((list) => list.getEntries().forEach((e) => long.push(e.duration)));
    observer.observe({ type: 'longtask' });
    let frames = 0;
    const start = performance.now();
    const step = (t) => {
      frames += 1;
      if (t - start < ms) requestAnimationFrame(step);
      else {
        observer.disconnect();
        resolve({ fps: Math.round((frames * 1000) / (t - start)), longTasks: long.length, longestTaskMs: Math.round(Math.max(0, ...long)) });
      }
    };
    requestAnimationFrame(step);
  })`;
  return page.evaluate(script) as Promise<{ fps: number; longTasks: number; longestTaskMs: number }>;
}

async function main(): Promise<void> {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-perf-'));
  const t0 = Date.now();
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`, '--no-bar'] }); // never a real game folder
  const page = await app.firstWindow();
  await page.getByTestId('launch-window').waitFor({ timeout: 30000 });
  const coldStartMs = Date.now() - t0;
  try {
    await page.getByTestId('launcher-button').click();
    const skip = page.getByTestId('onboarding-skip-btn');
    if (await skip.isVisible()) await skip.click();
    await page.getByTestId('view-home').waitFor();
    await page.getByTestId('nav-library').click();
    await page.getByTestId(PLAN_CARD).click();
    await page.getByTestId('btn-activate-plan').click();
    await startDemo(page);

    const coachView = await frameRate(page, 15);
    const samples: Array<{ minute: number } & Memory> = [];
    let restarts = 0;
    const playMinute = async (): Promise<void> => {
      const end = Date.now() + 60_000;
      while (Date.now() < end) {
        await page.waitForTimeout(2000);
        // the coach keeps running after the demo's last state; the report toast marks the end
        if (!(await page.getByTestId('report-ready-toast').isVisible())) continue;
        await page.getByTestId('toast-dismiss').click();
        const stop = page.getByTestId('coach-stop-btn');
        if (await stop.isVisible()) await stop.click();
        restarts += 1;
        await startDemo(page);
      }
    };
    for (let minute = 0; minute <= MINUTES; minute++) {
      if (minute > 0) await playMinute();
      samples.push({ minute, ...(await memory(app)) });
      console.error(`minute ${minute}: ${samples.at(-1)!.totalMb} MB working set, ${samples.at(-1)!.privateMb} MB private`);
    }
    const result = {
      coldStartMs,
      coachView,
      memory: {
        minutes: MINUTES,
        demoRestarts: restarts,
        startMb: samples[0]!.totalMb,
        endMb: samples.at(-1)!.totalMb,
        peakMb: Math.max(...samples.map((s) => s.totalMb)),
        privateStartMb: samples[0]!.privateMb,
        privateEndMb: samples.at(-1)!.privateMb,
        end: samples.at(-1)!.byType,
        privateEnd: samples.at(-1)!.privateByType
      },
      samples: samples.map((s) => [s.minute, s.totalMb, s.privateMb])
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

void main();
