import fs from 'node:fs';
import path from 'node:path';
import * as luaparse from 'luaparse';

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

const widgetDir = path.resolve(process.cwd(), 'widget');
const luaFiles = findLuaFiles(widgetDir);

if (luaFiles.length === 0) {
  console.log('lint:lua: No .lua files found under widget/. Passing.');
  process.exit(0);
}

let hasErrors = false;
for (const file of luaFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  try {
    luaparse.parse(content, { luaVersion: '5.1' });
    console.log(`lint:lua: OK ${path.relative(process.cwd(), file)}`);
  } catch (err) {
    console.error(`lint:lua: ERROR ${path.relative(process.cwd(), file)}:`, err);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}
