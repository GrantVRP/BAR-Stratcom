import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../core/schemas/settings';
import { IPC_CHANNELS, IPC_EVENT_CHANNELS } from '../shared/channels';
import { ipcContract, ipcEvents } from '../shared/ipc';
import { isAllowedGlobalShortcut } from './shortcuts/accelerator';
import { devRendererUrl } from './windows/dev-url';

/** Security checklist (08 §6, T11.2), checked on the source so new code cannot slip past it. */
const ROOT = process.cwd();
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__fixtures__' || e.name === 'node_modules' ? [] : walk(full);
    return /\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name) ? [full] : [];
  });
const rel = (f: string): string => path.relative(ROOT, f).replace(/\\/g, '/');
const SRC = walk(path.join(ROOT, 'src'));
const MAIN = SRC.filter((f) => rel(f).startsWith('src/main/'));
const RENDERER = SRC.filter((f) => rel(f).startsWith('src/renderer/'));
const read = (f: string): string => fs.readFileSync(f, 'utf-8');
const filesMatching = (files: string[], re: RegExp): string[] => files.filter((f) => re.test(read(f))).map(rel);

describe('security checklist (08 §6, T11.2)', () => {
  it('every BrowserWindow: contextIsolation, sandbox, no nodeIntegration, webSecurity; window.open denied and navigation blocked', () => {
    let windows = 0;
    for (const file of MAIN) {
      const text = read(file);
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        if (ts.isNewExpression(node) && node.expression.getText(sf) === 'BrowserWindow') {
          windows += 1;
          const options = node.arguments?.[0];
          expect(options && ts.isObjectLiteralExpression(options), rel(file)).toBe(true);
          const prefs = (options as ts.ObjectLiteralExpression).properties.find((p) => p.name?.getText(sf) === 'webPreferences');
          const literal = prefs && ts.isPropertyAssignment(prefs) && ts.isObjectLiteralExpression(prefs.initializer) ? prefs.initializer : null;
          expect(literal, `${rel(file)}: webPreferences`).not.toBeNull();
          const value = (name: string): string | undefined =>
            literal!.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(sf) === name)?.initializer.getText(sf);
          expect([value('contextIsolation'), value('sandbox'), value('nodeIntegration'), value('webSecurity')], rel(file)).toEqual(['true', 'true', 'false', 'true']);
          expect(value('webviewTag'), rel(file)).not.toBe('true');
          expect(value('nodeIntegrationInWorker'), rel(file)).not.toBe('true');
          // the same file denies new windows and blocks navigation
          expect(text, rel(file)).toMatch(/setWindowOpenHandler\(\(\)\s*=>\s*\(?\{\s*action:\s*'deny'/);
          expect(text, rel(file)).toMatch(/on\('will-navigate',\s*\(event\)\s*=>\s*\{?\s*event\.preventDefault\(\)/);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(windows).toBe(2); // main window + coach window
    expect(filesMatching(SRC, /<webview|webviewTag:\s*true/)).toEqual([]);
  });

  it('windows load local files; the dev server URL only in a non-packaged build and only on localhost', () => {
    expect(devRendererUrl({ ELECTRON_RENDERER_URL: 'http://localhost:5173' }, false)).toBe('http://localhost:5173');
    expect(devRendererUrl({ ELECTRON_RENDERER_URL: 'http://localhost:5173' }, true)).toBeNull();
    expect(devRendererUrl({ ELECTRON_RENDERER_URL: 'https://evil.example' }, false)).toBeNull();
    expect(devRendererUrl({ ELECTRON_RENDERER_URL: 'file:///C:/x.html' }, false)).toBeNull();
    expect(devRendererUrl({}, false)).toBeNull();
    expect(filesMatching(MAIN.filter((f) => !rel(f).endsWith('windows/dev-url.ts')), /process\.env\.ELECTRON_RENDERER_URL/)).toEqual([]);
  });

  it('production CSP as in 02 §6, nothing remote in the page, and the renderer makes no network requests', () => {
    const html = fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf-8');
    expect(html).toContain(
      `content="default-src 'self'; img-src 'self' data: https://maps-metadata.beyondallreason.dev; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; script-src 'self';"`
    );
    expect(html).not.toMatch(/<(script|link)[^>]+(src|href)="https?:/);
    expect(filesMatching(RENDERER, /\bfetch\(|XMLHttpRequest|new WebSocket|new EventSource|fonts\.googleapis/)).toEqual([]);
  });

  it('preload exposes exactly the contract channels (refusals are tested in src/preload/channels.test.ts)', () => {
    expect([...IPC_CHANNELS].sort()).toEqual(Object.keys(ipcContract).sort());
    expect([...IPC_EVENT_CHANNELS].sort()).toEqual(Object.keys(ipcEvents).sort());
    const preload = read(path.join(ROOT, 'src/preload/index.ts'));
    expect(preload).toMatch(/exposeInMainWorld\('stratcom', stratcomAPI\)/);
    expect(preload.match(/exposeInMainWorld/g)).toHaveLength(1);
  });

  it('IPC handlers are registered only through handle(), which validates every request with zod', () => {
    expect(filesMatching(MAIN, /ipcMain\.(handle|on|once|handleOnce)\(/)).toEqual(['src/main/ipc/register.ts']);
    const register = read(path.join(ROOT, 'src/main/ipc/register.ts'));
    expect(register).toMatch(/contract\.request\.safeParse\(rawReq\)/);
  });

  it('no HTTP/WebSocket servers; child_process only in platform/windows.ts with execFile, fixed args, no shell, timeouts', () => {
    expect(filesMatching(SRC, /createServer|WebSocketServer|from ['"](node:)?(http|https|net|dgram|ws|express)['"]|\.listen\(/)).toEqual([]);
    expect(filesMatching(SRC, /child_process/)).toEqual(['src/main/platform/windows.ts']);
    const platform = read(path.join(ROOT, 'src/main/platform/windows.ts'));
    expect(platform).not.toMatch(/\bexec\(|spawn|shell:\s*true|execSync/);
    expect(platform.match(/timeout: 3000/g)).toHaveLength(2);
  });

  it('shell.openExternal only behind the 02 §6 allow-list (T11.4), openPath only for the app’s own data folder', () => {
    expect(filesMatching(MAIN, /shell\.openExternal\(/)).toEqual(['src/main/shell/open-external.ts']);
    const opener = read(path.join(ROOT, 'src/main/shell/open-external.ts'));
    expect(opener).toMatch(/if \(!isAllowedExternalUrl\(url\)\) throw[^\n]*\n\s*await shell\.openExternal\(url\);/);
    // the renderer can only ask main (no shell access of its own)
    expect(filesMatching(SRC.filter((f) => rel(f).startsWith('src/renderer/')), /\bshell\.|openExternal\(/)).toEqual([]);
    expect(filesMatching(MAIN, /shell\.openPath\(/)).toEqual(['src/main/data/handlers.ts']);
    expect(read(path.join(ROOT, 'src/main/data/handlers.ts'))).toMatch(/const userPath = app\.getPath\('userData'\);\s*await shell\.openPath\(userPath\)/);
  });

  it('one configurable global shortcut, never a single key', () => {
    expect(filesMatching(MAIN, /globalShortcut\.register\(/)).toEqual(['src/main/shortcuts/global-shortcut.ts']);
    for (const ok of ['Ctrl+Alt+S', 'CommandOrControl+Shift+K', 'Alt+F9', 'Super+J']) expect(isAllowedGlobalShortcut(ok), ok).toBe(true);
    for (const bad of ['A', 'F9', 'Shift+A', 'Ctrl+Alt', 'Ctrl+A+B', 'Ctrl++', 'Ctrl+Ctrl+A', '']) expect(isAllowedGlobalShortcut(bad), bad).toBe(false);
    expect(isAllowedGlobalShortcut(defaultSettings().globalShortcut!)).toBe(true);
    // settings:set refuses an unsafe shortcut, and registration skips a stored one
    expect(read(path.join(ROOT, 'src/main/index.ts'))).toContain('req?.globalShortcut && !isAllowedGlobalShortcut(req.globalShortcut)');
    expect(read(path.join(ROOT, 'src/main/shortcuts/global-shortcut.ts'))).toContain('!isAllowedGlobalShortcut(shortcut.trim())');
  });

  it('API keys never reach logs or the renderer; assist is off by default', () => {
    for (const file of MAIN.filter((f) => rel(f).startsWith('src/main/ai/'))) {
      for (const call of read(file).match(/console\.\w+\([^;]*\)/g) ?? []) expect(call, rel(file)).not.toMatch(/apiKey|getKey|key\b/i);
    }
    expect(ipcContract['ai:listProviders'].response.safeParse([{ id: 'openai', label: 'OpenAI', needsKey: true, local: false, hasKey: true, key: 'sk-x' }]).success).toBe(false);
    expect(defaultSettings().assist).toEqual({ armNext: false, factoryQueue: false });
  });
});
