/**
 * Adds BAR's wind-risk table to data/wind/avg-wind.json, read from the player's installed game.
 *
 *   npx tsx tools/import-wind-risk.ts --bar-data D:/BAR/Beyond-All-Reason/data
 *
 * Finds the rapid package of the game version the averages were exported from (avg-wind.json
 * `gameVersion`), reads its common/wind_functions.lua and checks it against our averages first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AvgWindFileSchema } from '../src/core/schemas/maps';
import { findPackage, readPackageFile } from './lib/rapid';
import { withRiskTable } from './lib/wind-risk';

const i = process.argv.indexOf('--bar-data');
const barData = i >= 0 ? process.argv[i + 1] : undefined;
if (!barData) {
  console.error('Usage: npx tsx tools/import-wind-risk.ts --bar-data <BAR data folder>');
  process.exit(1);
}
const file = path.join(process.cwd(), 'data/wind/avg-wind.json');
const wind = AvgWindFileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')));
const versionName = `Beyond All Reason ${wind.gameVersion}`;
const pkg = findPackage(barData, versionName);
if (!pkg) throw new Error(`${versionName} is not installed in ${barData} (rapid)`);
const lua = readPackageFile(barData, pkg, 'common/wind_functions.lua');
if (!lua) throw new Error(`${versionName} has no common/wind_functions.lua`);
const updated = AvgWindFileSchema.parse(withRiskTable(wind, lua));
fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, 'utf-8');
const rows = Object.values(updated.riskTable ?? {}).reduce((n, r) => n + Object.keys(r).length, 0);
console.log(`Wind risk: ${rows} entries from ${versionName} (package ${pkg}) → data/wind/avg-wind.json`);
