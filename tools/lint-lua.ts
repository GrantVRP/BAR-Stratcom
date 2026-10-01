import fs from 'node:fs';
import path from 'node:path';
import * as luaparse from 'luaparse';
import { walkLuaAst } from './lint-lua-visitor';

export interface LintError {
  message: string;
  line: number;
  column: number;
}

export function lintLua(source: string): LintError[] {
  const errors: LintError[] = [];

  let chunk: luaparse.Chunk;
  try {
    chunk = luaparse.parse(source, {
      luaVersion: '5.1',
      locations: true,
      ranges: true
    });
  } catch (err: unknown) {
    const parseErr = err as { line?: number; column?: number; message?: string };
    errors.push({
      message: `Lua parse error: ${parseErr.message ?? String(err)}`,
      line: parseErr.line ?? 1,
      column: parseErr.column ?? 0
    });
    return errors;
  }

  function addError(message: string, loc?: { start: { line: number; column: number } }): void {
    errors.push({
      message,
      line: loc?.start.line ?? 1,
      column: loc?.start.column ?? 0
    });
  }

  walkLuaAst(chunk, addError);
  return errors;
}

function findLuaFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findLuaFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.lua')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function runLint(): boolean {
  const widgetDir = path.resolve(process.cwd(), 'widget');
  const luaFiles = findLuaFiles(widgetDir);

  if (luaFiles.length === 0) {
    console.log('lint:lua: No .lua files found under widget/. Passing.');
    return true;
  }

  let hasErrors = false;
  for (const file of luaFiles) {
    const rel = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, 'utf-8');
    const errors = lintLua(content);
    if (errors.length > 0) {
      hasErrors = true;
      for (const err of errors) {
        console.error(`lint:lua: ERROR ${rel}:${err.line}:${err.column}: ${err.message}`);
      }
    } else {
      console.log(`lint:lua: OK ${rel}`);
    }
  }

  return !hasErrors;
}

if (process.argv[1]?.endsWith('lint-lua.ts')) {
  const success = runLint();
  process.exit(success ? 0 : 1);
}
