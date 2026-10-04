import fs from 'node:fs';
import path from 'node:path';
import type { Cached } from '../../core/schemas/intel';

interface Entry {
  fetchedAt: number;
  data: unknown;
}

export interface IntelCacheOptions {
  /** `userData/cache`; null keeps the cache in memory only. */
  dir: string | null;
  now?: () => number;
}

/**
 * Memory + disk cache with per-call TTLs. A fresh entry is returned as is; an expired one is
 * refreshed; when the refresh fails, the old entry is returned marked `stale` (offline fallback).
 */
export class IntelCache {
  private readonly memory = new Map<string, Entry>();
  private readonly inflight = new Map<string, Promise<Cached<unknown>>>();
  private readonly dir: string | null;
  private readonly now: () => number;

  constructor(options: IntelCacheOptions) {
    this.dir = options.dir;
    this.now = options.now ?? Date.now;
  }

  async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<Cached<T>> {
    const entry = this.read(key);
    if (entry && this.now() - entry.fetchedAt < ttlMs) {
      return { data: entry.data as T, fetchedAt: new Date(entry.fetchedAt).toISOString(), stale: false };
    }
    const running = this.inflight.get(key);
    if (running) return running as Promise<Cached<T>>;

    const refresh = (async (): Promise<Cached<T>> => {
      try {
        const data = await load();
        const fresh = { fetchedAt: this.now(), data };
        this.write(key, fresh);
        return { data, fetchedAt: new Date(fresh.fetchedAt).toISOString(), stale: false };
      } catch (err) {
        if (!entry) throw err;
        return { data: entry.data as T, fetchedAt: new Date(entry.fetchedAt).toISOString(), stale: true };
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, refresh);
    return refresh;
  }

  private file(key: string): string | null {
    return this.dir ? path.join(this.dir, `intel-${key.replace(/[^a-z0-9-]+/gi, '_')}.json`) : null;
  }

  private read(key: string): Entry | null {
    const inMemory = this.memory.get(key);
    if (inMemory) return inMemory;
    const file = this.file(key);
    if (!file || !fs.existsSync(file)) return null;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Entry;
      if (typeof parsed.fetchedAt !== 'number') return null;
      this.memory.set(key, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private write(key: string, entry: Entry): void {
    this.memory.set(key, entry);
    const file = this.file(key);
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(entry), 'utf8');
      fs.renameSync(`${file}.tmp`, file);
    } catch {
      // The memory copy still serves this session
    }
  }
}
