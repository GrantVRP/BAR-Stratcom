import * as fs from 'fs';
import * as path from 'path';
import { AvgWindFileSchema, MapNotesFileSchema, MapsFileSchema, type MapNotesFile, type MapRecord } from '../../core/schemas';
import { findDataDir } from '../registry/loader';

let cachedMaps: MapRecord[] | null = null;
let cachedMapByFileName: Map<string, MapRecord> | null = null;

export function loadMaps(customDataDir?: string): MapRecord[] {
  if (cachedMaps && !customDataDir) {
    return cachedMaps;
  }

  const dataDir = customDataDir ?? findDataDir();
  const mapsFile = path.join(dataDir, 'maps', 'maps.json');

  if (!fs.existsSync(mapsFile)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(mapsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = MapsFileSchema.parse(parsed);
    const maps = validated.maps;

    if (!customDataDir) {
      cachedMaps = maps;
      cachedMapByFileName = new Map(maps.map((m) => [m.fileName.toLowerCase(), m]));
    }
    return maps;
  } catch (err) {
    console.warn(`Failed to parse maps file at ${mapsFile}:`, err);
    return [];
  }
}

export function getMap(fileName: string, customDataDir?: string): MapRecord | null {
  const maps = loadMaps(customDataDir);
  const target = fileName.toLowerCase().trim();

  if (cachedMapByFileName && !customDataDir) {
    return cachedMapByFileName.get(target) ?? null;
  }

  return maps.find((m) => m.fileName.toLowerCase() === target) ?? null;
}

export function clearMapsCache(): void {
  cachedMaps = null;
  cachedMapByFileName = null;
}

let cachedWind: Record<string, Record<string, number>> | null | undefined;

/** The game's average wind table (data/wind/avg-wind.json, by min → max wind); null when missing. */
export function loadAvgWindTable(customDataDir?: string): Record<string, Record<string, number>> | null {
  if (cachedWind !== undefined && !customDataDir) return cachedWind;
  let table: Record<string, Record<string, number>> | null = null;
  try {
    const file = path.join(customDataDir ?? findDataDir(), 'wind', 'avg-wind.json');
    table = AvgWindFileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8'))).table;
  } catch {
    table = null;
  }
  if (!customDataDir) cachedWind = table;
  return table;
}

/** A map's file name as used in data/maps/notes/<fileName>.json: no path separators, no "..". */
export const MAP_FILE_NAME = /^(?!.*\.\.)[\w.\- ]{1,120}$/;

/** Curated notes for a map (optional); null when there are none or the file is invalid. */
export function loadMapNotes(fileName: string, customDataDir?: string): MapNotesFile | null {
  if (!MAP_FILE_NAME.test(fileName)) return null;
  const file = path.join(customDataDir ?? findDataDir(), 'maps', 'notes', `${fileName}.json`);
  try {
    return MapNotesFileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } catch {
    return null;
  }
}
