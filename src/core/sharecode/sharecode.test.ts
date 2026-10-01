import { deflateSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '../schemas/plans';
import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { decodePlan, encodePlan } from './codec';
import { crc32, crc32Hex } from './crc32';

describe('CRC32', () => {
  it('computes standard IEEE 802.3 test vector', () => {
    const testVector = strToU8('123456789');
    expect(crc32(testVector)).toBe(0xcbf43926);
    expect(crc32Hex(testVector)).toBe('cbf43926');
  });

  it('handles empty input', () => {
    const empty = new Uint8Array(0);
    expect(crc32(empty)).toBe(0);
    expect(crc32Hex(empty)).toBe('00000000');
  });

  it('pads single-digit hex correctly', () => {
    // Check that padStart(8, '0') produces 8 characters
    const hex = crc32Hex(new Uint8Array([0]));
    expect(hex).toHaveLength(8);
  });
});

describe('Base64URL', () => {
  it('round-trips arbitrary byte sequences', () => {
    for (let len = 0; len <= 32; len++) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = (i * 31 + 7) & 0xff;
      }
      const encoded = bytesToBase64Url(bytes);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
      const decoded = base64UrlToBytes(encoded);
      expect(decoded).toEqual(bytes);
    }
  });

  it('rejects invalid lengths where remainder modulo 4 is 1', () => {
    expect(base64UrlToBytes('A')).toBeNull();
    expect(base64UrlToBytes('ABCDE')).toBeNull();
  });

  it('rejects characters outside base64url alphabet', () => {
    expect(base64UrlToBytes('AB+D')).toBeNull();
    expect(base64UrlToBytes('AB/D')).toBeNull();
    expect(base64UrlToBytes('AB=D')).toBeNull();
    expect(base64UrlToBytes('AB!D')).toBeNull();
    expect(base64UrlToBytes('AB\u00FFD')).toBeNull();
    expect(base64UrlToBytes('A+')).toBeNull();
    expect(base64UrlToBytes('AB+')).toBeNull();
  });
});

describe('Plan Share Codes', () => {
  const planArmada: BuildPlan = {
    schemaVersion: 1,
    id: 'arm-1v1-rush',
    title: 'Armada Rocketeer Rush',
    description: 'Fast aggression with bots and rocketeers',
    factionId: 'armada',
    gameVersion: '105.1.1-2550',
    modes: ['1v1'],
    role: 'front',
    skill: 'beginner',
    opening: 'bot',
    energyStyle: 'solar',
    mapFit: { windMin: 0, windMax: 10 },
    source: {
      kind: 'curated',
      replayId: 'rep101',
      player: 'CommanderGrant',
      playerRating: 32.5,
      map: 'supreme_isthmus_v2.1',
      playedAt: '2026-09-01T12:00:00Z',
      gameVersion: '105.1.1-2550',
      reviewedBy: 'Owner',
      reviewedAt: '2026-09-02T12:00:00Z'
    },
    steps: [
      {
        id: 'step-1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armsolar',
        count: 1,
        targetTime: 0
      },
      {
        id: 'step-2',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armmex',
        count: 2,
        targetTime: 20
      },
      {
        id: 'step-3',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armlab',
        count: 1,
        targetTime: 65
      },
      {
        id: 'step-4',
        actor: { kind: 'factory', unitId: 'armlab', index: 1 },
        action: 'build',
        unitId: 'armpw',
        count: 3,
        targetTime: 110
      },
      {
        id: 'step-5',
        actor: { kind: 'commander' },
        action: 'reclaim',
        count: 1,
        reclaim: { metal: 80, energy: 0, durationSec: 4 }
      }
    ],
    notes: 'Keep energy positive when building factory',
    tags: ['rush', 'beginner']
  };

  const planCortex: BuildPlan = {
    schemaVersion: 1,
    id: 'cor-eco-veh',
    title: 'Cortex Heavy Tank Eco',
    description: 'Vehicle expansion into heavy armor',
    factionId: 'cortex',
    gameVersion: '105.1.1-2550',
    modes: ['1v1', 'small-team'],
    role: 'eco',
    skill: 'intermediate',
    opening: 'vehicle',
    energyStyle: 'wind',
    source: {
      kind: 'manual',
      createdAt: '2026-09-20T10:00:00Z'
    },
    steps: [
      {
        id: 'step-1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'corwin',
        count: 3,
        targetTime: 0
      },
      {
        id: 'step-2',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'corvp',
        count: 1,
        targetTime: 50
      },
      {
        id: 'step-3',
        actor: { kind: 'builder', unitId: 'corcv', index: 1 },
        action: 'build',
        unitId: 'cormakr',
        count: 2,
        targetTime: 120
      }
    ]
  };

  const planAirDefense: BuildPlan = {
    schemaVersion: 1,
    id: 'team-air-def',
    title: 'Large Team Air Superiority',
    factionId: 'armada',
    gameVersion: '105.1.1-2550',
    modes: ['large-team'],
    role: 'air',
    skill: 'advanced',
    opening: 'air',
    energyStyle: 'mixed',
    source: {
      kind: 'replay-capture',
      sessionId: 'session-xyz',
      replayId: 'rep202',
      player: 'AirMarshal',
      map: 'comets_catcher_redux_v4',
      capturedAt: '2026-09-25T14:30:00Z'
    },
    steps: [
      {
        id: 'step-1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armap',
        count: 1,
        targetTime: 45
      },
      {
        id: 'step-2',
        actor: { kind: 'factory', unitId: 'armap', index: 1 },
        action: 'build',
        unitId: 'armfig',
        count: 6,
        targetTime: 100
      },
      {
        id: 'step-3',
        actor: { kind: 'commander' },
        action: 'assist',
        count: 1,
        assistStepId: 'step-2'
      },
      {
        id: 'step-4',
        actor: { kind: 'commander' },
        action: 'note',
        count: 1,
        text: 'Scout western canyon'
      }
    ]
  };

  it('round-trips 3 distinct sample plans correctly', () => {
    for (const plan of [planArmada, planCortex, planAirDefense]) {
      const code = encodePlan(plan);
      expect(code.startsWith('BSC1.')).toBe(true);
      const decoded = decodePlan(code);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.value).toEqual(plan);
        expect(decoded.plan).toEqual(plan);
      }
    }
  });

  it('handles leading and trailing whitespace gracefully in decodePlan', () => {
    const code = encodePlan(planArmada);
    const decoded = decodePlan(`  \n${code}\n  `);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value).toEqual(planArmada);
    }
  });

  it('rejects oversized codes with E_TOO_LONG (> 4000 characters)', () => {
    const hugeCode = `BSC1.${'A'.repeat(4000)}.12345678`;
    const result = decodePlan(hugeCode);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_TOO_LONG');
    }
  });

  it('rejects invalid prefix with E_PREFIX', () => {
    const validCode = encodePlan(planArmada);
    const wrongPrefix = validCode.replace(/^BSC1\./, 'BSC2.');
    const resultWrongPrefix = decodePlan(wrongPrefix);
    expect(resultWrongPrefix.ok).toBe(false);
    if (!resultWrongPrefix.ok) {
      expect(resultWrongPrefix.error.code).toBe('E_PREFIX');
    }

    const notBSC = `ABC1.${validCode.split('.').slice(1).join('.')}`;
    const resultNotBSC = decodePlan(notBSC);
    expect(resultNotBSC.ok).toBe(false);
    if (!resultNotBSC.ok) {
      expect(resultNotBSC.error.code).toBe('E_PREFIX');
    }

    const malformedParts = 'BSC1.onlyonepart';
    const resultMalformed = decodePlan(malformedParts);
    expect(resultMalformed.ok).toBe(false);
    if (!resultMalformed.ok) {
      expect(resultMalformed.error.code).toBe('E_PREFIX');
    }
  });

  it('rejects flipped character with E_CRC', () => {
    const validCode = encodePlan(planArmada);
    const parts = validCode.split('.');
    const payload = parts[1]!;
    // Flip a character in the payload to another valid base64url char
    const flippedChar = payload[10] === 'A' ? 'B' : 'A';
    const corruptedPayload = payload.slice(0, 10) + flippedChar + payload.slice(11);
    const corruptedCode = `${parts[0]}.${corruptedPayload}.${parts[2]}`;

    const result = decodePlan(corruptedCode);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_CRC');
    }
  });

  it('rejects wrong CRC hex length or mismatch with E_CRC', () => {
    const validCode = encodePlan(planArmada);
    const parts = validCode.split('.');
    const wrongCrcCode = `${parts[0]}.${parts[1]}.00000000`;
    const result = decodePlan(wrongCrcCode);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_CRC');
    }

    const shortCrcCode = `${parts[0]}.${parts[1]}.1234`;
    const resultShort = decodePlan(shortCrcCode);
    expect(resultShort.ok).toBe(false);
    if (!resultShort.ok) {
      expect(resultShort.error.code).toBe('E_CRC');
    }
  });

  it('rejects invalid base64 characters in payload with E_INFLATE', () => {
    const code = 'BSC1.invalid!payload.12345678';
    const result = decodePlan(code);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_INFLATE');
    }
  });

  it('rejects un-inflatable corrupted bytes with E_INFLATE', () => {
    // Generate corrupted bytes that pass CRC check but fail DEFLATE decompression
    const invalidBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const b64 = bytesToBase64Url(invalidBytes);
    const crc = crc32Hex(invalidBytes);
    const code = `BSC1.${b64}.${crc}`;

    const result = decodePlan(code);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_INFLATE');
    }
  });

  it('rejects valid deflate of non-JSON string with E_INFLATE', () => {
    const rawText = strToU8('{ not valid json }');
    const compressed = deflateSync(rawText);
    const b64 = bytesToBase64Url(compressed);
    const crc = crc32Hex(compressed);
    const code = `BSC1.${b64}.${crc}`;

    const result = decodePlan(code);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_INFLATE');
    }
  });

  it('rejects valid compression of non-plan object with E_SCHEMA', () => {
    const notAPlan = { message: 'hello world', notAField: 42 };
    const raw = strToU8(JSON.stringify(notAPlan));
    const compressed = deflateSync(raw);
    const b64 = bytesToBase64Url(compressed);
    const crc = crc32Hex(compressed);
    const code = `BSC1.${b64}.${crc}`;

    const result = decodePlan(code);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_SCHEMA');
    }
  });

  it('rejects plan missing mandatory fields with E_SCHEMA', () => {
    const invalidPlan = { ...planArmada, steps: [] }; // steps must have min 1
    const raw = strToU8(JSON.stringify(invalidPlan));
    const compressed = deflateSync(raw);
    const b64 = bytesToBase64Url(compressed);
    const crc = crc32Hex(compressed);
    const code = `BSC1.${b64}.${crc}`;

    const result = decodePlan(code);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('E_SCHEMA');
    }
  });
});
