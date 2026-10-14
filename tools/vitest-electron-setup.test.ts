import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../vitest.config';
import { ensureElectronBinary } from './vitest-electron-setup';

describe('vitest Electron setup (workers raced to download Electron on a fresh npm ci)', () => {
  it('loads electron once and returns the binary it points to', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-electron-'));
    const binary = path.join(dir, 'electron.exe');
    fs.writeFileSync(binary, '');
    const loaded: string[] = [];
    const load = (id: string): string => {
      loaded.push(id);
      return binary;
    };
    expect(ensureElectronBinary(load)).toBe(binary);
    expect(loaded).toEqual(['electron']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fails clearly when the binary is not there', () => {
    const missing = path.join(os.tmpdir(), 'stratcom-no-electron', 'electron.exe');
    expect(() => ensureElectronBinary(() => missing)).toThrow(/Electron binary is missing/);
    expect(() => ensureElectronBinary(() => undefined)).toThrow(/Electron binary is missing/);
  });

  it('runs before the node project, whose tests import the electron package', () => {
    const projects = (config.test?.projects ?? []) as unknown as Array<{ test?: { name?: string; globalSetup?: string | string[] } }>;
    const node = projects.find((p) => p.test?.name === 'node');
    expect([node?.test?.globalSetup].flat()).toContain('tools/vitest-electron-setup.ts');
  });

  it('the real electron package resolves to an installed binary', () => {
    expect(fs.existsSync(ensureElectronBinary())).toBe(true);
  });
});
