import { execFileSync, execSync, spawn } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd();

// 1. Find and stop running electron processes from this repo
if (process.platform === 'win32') {
  try {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object { $_.CommandLine -like '*${cwd}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`
      ],
      { stdio: 'ignore' }
    );
  } catch {
    // Ignore if no process was running
  }
}

// 2. Run npm run build
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (err) {
  console.error('Build failed; cannot show app:', err);
  process.exit(1);
}

// 3. Spawn the built app with the default profile detached and unref
const electronBin =
  process.platform === 'win32' ? path.resolve(cwd, 'node_modules/electron/dist/electron.exe') : 'electron';

const child = spawn(electronBin, ['.'], {
  detached: true,
  stdio: 'ignore',
  cwd
});

child.unref();

console.log(`StratCom opened (pid ${child.pid}). Close the window when done.`);
process.exit(0);
