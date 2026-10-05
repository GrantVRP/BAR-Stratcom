import { z } from 'zod';
import type { Cached } from '../../core/schemas/intel';
import { getJson, type FetchFn } from '../intel/client';
import type { IntelCache } from '../intel/cache';

/** BAR's map metadata service (T10.4); the renderer loads the images from it (CSP img-src). */
export const MAPS_METADATA = 'https://maps-metadata.beyondallreason.dev';
export const MAP_LIST_URL = `${MAPS_METADATA}/latest/map_list.validated.json`;
/** The service's resize proxy in front of the map photos, as BAR's site uses it. */
const MINIMAP_PROXY = `${MAPS_METADATA}/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/`;
const DAY_MS = 24 * 60 * 60_000;

// only the fields we use; the list is keyed by an internal id
const MapListSchema = z.record(
  z.string(),
  z.object({
    springName: z.string().optional(),
    displayName: z.string().optional(),
    author: z.string().nullish(),
    photo: z.array(z.object({ ref: z.string() })).optional()
  })
);

export interface MinimapInfo {
  url: string;
  author: string | null;
}

type MinimapIndex = Record<string, MinimapInfo>;

const key = (scriptName: string): string => scriptName.trim().toLowerCase();

/** Script name → minimap URL and author (the map's own photo, e.g. `maps/<id>/photo/<file>`). */
export function minimapIndex(list: z.infer<typeof MapListSchema>): MinimapIndex {
  const index: MinimapIndex = {};
  for (const entry of Object.values(list)) {
    const ref = entry.photo?.[0]?.ref;
    if (!entry.springName || !ref) continue;
    index[key(entry.springName)] = { url: MINIMAP_PROXY + encodeURI(ref), author: entry.author ?? null };
  }
  return index;
}

/** Fetched by main (the renderer has no network), cached a day in memory and in userData/cache. */
export class MinimapService {
  constructor(
    private readonly cache: IntelCache,
    private readonly fetchFn: FetchFn = globalThis.fetch
  ) {}

  async minimap(scriptName: string): Promise<Cached<MinimapInfo | null>> {
    const index = await this.cache.get('map-photos', DAY_MS, async () => minimapIndex(await getJson(this.fetchFn, MAP_LIST_URL, MapListSchema)));
    return { ...index, data: index.data[key(scriptName)] ?? null };
  }
}
