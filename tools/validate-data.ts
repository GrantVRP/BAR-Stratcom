import fs from 'node:fs';
import path from 'node:path';
import {
  AliasesFileSchema,
  AvgWindFileSchema,
  BenchmarkFileSchema,
  BuildPlanSchema,
  FactionsFileSchema,
  MapsFileSchema,
  SessionMetaSchema,
  SnapshotIndexSchema,
  StateDocSchema,
  UnitSnapshotSchema,
  WidgetEventSchema,
  type MapsFile,
  type SessionMeta
} from '../src/core/schemas';
import { findMapByScriptName } from '../src/core/maps';
import { getStateFilePath, readStateLines } from './lib/state-reader';
import { isCandidatePath, validateCandidatePlan, validateCuratedPlanGuard } from './lib/curated-guard';

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
    } else if (file.endsWith('avg-wind.json')) {
      AvgWindFileSchema.parse(parsed);
      console.log(`validate:data: OK (avg wind schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').includes('benchmarks/')) {
      const bench = BenchmarkFileSchema.parse(parsed);
      if (path.basename(file) !== `${bench.factionId}-${bench.mode}.json`) {
        throw new Error(`benchmark file must be named <factionId>-<mode>.json, got ${path.basename(file)}`);
      }
      console.log(`validate:data: OK (benchmark schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').endsWith('snapshots/index.json')) {
      SnapshotIndexSchema.parse(parsed);
      console.log(`validate:data: OK (snapshot index schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').includes('snapshots/') && file.endsWith('units.json')) {
      UnitSnapshotSchema.parse(parsed);
      console.log(`validate:data: OK (unit snapshot schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').includes('fixtures/sessions/') && file.endsWith('meta.json')) {
      SessionMetaSchema.parse(parsed);
      console.log(`validate:data: OK (session meta schema) ${relPath}`);
    } else if (relPath.replace(/\\/g, '/').includes('builds/') && file.endsWith('.json')) {
      const plan = BuildPlanSchema.parse(parsed);
      const guardResult = isCandidatePath(relPath) ? validateCandidatePlan(plan) : validateCuratedPlanGuard(plan);
      if (!guardResult.valid) {
        throw new Error(guardResult.reason ?? 'Curated plan guard failed');
      }
      console.log(`validate:data: OK (build plan schema & curated guard) ${relPath}`);
    } else {
      console.log(`validate:data: OK (json) ${relPath}`);
    }
  } catch (err) {
    console.error(`validate:data: ERROR ${relPath}:`, err);
    hasErrors = true;
  }
}

// Fixture sessions validation
const mapsFileContent = fs.readFileSync(path.resolve(dataDir, 'maps', 'maps.json'), 'utf-8');
const mapsData: MapsFile = JSON.parse(mapsFileContent);

const fixturesDir = path.resolve(dataDir, 'fixtures', 'sessions');
if (fs.existsSync(fixturesDir)) {
  const sessionDirs = fs.readdirSync(fixturesDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const sessionDir of sessionDirs) {
    const fixturePath = path.join(fixturesDir, sessionDir.name);
    const relFixturePath = path.relative(process.cwd(), fixturePath);

    // 0. meta.json & map resolution check
    const metaPath = path.join(fixturePath, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      console.error(`validate:data: ERROR missing meta.json in ${relFixturePath}`);
      hasErrors = true;
    } else {
      try {
        const metaDoc = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as SessionMeta;
        const resolvedMap = findMapByScriptName(mapsData.maps, metaDoc.mapScriptName);
        if (!resolvedMap) {
          console.error(`validate:data: ERROR map "${metaDoc.mapScriptName}" in ${relFixturePath} did not resolve in maps.json`);
          hasErrors = true;
        } else {
          console.log(`validate:data: OK (map resolved: "${resolvedMap.scriptName}" -> ${resolvedMap.fileName}) ${relFixturePath}`);
        }
      } catch (err) {
        console.error(`validate:data: ERROR reading meta.json in ${relFixturePath}:`, err);
        hasErrors = true;
      }
    }

    // 1. events.ndjson validation
    const eventsPath = path.join(fixturePath, 'events.ndjson');
    if (!fs.existsSync(eventsPath)) {
      console.error(`validate:data: ERROR missing events.ndjson in ${relFixturePath}`);
      hasErrors = true;
    } else {
      try {
        const eventsContent = fs.readFileSync(eventsPath, 'utf-8');
        const lines = eventsContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (let i = 0; i < lines.length; i++) {
          WidgetEventSchema.parse(JSON.parse(lines[i]!));
        }
        console.log(`validate:data: OK (${lines.length} events) ${path.join(relFixturePath, 'events.ndjson')}`);
      } catch (err) {
        console.error(`validate:data: ERROR invalid events in ${relFixturePath}:`, err);
        hasErrors = true;
      }
    }

    // 2. state.ndjson / state.ndjson.gz validation via readStateLines
    try {
      const stateFile = getStateFilePath(fixturePath);
      const stateLines = readStateLines(fixturePath);
      for (let i = 0; i < stateLines.length; i++) {
        StateDocSchema.parse(JSON.parse(stateLines[i]!));
      }
      console.log(
        `validate:data: OK (${stateLines.length} state docs, ${stateFile.isGzip ? 'gzip' : 'plain'}) ${path.relative(process.cwd(), stateFile.path)}`
      );
    } catch (err) {
      console.error(`validate:data: ERROR invalid state in ${relFixturePath}:`, err);
      hasErrors = true;
    }

    // 3. Size guard: each fixture <= 5 MB
    let totalSizeBytes = 0;
    for (const f of fs.readdirSync(fixturePath)) {
      totalSizeBytes += fs.statSync(path.join(fixturePath, f)).size;
    }
    const maxSizeBytes = 5 * 1024 * 1024;
    if (totalSizeBytes > maxSizeBytes) {
      console.error(
        `validate:data: ERROR size guard exceeded in ${relFixturePath}: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB > 5 MB`
      );
      hasErrors = true;
    } else {
      console.log(
        `validate:data: OK (size guard ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB <= 5 MB) ${relFixturePath}`
      );
    }
  }
}

if (hasErrors) {
  process.exit(1);
}
