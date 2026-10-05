import ts from 'typescript';

/**
 * Fabrication audit rules (T11.1, 08 §7). Game facts come from the player's game (data/), never from
 * code: a game-stat name given a number literal outside constants.ts, a unit name or id written into
 * UI code, a legacy (non-original, Q-01) asset file name, or a hot-linked BAR website asset all fail.
 */
export interface Finding {
  file: string;
  line: number;
  rule: 'stat-literal' | 'unit-name' | 'legacy-asset' | 'website-asset';
  detail: string;
}

/** Names whose value is a game stat (unit, map or economy); a literal for them is invented data. */
export const STAT_NAME =
  /^(?:metal|energy)(?:Cost|Make|Upkeep|Storage|Income)$|^(?:buildTime|buildSpeed|buildPower|health|maxHealth|dps|damage|weaponRange|maxWeaponRange|sightDistance|radarDistance|windAvg|avgWind|windMin|windMax|windRisk|tidalStrength|mexYield|extractsMetal|windGenerator|tidalGenerator|techLevel)$/;

/** Legacy files the owner did not confirm as original (STATUS Q-01); they must never ship. */
export const LEGACY_ASSETS = [
  'armada-air-plant.png', 'armada-aircraft-plant.png', 'armada-aircraftplant.png', 'armada-airplant.png', 'armada-bot-lab.png',
  'armada-botlab.png', 'armada-estorage.png', 'armada-fusion.png', 'armada-logo.png', 'armada-mex.png', 'armada-shipyard.png',
  'armada-solar.png', 'armada-vehicle-plant.png', 'armada-vplant.png', 'bar-energy.png', 'bar-metal.png', 'cortex-air-plant.png',
  'cortex-aircraft-plant.png', 'cortex-aircraftplant.png', 'cortex-airplant.png', 'cortex-bot-lab.png', 'cortex-botlab.png',
  'cortex-estorage.png', 'cortex-fusion.png', 'cortex-logo.png', 'cortex-mex-feathered.png', 'cortex-mex.png', 'cortex-shipyard.png',
  'cortex-solar.png', 'cortex-vehicle-plant.png', 'cortex-vplant.png', 'energy.png', 'metal.png', 'fiend-pixel.gif', 'fiend-pixel.webp',
  'sprinter-pixel.gif', 'sprinter-pixel.webp', 'corpyro.glb', 'corpyro_diffuse.png', 'fiend_original.png',
  'fiend_original_transparent.png', 'fiend_pixel_poster.png', 'fiend_preview.png'
] as const;

export const WEBSITE_ASSET_HOST = 'cdn.prod.website-files.com';

const nameOf = (node: ts.Node): string | null => {
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) return node.argumentExpression.text;
  return null;
};

/** A non-zero number literal (optionally negated). */
const isStatNumber = (node: ts.Node | undefined): node is ts.Expression => {
  if (!node) return false;
  const inner = ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken ? node.operand : node;
  return ts.isNumericLiteral(inner) && Number(inner.text) !== 0;
};

export interface AuditContext {
  /** Current unit display names and unit ids (from the snapshot). */
  unitNames: ReadonlySet<string>;
  unitIds: ReadonlySet<string>;
}

/**
 * Audits one TypeScript source. `ui` adds the unit-name rule (renderer code); `constants` (a
 * constants.ts file) skips the stat-literal and unit-name rules: named, documented constants live there.
 */
export function auditSource(file: string, text: string, ctx: AuditContext, opts: { ui: boolean; constants: boolean }): Finding[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings: Finding[] = [];
  const add = (node: ts.Node, rule: Finding['rule'], detail: string): void => {
    findings.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule, detail });
  };
  const statCheck = (name: string | null, value: ts.Node | undefined, at: ts.Node): void => {
    if (!opts.constants && name && STAT_NAME.test(name) && isStatNumber(value)) add(at, 'stat-literal', `${name} = ${value.getText(sf)}`);
  };
  const textCheck = (value: string, at: ts.Node): void => {
    for (const asset of LEGACY_ASSETS) if (value.includes(asset)) add(at, 'legacy-asset', asset);
    if (value.includes(WEBSITE_ASSET_HOST)) add(at, 'website-asset', WEBSITE_ASSET_HOST);
    const t = value.trim();
    if (opts.ui && !opts.constants && t && (ctx.unitNames.has(t) || ctx.unitIds.has(t))) add(at, 'unit-name', JSON.stringify(t));
  };

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node)) statCheck(nameOf(node.name), node.initializer, node);
    else if (ts.isVariableDeclaration(node)) statCheck(nameOf(node.name), node.initializer, node);
    else if (ts.isParameter(node)) statCheck(nameOf(node.name), node.initializer, node);
    else if (ts.isBindingElement(node)) statCheck(nameOf(node.name), node.initializer, node);
    else if (
      ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.EqualsToken].includes(node.operatorToken.kind)
    ) {
      statCheck(nameOf(node.left), node.right, node);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // import paths and type positions are text too; legacy names are caught there
      textCheck(node.text, node);
    } else if (ts.isTemplateExpression(node)) {
      textCheck(node.head.text, node);
      for (const span of node.templateSpans) textCheck(span.literal.text, span);
    } else if (ts.isJsxText(node)) {
      textCheck(node.text, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

/** Plain-text rule for data, docs-free trees and other text files: no hot-linked BAR website assets. */
export function auditText(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  text.split('\n').forEach((line, i) => {
    if (line.includes(WEBSITE_ASSET_HOST)) findings.push({ file, line: i + 1, rule: 'website-asset', detail: WEBSITE_ASSET_HOST });
  });
  return findings;
}
