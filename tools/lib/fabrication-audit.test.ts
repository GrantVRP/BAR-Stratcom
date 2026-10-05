import { describe, expect, it } from 'vitest';
import { auditSource, auditText } from './fabrication-audit';

const ctx = { unitNames: new Set(['Pawn', 'Construction Bot']), unitIds: new Set(['armpw', 'armck']) };
const rules = (src: string, opts = { ui: true, constants: false }, file = 'src/renderer/src/x.tsx'): string[] =>
  auditSource(file, src, ctx, opts).map((f) => `${f.line}:${f.rule}:${f.detail}`);

describe('fabrication audit rules (T11.1, 08 §7)', () => {
  it('flags game-stat names given number literals: properties, ??/|| fallbacks, defaults, assignments', () => {
    const src = [
      'const a = { windAvg: 12, metalCost: 54 };',
      'const w = options.map?.windAvg ?? 12;',
      'function f(health = 900) { return health; }',
      'let buildTime = 1650;',
      'state.energyIncome = -20;',
      'const { mexYield = 1.5 } = opts;'
    ].join('\n');
    expect(rules(src, { ui: false, constants: false }, 'src/main/x.ts')).toEqual([
      '1:stat-literal:windAvg = 12',
      '1:stat-literal:metalCost = 54',
      '2:stat-literal:windAvg = 12',
      '3:stat-literal:health = 900',
      '4:stat-literal:buildTime = 1650',
      '5:stat-literal:energyIncome = -20',
      '6:stat-literal:mexYield = 1.5'
    ]);
  });

  it('allows zeros, unrelated names, values from data, and anything in constants.ts', () => {
    expect(rules('const a = { windMin: 0, width: 1280, speed: 4, windAvg: map.windAvg ?? null };')).toEqual([]);
    expect(rules('export const FALLBACK = { mexYield: 1.5 };', { ui: false, constants: true })).toEqual([]);
  });

  it('flags unit names and ids written into UI code (strings and JSX text), not elsewhere', () => {
    const src = "const x = 'armpw';\nconst y = <span>Pawn</span>;\nconst z = `Construction Bot`;\nconst ok = 'Pawns and more';";
    expect(rules(src)).toEqual(['1:unit-name:"armpw"', '2:unit-name:"Pawn"', '3:unit-name:"Construction Bot"']);
    expect(rules(src, { ui: false, constants: false })).toEqual([]);
    expect(rules(src, { ui: true, constants: true })).toEqual([]);
  });

  it('flags legacy asset names and hot-linked BAR website assets in code and text', () => {
    expect(rules("import art from '../assets/fiend-pixel.webp';\nconst u = `https://cdn.prod.website-files.com/x/${id}.png`;", { ui: false, constants: false })).toEqual([
      '1:legacy-asset:fiend-pixel.webp',
      '2:website-asset:cdn.prod.website-files.com'
    ]);
    expect(auditText('data/x.json', '{\n "img": "https://cdn.prod.website-files.com/a.png"\n}').map((f) => f.line)).toEqual([2]);
    expect(auditText('data/x.json', '{"ok": true}')).toEqual([]);
  });
});
