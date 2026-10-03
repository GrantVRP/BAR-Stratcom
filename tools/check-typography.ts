import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export interface TypographyError {
  file: string;
  line: number;
  column: number;
  message: string;
}

export function checkArbitraryFontSizes(filePath: string, content: string): TypographyError[] {
  const errors: TypographyError[] = [];
  const lines = content.split('\n');

  // Check Tailwind arbitrary text sizes like text-[8px], text-[9.5px], text-[0.5rem]
  const tailwindRegex = /\btext-\[([0-9.]+)(px|rem|em)?\]/g;
  // Check CSS font-size below 10px / 0.625rem
  const cssRegex = /\bfont-size:\s*([0-9.]+)(px|rem|em)\b/g;

  lines.forEach((lineText, lineIdx) => {
    let match: RegExpExecArray | null;

    // Tailwind text-[...] check
    tailwindRegex.lastIndex = 0;
    while ((match = tailwindRegex.exec(lineText)) !== null) {
      if (!match[1]) continue;
      const val = parseFloat(match[1]);
      const unit = match[2] ?? 'px';

      let isBelow10px = false;
      if (unit === 'px' && val < 10) {
        isBelow10px = true;
      } else if ((unit === 'rem' || unit === 'em') && val < 0.625) {
        isBelow10px = true;
      }

      if (isBelow10px) {
        errors.push({
          file: filePath,
          line: lineIdx + 1,
          column: match.index + 1,
          message: `Forbidden font size "${match[0]}": minimum font size is 10px (06 §3 / design rule).`
        });
      }
    }

    // CSS font-size check
    if (filePath.endsWith('.css')) {
      cssRegex.lastIndex = 0;
      while ((match = cssRegex.exec(lineText)) !== null) {
        if (!match[1]) continue;
        const val = parseFloat(match[1]);
        const unit = match[2];

        // Allow font-size: 0
        if (val === 0) continue;

        let isBelow10px = false;
        if (unit === 'px' && val < 10) {
          isBelow10px = true;
        } else if ((unit === 'rem' || unit === 'em') && val < 0.625) {
          isBelow10px = true;
        }

        if (isBelow10px) {
          errors.push({
            file: filePath,
            line: lineIdx + 1,
            column: match.index + 1,
            message: `Forbidden CSS font-size "${match[0]}": minimum font size is 10px (06 §3 / design rule).`
          });
        }
      }
    }
  });

  return errors;
}

export function checkDataNumTypography(filePath: string, content: string): TypographyError[] {
  const errors: TypographyError[] = [];

  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) {
    return errors;
  }

  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function getAttributeText(attr: ts.JsxAttributeLike): string {
    if (!ts.isJsxAttribute(attr) || !attr.initializer) return '';
    if (ts.isStringLiteral(attr.initializer)) {
      return attr.initializer.text;
    }
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
      return attr.initializer.expression.getText(sourceFile);
    }
    return '';
  }

  function checkElement(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): void {
    const tagName = node.tagName.getText(sourceFile);
    let hasDataNum = tagName === 'Num';
    let classNames = '';

    for (const prop of node.attributes.properties) {
      if (ts.isJsxAttribute(prop)) {
        const attrName = prop.name.getText(sourceFile);
        if (attrName === 'data-num') {
          hasDataNum = true;
        }
        if (attrName === 'className' || attrName === 'class') {
          classNames += ' ' + getAttributeText(prop);
        }
      }
    }

    if (hasDataNum) {
      if (classNames.includes('font-pixel-heading') || classNames.includes('font-pixel-body')) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        errors.push({
          file: filePath,
          line: pos.line + 1,
          column: pos.character + 1,
          message: `Element with data-num must use JetBrains Mono (font-mono), not font-pixel-heading or font-pixel-body.`
        });
      }
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      checkElement(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return errors;
}

export function scanDirectory(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results.push(...scanDirectory(fullPath));
      }
    } else if (
      entry.name.endsWith('.tsx') ||
      entry.name.endsWith('.jsx') ||
      entry.name.endsWith('.ts') ||
      entry.name.endsWith('.css') ||
      entry.name.endsWith('.html')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

export function checkTypography(): boolean {
  const targetDir = path.resolve(process.cwd(), 'src/renderer');
  const files = scanDirectory(targetDir);
  let totalErrors = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');

    const sizeErrors = checkArbitraryFontSizes(rel, content);
    const numErrors = checkDataNumTypography(rel, content);
    const allErrors = [...sizeErrors, ...numErrors];

    if (allErrors.length > 0) {
      totalErrors += allErrors.length;
      for (const err of allErrors) {
        console.error(`check-typography: ERROR ${err.file}:${err.line}:${err.column}: ${err.message}`);
      }
    }
  }

  if (totalErrors > 0) {
    console.error(`\ncheck-typography: Found ${totalErrors} typography violation(s).`);
    return false;
  }

  console.log(`check-typography: OK (${files.length} files scanned in src/renderer)`);
  return true;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/check-typography.ts')) {
  const success = checkTypography();
  process.exit(success ? 0 : 1);
}
