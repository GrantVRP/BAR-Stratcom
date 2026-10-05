/**
 * T11.1: fabrication audit, part of `npm run verify`.
 *
 *   npx tsx tools/audit-fabrication.ts
 *
 * Scans src/renderer and src/main (TypeScript: stat literals outside constants.ts, unit names in
 * renderer code, legacy asset names), every file name under src/ (legacy assets), and the text files
 * of src/, widget/ and data/ (hot-linked BAR website assets). Tests, fixtures and test data are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SnapshotIndexSchema, UnitSnapshotSchema } from '../src/core/schemas';
import { LEGACY_ASSETS, auditSource, auditText, type Finding } from './lib/fabrication-audit';

const ROOT = process.cwd();
const SKIP_DIR = new Set(['node_modules', '__fixtures__', '__test__', '__snapshots__', '__golden__', 'raw']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.lua', '.html', '.css', '.txt', '.ndjson']);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) walk(full, out);
    } else out.push(full);
  }
  return out;
}

const isTest = (f: string): boolean => /\.(test|spec)\.tsx?$/.test(f);
const rel = (f: string): string => path.relative(ROOT, f).replace(/\\/g, '/');

const index = SnapshotIndexSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/snapshots/index.json'), 'utf-8')));
const snapshotPath = index.available.find((a) => a.gameVersion === index.default)!.path;
const snapshot = UnitSnapshotSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/snapshots', snapshotPath), 'utf-8')));
const ctx = { unitNames: new Set(snapshot.units.map((u) => u.name)), unitIds: new Set(snapshot.units.map((u) => u.id)) };

const findings: Finding[] = [];
for (const file of [...walk(path.join(ROOT, 'src/renderer')), ...walk(path.join(ROOT, 'src/main'))]) {
  if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts') || isTest(file)) continue;
  const r = rel(file);
  findings.push(...auditSource(r, fs.readFileSync(file, 'utf-8'), ctx, { ui: r.startsWith('src/renderer/'), constants: path.basename(file) === 'constants.ts' }));
}
for (const file of walk(path.join(ROOT, 'src'))) {
  const base = path.basename(file);
  if ((LEGACY_ASSETS as readonly string[]).includes(base)) findings.push({ file: rel(file), line: 0, rule: 'legacy-asset', detail: base });
}
for (const file of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'widget')), ...walk(path.join(ROOT, 'data'))]) {
  if (!TEXT_EXT.has(path.extname(file)) || isTest(file)) continue;
  findings.push(...auditText(rel(file), fs.readFileSync(file, 'utf-8')));
}

for (const f of findings) console.error(`audit:fabrication: FAIL ${f.file}:${f.line} [${f.rule}] ${f.detail}`);
if (findings.length > 0) {
  console.error(`audit:fabrication: ${findings.length} finding(s); game facts must come from data/ (08 §7)`);
  process.exit(1);
}
console.log('audit:fabrication: OK (no stat literals, unit names in UI code, legacy assets or hot-linked website assets)');
