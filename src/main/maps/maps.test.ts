import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ipcContract } from '../../shared/ipc';
import { IntelCache } from '../intel/cache';
import { fixtureFetch } from '../intel/fake';
import { loadMapNotes } from './loader';
import { MAP_LIST_URL, MinimapService, minimapIndex } from './minimap';

const fixtures = path.join(__dirname, '../intel/__fixtures__');

describe('minimaps from maps-metadata.beyondallreason.dev (T10.4)', () => {
  it('indexes the photo of each map by script name through the resize proxy, URL-encoded', () => {
    const index = minimapIndex({
      a: { springName: 'Isidis crack 1.1', author: 'Phalange', photo: [{ ref: 'maps/X/photo/abc-Isidis crack 1.0.jpg' }] },
      b: { springName: 'No Photo 1.0', photo: [] },
      c: { displayName: 'No spring name', photo: [{ ref: 'maps/Y/photo/y.png' }] }
    });
    expect(Object.keys(index)).toEqual(['isidis crack 1.1']);
    expect(index['isidis crack 1.1']).toEqual({
      url: 'https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/X/photo/abc-Isidis%20crack%201.0.jpg',
      author: 'Phalange'
    });
  });

  it('fetches the map list once a day and answers per map (null when not listed)', async () => {
    const urls: string[] = [];
    const base = fixtureFetch(fixtures);
    const service = new MinimapService(new IntelCache({ dir: null }), ((input: string | URL | Request, init?: RequestInit) => {
      urls.push(String(input));
      return base(input, init);
    }) as typeof fetch);
    const isthmus = await service.minimap('Supreme Isthmus v2.1');
    expect(isthmus.data).toMatchObject({ author: 'Nikuksis' });
    expect(isthmus.data!.url).toContain('supreme2.1mini.png');
    expect((await service.minimap('  supreme isthmus V2.1 ')).data).toEqual(isthmus.data);
    expect((await service.minimap('Not A Map 9.9')).data).toBeNull();
    expect(urls).toEqual([MAP_LIST_URL]);
  });

  it('validates the IPC requests', () => {
    expect(ipcContract['maps:minimap'].request.safeParse({ scriptName: 'Supreme Isthmus v2.1' }).success).toBe(true);
    expect(ipcContract['maps:notes'].request.safeParse({ fileName: 'supreme_isthmus_v2.1' }).success).toBe(true);
    expect(ipcContract['maps:notes'].request.safeParse({ fileName: '../../keys' }).success).toBe(false);
    expect(ipcContract['maps:notes'].request.safeParse({ fileName: 'a/b' }).success).toBe(false);
  });
});

describe('curated map notes (03 §4)', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'map-notes-'));
    fs.mkdirSync(path.join(dir, 'maps', 'notes'), { recursive: true });
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads a valid notes file and returns null for missing, invalid or unsafe names', () => {
    const notes = { schemaVersion: 1, fileName: 'test_map', notes: [{ text: 'Test note', source: { kind: 'owner', ref: 'test' }, addedAt: '2026-10-05' }] };
    fs.writeFileSync(path.join(dir, 'maps', 'notes', 'test_map.json'), JSON.stringify(notes));
    fs.writeFileSync(path.join(dir, 'maps', 'notes', 'broken.json'), '{"schemaVersion":1}');
    expect(loadMapNotes('test_map', dir)).toEqual(notes);
    expect(loadMapNotes('missing', dir)).toBeNull();
    expect(loadMapNotes('broken', dir)).toBeNull();
    expect(loadMapNotes('../maps/notes/test_map', dir)).toBeNull();
  });
});
