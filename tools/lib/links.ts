/**
 * T11.5: Markdown link checks. Relative links must name an existing file, and a `#fragment` must name
 * a heading there (GitHub's heading ids). External links are listed; the runner fetches them on demand.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface MdLink {
  target: string;
  line: number;
}

export interface LinkProblem {
  file: string;
  line: number;
  target: string;
  reason: string;
}

/** Links and images outside code: `[text](target)`, `![alt](target)`, `[ref]: target`, `<https://…>`, and the
 * `href`/`src` of HTML tags (GitHub renders `<a>`, `<img>`). */
export function extractLinks(markdown: string): MdLink[] {
  const out: MdLink[] = [];
  let fence: string | null = null;
  markdown.split(/\r?\n/).forEach((raw, i) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(raw);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1]![0]!;
      else if (fenceMatch[1]![0] === fence) fence = null;
      return;
    }
    if (fence !== null) return;
    const line = raw.replace(/`[^`]*`/g, '');
    for (const m of line.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) out.push({ target: m[1]!, line: i + 1 });
    const ref = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+"[^"]*")?\s*$/.exec(line);
    if (ref) out.push({ target: ref[1]!, line: i + 1 });
    for (const m of line.matchAll(/<(https?:\/\/[^>\s]+)>/g)) out.push({ target: m[1]!, line: i + 1 });
    for (const m of line.matchAll(/<[a-z][^>]*?\s(?:href|src)="([^"]+)"/gi)) out.push({ target: m[1]!, line: i + 1 });
  });
  return out;
}

/** GitHub's heading id: lower case, punctuation dropped (keeps letters, digits, `_`, `-`), spaces → `-`. */
export function slugify(heading: string): string {
  const text = heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim()
    .toLowerCase();
  return text.replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

/** Every heading id in a document, with GitHub's -1, -2 … suffixes for repeats. */
export function headingIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  const counts = new Map<string, number>();
  let fence: string | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(raw);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1]![0]!;
      else if (fenceMatch[1]![0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const m = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(raw);
    if (!m) continue;
    const base = slugify(m[1]!);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    ids.add(n === 0 ? base : `${base}-${n}`);
  }
  for (const m of markdown.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) ids.add(m[1]!);
  return ids;
}

export function isExternal(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target);
}

/** Problems with the relative links of `files` (paths relative to `root`). */
export function checkRelativeLinks(root: string, files: string[]): LinkProblem[] {
  const problems: LinkProblem[] = [];
  const idCache = new Map<string, Set<string>>();
  const ids = (abs: string): Set<string> => {
    if (!idCache.has(abs)) idCache.set(abs, headingIds(fs.readFileSync(abs, 'utf-8')));
    return idCache.get(abs)!;
  };
  for (const file of files) {
    const abs = path.join(root, file);
    for (const { target, line } of extractLinks(fs.readFileSync(abs, 'utf-8'))) {
      if (isExternal(target)) continue;
      const [rawPath, fragment] = target.split('#') as [string, string | undefined];
      const decoded = decodeURIComponent(rawPath);
      const dest = decoded === '' ? abs : path.resolve(path.dirname(abs), decoded);
      if (!dest.startsWith(path.resolve(root))) {
        problems.push({ file, line, target, reason: 'points outside the repository' });
        continue;
      }
      if (!fs.existsSync(dest)) {
        problems.push({ file, line, target, reason: 'no such file' });
        continue;
      }
      if (fragment && dest.endsWith('.md') && !ids(dest).has(fragment.toLowerCase())) {
        problems.push({ file, line, target, reason: `no heading #${fragment}` });
      }
    }
  }
  return problems;
}

/** Markdown files under `dirs` (and the listed single files), relative to `root`. */
export function markdownFiles(root: string, entries: string[]): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const name of fs.readdirSync(abs).sort()) walk(path.join(rel, name));
    } else if (rel.endsWith('.md')) {
      out.push(rel.split(path.sep).join('/'));
    }
  };
  entries.forEach(walk);
  return out;
}
