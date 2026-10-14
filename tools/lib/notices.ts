/**
 * What ships in the release, read from the code and package-lock.json (never typed by hand).
 * The renderer and main are bundled from `src/`; every bare runtime import there names a package, and
 * package-lock.json gives the packages those pull in. Type-only imports and tests ship nothing.
 */
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const SOURCE_DIRS = ['src/main', 'src/preload', 'src/renderer', 'src/core', 'src/shared'];
const SKIP_DIRS = new Set(['__test__', '__tests__', '__fixtures__', '__golden__']);
const BUILTINS = new Set(builtinModules);
/** Electron is the runtime itself; its own licence files ship beside the exe (see the notices). */
const RUNTIME = 'electron';

export interface LockEntry {
  version?: string;
  license?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}
export type LockPackages = Record<string, LockEntry>;

export interface ShippedPackage {
  name: string;
  version: string;
  license: string;
  /** `node_modules/...` path in the lockfile. */
  dir: string;
  /** The licence file's text, or null when the package carries none. */
  text: string | null;
}

/** `@scope/pkg/sub` → `@scope/pkg`, `pkg/sub` → `pkg`; null for relative, builtin and runtime imports. */
export function packageOf(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) return null;
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
  if (BUILTINS.has(name) || name === RUNTIME) return null;
  return name;
}

/** Runtime imports of one source file (import/export from, side-effect imports, dynamic import('x')). */
export function runtimeImports(fileName: string, text: string): string[] {
  if (fileName.endsWith('.css')) return [...text.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnly = clause?.isTypeOnly || (clause?.namedBindings && ts.isNamedImports(clause.namedBindings) && !clause.name && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((e) => e.isTypeOnly));
      if (!typeOnly) out.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.isTypeOnly) out.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteral(arg)) out.push(arg.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Packages the app's own code imports at run time. */
export function shippedRoots(root: string): string[] {
  const names = new Set<string>();
  for (const dir of SOURCE_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of sourceFiles(abs)) {
      for (const spec of runtimeImports(file, fs.readFileSync(file, 'utf-8'))) {
        const name = packageOf(spec);
        if (name) names.add(name);
      }
    }
  }
  return [...names].sort();
}

/** Node's lookup from `from` (a lockfile path, '' = the project) for package `name`. */
export function resolveInLock(packages: LockPackages, from: string, name: string): string | null {
  let base = from;
  for (;;) {
    const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const cut = base.lastIndexOf('node_modules/');
    base = cut <= 0 ? '' : base.slice(0, cut - 1);
  }
}

/** Every lockfile path the roots pull in (dependencies and installed optional ones; peers are roots). */
export function closure(packages: LockPackages, roots: string[]): string[] {
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const name of roots) {
    const dir = resolveInLock(packages, '', name);
    if (!dir) throw new Error(`${name} is imported by the app but not in package-lock.json`);
    queue.push(dir);
  }
  while (queue.length > 0) {
    const dir = queue.shift()!;
    if (seen.has(dir)) continue;
    seen.add(dir);
    const entry = packages[dir]!;
    for (const [name, optional] of [
      ...Object.keys(entry.dependencies ?? {}).map((n) => [n, false] as const),
      ...Object.keys(entry.optionalDependencies ?? {}).map((n) => [n, true] as const)
    ]) {
      const dep = resolveInLock(packages, dir, name);
      if (dep) queue.push(dep);
      else if (!optional) throw new Error(`${dir} needs ${name}, which package-lock.json does not have`);
    }
  }
  return [...seen].sort();
}

const LICENCE_FILE = /^(licen[cs]e|copying)(\.(md|txt|markdown))?$|^(licen[cs]e|copying)[-_.]/i;

export function readShipped(root: string, packages: LockPackages, dirs: string[]): ShippedPackage[] {
  return dirs
    .map((dir) => {
      const abs = path.join(root, dir);
      const pkg = JSON.parse(fs.readFileSync(path.join(abs, 'package.json'), 'utf-8')) as { name: string; version: string; license?: unknown };
      const file = fs.readdirSync(abs).filter((f) => LICENCE_FILE.test(f)).sort()[0];
      const text = file ? fs.readFileSync(path.join(abs, file), 'utf-8').replace(/\r\n/g, '\n').trim() : null;
      const license = typeof pkg.license === 'string' ? pkg.license : (packages[dir]?.license ?? 'UNKNOWN');
      return { name: pkg.name, version: pkg.version, license, dir, text };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}
