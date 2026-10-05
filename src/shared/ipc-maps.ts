import { z } from 'zod';
import { cachedSchema } from '../core/schemas/intel';
import { MapNotesFileSchema } from '../core/schemas/maps';

/** A map file name (data/maps/notes/<fileName>.json): no path separators, no "..". */
const MapFileNameSchema = z.string().regex(/^(?!.*\.\.)[\w.\- ]{1,120}$/);

const MinimapInfoSchema = z.object({ url: z.string().url(), author: z.string().nullable() }).strict();

/** Maps view channels (T10.4); the map list itself is `maps:list`. */
export const mapsIpcContract = {
  'maps:minimap': {
    request: z.object({ scriptName: z.string().min(1).max(160) }).strict(),
    response: cachedSchema(MinimapInfoSchema.nullable())
  },
  'maps:notes': {
    request: z.object({ fileName: MapFileNameSchema }).strict(),
    response: MapNotesFileSchema.nullable()
  }
} as const;
