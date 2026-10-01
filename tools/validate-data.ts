import fs from 'node:fs';
import path from 'node:path';

function findJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

const dataDir = path.resolve(process.cwd(), 'data');
const jsonFiles = findJsonFiles(dataDir);

if (jsonFiles.length === 0) {
  console.log('validate:data: No .json files found under data/. Passing.');
  process.exit(0);
}

let hasErrors = false;
for (const file of jsonFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    JSON.parse(content);
    console.log(`validate:data: OK ${path.relative(process.cwd(), file)}`);
  } catch (err) {
    console.error(`validate:data: ERROR ${path.relative(process.cwd(), file)}:`, err);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}
