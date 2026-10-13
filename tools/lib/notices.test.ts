import { describe, expect, it } from 'vitest';
import { closure, packageOf, resolveInLock, runtimeImports, type LockPackages } from './notices';

describe('third-party notices (T11.5)', () => {
  it('names the package of an import; relative, builtin and Electron imports ship nothing', () => {
    expect(packageOf('react-dom/client')).toBe('react-dom');
    expect(packageOf('@anthropic-ai/sdk/helpers/zod')).toBe('@anthropic-ai/sdk');
    expect(packageOf('./tokens.css')).toBeNull();
    expect(packageOf('node:fs')).toBeNull();
    expect(packageOf('path')).toBeNull();
    expect(packageOf('electron')).toBeNull();
  });

  it('counts runtime imports only: type-only imports and exports are erased', () => {
    const code = [
      "import React from 'react';",
      "import type { Plan } from 'plan-types';",
      "import { type A, type B } from 'only-types';",
      "import { type C, d } from 'mixed';",
      "import 'side-effect';",
      "export { e } from 're-export';",
      "export type { F } from 'type-export';",
      "const lazy = () => import('lazy-pkg');"
    ].join('\n');
    expect(runtimeImports('x.tsx', code)).toEqual(['react', 'mixed', 'side-effect', 're-export', 'lazy-pkg']);
    expect(runtimeImports('x.css', "@import 'tailwindcss';\n@import \"./pixel.css\";")).toEqual(['tailwindcss', './pixel.css']);
  });

  const packages: LockPackages = {
    '': {},
    'node_modules/a': { version: '1.0.0', dependencies: { b: '^1', c: '^2' }, optionalDependencies: { gone: '^1' } },
    'node_modules/a/node_modules/c': { version: '2.0.0' },
    'node_modules/b': { version: '1.0.0', dependencies: { c: '^1' } },
    'node_modules/c': { version: '1.0.0' },
    'node_modules/unused': { version: '1.0.0' }
  };

  it('resolves a dependency the way Node does: nested copy first, then up the tree', () => {
    expect(resolveInLock(packages, 'node_modules/a', 'c')).toBe('node_modules/a/node_modules/c');
    expect(resolveInLock(packages, 'node_modules/b', 'c')).toBe('node_modules/c');
    expect(resolveInLock(packages, '', 'missing')).toBeNull();
  });

  it('collects everything the roots pull in, skips optional packages that are not installed', () => {
    expect(closure(packages, ['a'])).toEqual(['node_modules/a', 'node_modules/a/node_modules/c', 'node_modules/b', 'node_modules/c']);
    expect(() => closure(packages, ['missing'])).toThrow(/not in package-lock.json/);
    expect(() => closure({ ...packages, 'node_modules/b': { dependencies: { nowhere: '^1' } } }, ['a'])).toThrow(/needs nowhere/);
  });
});
