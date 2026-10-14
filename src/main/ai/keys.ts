import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';
import { z } from 'zod';
import { AI_PROVIDER_IDS, AiError, type ProviderId } from './types';

/** The part of Electron's safeStorage we use (injected in tests). */
export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

// partialRecord: a file holds keys for only some providers
const KeysFileSchema = z.partialRecord(z.enum(AI_PROVIDER_IDS), z.string());

/**
 * API keys: encrypted with the OS key store (safeStorage, DPAPI on Windows) and kept as
 * base64 in userData/keys.json. Keys are only decrypted inside main/ai, never logged or sent to the
 * renderer (it only learns whether a key exists).
 */
export class KeyStore {
  constructor(
    private readonly dir: () => string,
    private readonly storage: SafeStorageLike
  ) {}

  private file(): string {
    return path.join(this.dir(), 'keys.json');
  }

  private read(): Partial<Record<ProviderId, string>> {
    try {
      const parsed = KeysFileSchema.safeParse(JSON.parse(fs.readFileSync(this.file(), 'utf-8')));
      return parsed.success ? parsed.data : {};
    } catch {
      return {};
    }
  }

  private write(data: Partial<Record<ProviderId, string>>): void {
    fs.mkdirSync(this.dir(), { recursive: true });
    const tmp = `${this.file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tmp, this.file());
  }

  /** Stores a key; refuses when the OS cannot encrypt it (the UI explains why). */
  setKey(provider: ProviderId, key: string): void {
    const trimmed = key.trim();
    if (trimmed.length < 8 || trimmed.length > 500 || /\s/.test(trimmed)) throw new Error('That does not look like an API key');
    if (!this.storage.isEncryptionAvailable()) throw new AiError('NO_ENCRYPTION');
    const data = this.read();
    data[provider] = this.storage.encryptString(trimmed).toString('base64');
    this.write(data);
  }

  hasKey(provider: ProviderId): boolean {
    return typeof this.read()[provider] === 'string';
  }

  clearKey(provider: ProviderId): void {
    const data = this.read();
    if (!(provider in data)) return;
    delete data[provider];
    this.write(data);
  }

  /** Main process only. Null when there is no key or it cannot be decrypted (e.g. another Windows user). */
  getKey(provider: ProviderId): string | null {
    const stored = this.read()[provider];
    if (!stored) return null;
    try {
      return this.storage.decryptString(Buffer.from(stored, 'base64'));
    } catch {
      return null;
    }
  }
}

export const defaultKeyStore = new KeyStore(() => app.getPath('userData'), safeStorage);
