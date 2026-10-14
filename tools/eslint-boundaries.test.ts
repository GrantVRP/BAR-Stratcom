import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

describe('ESLint architectural boundaries', () => {
  const eslint = new ESLint();

  async function lintCode(code: string, filePath: string) {
    const results = await eslint.lintText(code, { filePath });
    return results[0]?.messages ?? [];
  }

  it('proves a src/core file importing electron fails lint', async () => {
    const messages = await lintCode("import { app } from 'electron';", 'src/core/sample.ts');
    const restricted = messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
    expect(restricted?.message).toMatch(/src\/core may not import electron/);
  });

  it('proves a src/core file importing node built-ins fails lint', async () => {
    const messages = await lintCode("import fs from 'node:fs';", 'src/core/sample.ts');
    const restricted = messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
    expect(restricted?.message).toMatch(/Node built-ins/);
  });

  it('proves a src/core file importing React fails lint', async () => {
    const messages = await lintCode("import React from 'react';", 'src/core/sample.ts');
    const restricted = messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
    expect(restricted?.message).toMatch(/React/);
  });

  it('proves a src/core file importing @shared fails lint', async () => {
    const messages = await lintCode("import { something } from '@shared';", 'src/core/sample.ts');
    const restricted = messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
    expect(restricted?.message).toMatch(/shared/);
  });

  it('proves a src/renderer file importing electron fails lint', async () => {
    const messages = await lintCode("import { ipcRenderer } from 'electron';", 'src/renderer/src/sample.ts');
    const restricted = messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
    expect(restricted?.message).toMatch(/src\/renderer may not import electron/);
  });

  it('proves a src/preload file importing core fails lint', async () => {
    const messages = await lintCode("import { something } from '@core';", 'src/preload/sample.ts');
    const restricted = messages.find((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toBeDefined();
    expect(restricted?.message).toMatch(/core/);
  });

  it('allows valid pure imports in src/core', async () => {
    const messages = await lintCode(
      'export const add = (a: number, b: number): number => a + b;',
      'src/core/sample.ts'
    );
    expect(messages.filter((m) => m.severity === 2)).toHaveLength(0);
  });
});
