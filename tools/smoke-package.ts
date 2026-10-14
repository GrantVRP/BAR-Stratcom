/**
 * Smoke test of the packaged app (not part of verify; run after `npm run package`):
 *   npm run smoke:package
 *
 * Unzips release/BAR StratCom-<version>-win-x64.zip into a fresh temporary folder, starts the exe
 * there with its own profile and --no-bar (never a real game folder), and checks: the launcher
 * shows, Home opens, the bundled data and widget are found, and the demo coaches without BAR.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { _electron as electron } from '@playwright/test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8')) as { version: string };
const zipPath = path.join('release', `BAR StratCom-${pkg.version}-win-x64.zip`);

async function main(): Promise<void> {
  if (!fs.existsSync(zipPath)) throw new Error(`${zipPath} not found: run npm run package first`);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-smoke-'));
  const appDir = path.join(root, 'app');
  const profile = path.join(root, 'profile');
  const files = unzipSync(fs.readFileSync(zipPath));
  for (const [name, bytes] of Object.entries(files)) {
    const target = path.join(appDir, name);
    if (name.endsWith('/')) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  const exe = path.join(appDir, 'BAR StratCom.exe');
  const checks: Array<[string, boolean | string]> = [];
  const t0 = Date.now();
  const app = await electron.launch({ executablePath: exe, args: [`--user-data-dir=${profile}`, '--no-bar'] });
  try {
    const page = await app.firstWindow();
    await page.getByTestId('launch-window').waitFor({ timeout: 30000 });
    checks.push(['launcher shown (ms)', String(Date.now() - t0)]);
    const info = (await page.evaluate("window.stratcom.invoke('app:getInfo')")) as { ok: boolean; data: { version: string } };
    checks.push(['version', info.data.version]);
    checks.push(['packaged', await app.evaluate(({ app: a }) => a.isPackaged)]);
    const widget = (await page.evaluate("window.stratcom.invoke('game:widgetStatus')")) as { ok: boolean; data: { bundledVersion: string | null } };
    checks.push(['bundled widget', String(widget.data.bundledVersion)]);

    await page.getByTestId('launcher-button').click();
    const skip = page.getByTestId('onboarding-skip-btn');
    await skip.waitFor({ timeout: 15000 });
    await skip.click();
    await page.getByTestId('view-home').waitFor({ timeout: 15000 });
    checks.push(['home', true]);
    await page.getByTestId('home-start-demo-btn').click();
    const picker = page.getByTestId('demo-picker-start-btn');
    if (await picker.isVisible().catch(() => false)) await picker.click();
    await page.getByTestId('view-coach').waitFor({ timeout: 15000 });
    await page.getByTestId('coach-telemetry').waitFor({ timeout: 20000 });
    checks.push(['demo coaching without BAR', true]);
    await page.screenshot({ path: path.join(root, 'smoke-demo.png') });
  } finally {
    await app.close();
  }
  console.log(JSON.stringify({ zip: zipPath, unzippedTo: appDir, checks: Object.fromEntries(checks), screenshot: path.join(root, 'smoke-demo.png') }, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
