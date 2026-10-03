import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Platform } from './types';

const execFileAsync = promisify(execFile);

export type ExecFileFunction = (
  file: string,
  args: readonly string[],
  options: { timeout?: number }
) => Promise<{ stdout: string; stderr: string }>;

export const REGISTRY_UNINSTALL_KEYS = [
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
] as const;

/**
 * Extracts and normalises the data directory path from `reg query` output.
 * Target format: DisplayIcon REG_SZ <path to Beyond-All-Reason.exe>,0
 */
export function parseDisplayIconFromRegOutput(output: string): string | null {
  const match = output.match(/DisplayIcon\s+REG_\w+\s+(.+)$/m);
  if (!match || !match[1]) {
    // Fallback: check InstallLocation
    const installLocMatch = output.match(/InstallLocation\s+REG_\w+\s+(.+)$/m);
    if (installLocMatch && installLocMatch[1]) {
      let loc = installLocMatch[1].trim();
      if (loc.startsWith('"') && loc.endsWith('"')) {
        loc = loc.slice(1, -1).trim();
      }
      if (loc) {
        return path.join(loc, 'data');
      }
    }
    return null;
  }

  let raw = match[1].trim();
  // Strip trailing comma and index (e.g. ,0)
  raw = raw.replace(/,\s*\d+$/, '').trim();

  // Strip enclosing quotes if present
  if (raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1).trim();
  }

  if (!raw) return null;

  const exeDir = path.dirname(raw);
  return path.join(exeDir, 'data');
}

/**
 * Extracts the BAR data directory from a running Spring engine executable path.
 * Target format: <data>\engine\recoil_<ver>\spring.exe -> <data>
 */
export function parseEnginePathToDataDir(output: string): string | null {
  const line = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (!line) return null;

  let cleaned = line;
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (!cleaned) return null;

  const dir = path.dirname(cleaned);
  // If directly inside an engine folder: <data>\engine\spring.exe
  if (path.basename(dir).toLowerCase() === 'engine') {
    return path.dirname(dir);
  }
  // Standard Recoil version directory: <data>\engine\recoil_<ver>\spring.exe
  // dir is recoil_<ver>; going up two directories yields <data>
  return path.resolve(dir, '../..');
}

/**
 * Returns candidate default data directory paths for Windows.
 */
export function getCandidateDataDirs(env: NodeJS.ProcessEnv = process.env): string[] {
  const candidates: string[] = [];

  if (env.LOCALAPPDATA) {
    candidates.push(path.join(env.LOCALAPPDATA, 'Programs', 'Beyond-All-Reason', 'data'));
  }
  if (env.ProgramFiles) {
    candidates.push(path.join(env.ProgramFiles, 'Beyond-All-Reason', 'data'));
  }
  const programFilesX86 = env['ProgramFiles(x86)'];
  if (programFilesX86 && programFilesX86 !== env.ProgramFiles) {
    candidates.push(path.join(programFilesX86, 'Beyond-All-Reason', 'data'));
  }

  return candidates;
}

/**
 * Queries Windows registry for Beyond-All-Reason install location.
 * Fixed arguments, no shell, 3 s timeout.
 */
export async function registeredInstallDataDir(
  execFn: ExecFileFunction = execFileAsync
): Promise<string | null> {
  for (const key of REGISTRY_UNINSTALL_KEYS) {
    try {
      const { stdout } = await execFn(
        'reg',
        ['query', key, '/s', '/f', 'Beyond-All-Reason', '/d'],
        { timeout: 3000 }
      );
      const dataDir = parseDisplayIconFromRegOutput(stdout);
      if (dataDir) {
        return dataDir;
      }
    } catch {
      // Key not present or query failed; try next key
    }
  }
  return null;
}

/**
 * Queries running processes for Spring engine and derives data directory.
 * Fixed arguments, no shell, 3 s timeout.
 */
export async function runningEngineDataDir(
  execFn: ExecFileFunction = execFileAsync
): Promise<string | null> {
  try {
    const { stdout } = await execFn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-Process spring -ErrorAction SilentlyContinue | Select-Object -First 1).Path'
      ],
      { timeout: 3000 }
    );
    return parseEnginePathToDataDir(stdout);
  } catch {
    return null;
  }
}

export function createWindowsPlatform(execFn?: ExecFileFunction): Platform {
  return {
    candidateDataDirs: () => getCandidateDataDirs(),
    registeredInstallDataDir: () => registeredInstallDataDir(execFn),
    runningEngineDataDir: () => runningEngineDataDir(execFn)
  };
}

export const windowsPlatform: Platform = createWindowsPlatform();
