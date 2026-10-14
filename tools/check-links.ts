/**
 * Link check over the README, the other root documents, docs/ and the widget README.
 *   npm run check:links             relative links and #headings (part of verify, offline)
 *   npx tsx tools/check-links.ts --online   also fetches every external link once
 */
import fs from 'node:fs';
import { checkRelativeLinks, extractLinks, isExternal, markdownFiles } from './lib/links';

const ROOT = process.cwd();
const ENTRIES = ['README.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'docs', 'widget/README.md'];

async function checkOnline(files: string[]): Promise<number> {
  const urls = new Map<string, string>();
  for (const file of files) {
    for (const { target, line } of extractLinks(fs.readFileSync(file, 'utf-8'))) {
      if (/^https?:/i.test(target) && !urls.has(target)) urls.set(target, `${file}:${line}`);
    }
  }
  let failed = 0;
  for (const [url, where] of urls) {
    let status: number | string;
    try {
      // HEAD first (no download); some servers only answer GET, whose body is then dropped unread
      const ask = async (method: 'HEAD' | 'GET'): Promise<number> => {
        const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'BAR-StratCom-link-check' } });
        await res.body?.cancel();
        return res.status;
      };
      status = await ask('HEAD');
      if (status >= 400) status = await ask('GET');
    } catch (err) {
      status = err instanceof Error ? err.message : String(err);
    }
    const ok = typeof status === 'number' && status < 400;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${status} ${url} (${where})`);
  }
  return failed;
}

async function main(): Promise<void> {
  const files = markdownFiles(ROOT, ENTRIES);
  const problems = checkRelativeLinks(ROOT, files);
  for (const p of problems) console.error(`${p.file}:${p.line}: ${p.target}: ${p.reason}`);
  const external = files.flatMap((f) => extractLinks(fs.readFileSync(f, 'utf-8')).filter((l) => isExternal(l.target))).length;
  console.log(`${files.length} documents, ${problems.length} broken relative links, ${external} external links${process.argv.includes('--online') ? '' : ' (not fetched; --online)'}.`);
  let failed = problems.length;
  if (process.argv.includes('--online')) failed += await checkOnline(files);
  if (failed > 0) process.exitCode = 1;
}

void main();
