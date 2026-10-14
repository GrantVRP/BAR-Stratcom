import path from 'node:path';

/**
 * Path guard: the app writes only inside userData, `<BAR data>/stratcom` and
 * `<BAR data>/LuaUI/Widgets`. Names that reach a path from IPC or from files (plan ids, session ids)
 * must be single, plain names, and the joined path must stay inside its root.
 */

/** One file or folder name: letters/digits first, then letters, digits, `. _ -` or spaces; never "." or "..". */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,199}$/;

export function isSafeName(name: string): boolean {
  return SAFE_NAME.test(name) && !name.includes('..');
}

export class PathGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathGuardError';
  }
}

/** `root/<parts>` resolved, or a PathGuardError when it would leave `root` (or be `root` itself). */
export function insideRoot(root: string, ...parts: string[]): string {
  const base = path.resolve(root);
  const target = path.resolve(base, ...parts);
  const rel = path.relative(base, target);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathGuardError(`Refusing a path outside ${base}`);
  }
  return target;
}

/** `root/<name><suffix>` for a single safe name (e.g. a plan id + ".json"). */
export function namedFile(root: string, name: string, suffix = ''): string {
  if (!isSafeName(name)) throw new PathGuardError(`Not a valid name: ${JSON.stringify(name.slice(0, 80))}`);
  return insideRoot(root, `${name}${suffix}`);
}
