import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KeyStore, type SafeStorageLike } from './keys';
import { AiError } from './types';

// A stand-in for Electron's safeStorage: reversible, and never stores the text as is.
function fakeStorage(available = true): SafeStorageLike {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from(`enc:${[...s].reverse().join('')}`, 'utf-8'),
    decryptString: (b) => {
      const s = b.toString('utf-8');
      if (!s.startsWith('enc:')) throw new Error('cannot decrypt');
      return [...s.slice(4)].reverse().join('');
    }
  };
}

describe('API key store (T08.6, 02 §6)', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-keys-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('round-trips a key, encrypted on disk, per provider', () => {
    const store = new KeyStore(() => dir, fakeStorage());
    store.setKey('anthropic', '  sk-ant-test-123456  ');
    expect(store.hasKey('anthropic')).toBe(true);
    expect(store.hasKey('gemini')).toBe(false);
    expect(store.getKey('anthropic')).toBe('sk-ant-test-123456');
    const onDisk = fs.readFileSync(path.join(dir, 'keys.json'), 'utf-8');
    expect(onDisk).not.toContain('sk-ant-test-123456');
    expect(JSON.parse(onDisk)).toHaveProperty('anthropic');
  });

  it('refuses to store a key when the OS cannot encrypt it', () => {
    const store = new KeyStore(() => dir, fakeStorage(false));
    expect(() => store.setKey('openai', 'sk-test-abcdefgh')).toThrow(AiError);
    expect(() => store.setKey('openai', 'sk-test-abcdefgh')).toThrow('Secure key storage is not available');
    expect(store.hasKey('openai')).toBe(false);
  });

  it('rejects text that is not a key', () => {
    const store = new KeyStore(() => dir, fakeStorage());
    expect(() => store.setKey('openai', 'short')).toThrow('does not look like an API key');
    expect(() => store.setKey('openai', 'has a space in it')).toThrow('does not look like an API key');
  });

  it('clears keys, and reads a key it cannot decrypt (or a broken file) as missing', () => {
    const store = new KeyStore(() => dir, fakeStorage());
    store.setKey('gemini', 'AIza-test-key-1234');
    store.clearKey('gemini');
    expect(store.hasKey('gemini')).toBe(false);
    store.clearKey('gemini');

    fs.writeFileSync(path.join(dir, 'keys.json'), JSON.stringify({ openai: Buffer.from('plain').toString('base64') }));
    expect(store.getKey('openai')).toBeNull();
    fs.writeFileSync(path.join(dir, 'keys.json'), '{ not json');
    expect(store.hasKey('openai')).toBe(false);
  });
});
