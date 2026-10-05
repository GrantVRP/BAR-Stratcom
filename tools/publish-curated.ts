/**
 * T08.9: publish the curated library from the H3 review.
 *
 *   npx tsx tools/publish-curated.ts --reviewer <handle> --date YYYY-MM-DD
 *
 * The reviewer handle is the one recorded in docs/plan/STATUS.md → H3. See tools/lib/publish-curated.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AvgWindFileSchema, MapsFileSchema } from '../src/core/schemas';
import { publishCurated } from './lib/publish-curated';
import { registryLoader } from './lib/registry-for';

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const reviewer = arg('--reviewer');
const date = arg('--date');
if (!reviewer || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: npx tsx tools/publish-curated.ts --reviewer <handle> --date YYYY-MM-DD');
  process.exit(1);
}

const DATA = path.join(process.cwd(), 'data');
const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf-8'));
const result = publishCurated({
  buildsDir: path.join(DATA, 'builds'),
  registryFor: registryLoader(DATA),
  maps: MapsFileSchema.parse(readJson('maps/maps.json')).maps,
  windTable: AvgWindFileSchema.parse(readJson('wind/avg-wind.json')).table,
  reviewer,
  reviewedAt: date,
  createdAt: `${date}T00:00:00.000Z`
});
console.log(`Published ${result.curated.length} curated plans and ${result.beginner.length} beginner variants; ${result.rejected.length} rejected removed.`);
