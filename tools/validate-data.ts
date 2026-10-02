import fs from 'node:fs';
import path from 'node:path';
import {
  AliasesFileSchema,
  FactionsFileSchema,
  MapsFileSchema,
  SnapshotIndexSchema,
  UnitSnapshotSchema
} from '../src/core/schemas';

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
  const relPath = path.relative(process.cwd(), file);
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (file.endsWith('factions.json')) {
      FactionsFileSchema.parse(parsed);
      console.log(`validate:data: OK (factions schema) ${relPath}`);
    } else if (file.endsWith('aliases.json')) {
      AliasesFileSchema.parse(parsed);
      console.log(`validate:data: OK (aliases schema) ${relPath}`);
    } else if (file.endsWith('maps.json')) {
      MapsFileSchema.parse(parsed);
      console.log(`validate:data: OK (maps schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').endsWith('snapshots/index.json')) {
      SnapshotIndexSchema.parse(parsed);
      console.log(`validate:data: OK (snapshot index schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').includes('snapshots/') && file.endsWith('units.json')) {
      UnitSnapshotSchema.parse(parsed);
      console.log(`validate:data: OK (unit snapshot schema) ${relPath}`);
    } else {
      console.log(`validate:data: OK (json) ${relPath}`);
    }
  } catch (err) {
    console.error(`validate:data: ERROR ${relPath}:`, err);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}
