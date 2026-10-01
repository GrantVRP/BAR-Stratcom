import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { BuildPlanSchema, type BuildPlan } from '../schemas/plans';
import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { crc32Hex } from './crc32';
import type { ShareDecodeResult } from './types';

const PREFIX = 'BSC1';
const MAX_SHARE_CODE_LENGTH = 4000;

/**
 * Encodes a BuildPlan into a StratCom share code string.
 * Format: BSC1.<base64url(deflateRaw(utf8(json)))>.<crc32Hex(8)>
 */
export function encodePlan(plan: BuildPlan): string {
  const json = JSON.stringify(plan);
  const utf8Bytes = strToU8(json);
  const compressed = deflateSync(utf8Bytes);
  const payloadB64 = bytesToBase64Url(compressed);
  const crc = crc32Hex(compressed);
  return `${PREFIX}.${payloadB64}.${crc}`;
}

/**
 * Decodes and validates a StratCom share code string into a BuildPlan.
 * Returns typed errors: E_PREFIX, E_CRC, E_INFLATE, E_SCHEMA, E_TOO_LONG.
 */
export function decodePlan(code: string): ShareDecodeResult {
  if (code.length > MAX_SHARE_CODE_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'E_TOO_LONG',
        message: `Share code exceeds ${MAX_SHARE_CODE_LENGTH} characters (${code.length})`
      }
    };
  }

  const trimmed = code.trim();
  if (!trimmed.startsWith(`${PREFIX}.`)) {
    return {
      ok: false,
      error: {
        code: 'E_PREFIX',
        message: `Share code must start with "${PREFIX}."`
      }
    };
  }

  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX || !parts[1] || !parts[2]) {
    return {
      ok: false,
      error: {
        code: 'E_PREFIX',
        message: `Share code format invalid; expected "${PREFIX}.<payload>.<crc32>"`
      }
    };
  }

  const payloadB64 = parts[1];
  const crcHex = parts[2];

  if (crcHex.length !== 8) {
    return {
      ok: false,
      error: {
        code: 'E_CRC',
        message: `Share code CRC must be 8 hex characters, received ${crcHex.length}`
      }
    };
  }

  const compressed = base64UrlToBytes(payloadB64);
  if (!compressed) {
    return {
      ok: false,
      error: {
        code: 'E_INFLATE',
        message: 'Failed to decode base64url payload'
      }
    };
  }

  const computedCrc = crc32Hex(compressed);
  if (computedCrc.toLowerCase() !== crcHex.toLowerCase()) {
    return {
      ok: false,
      error: {
        code: 'E_CRC',
        message: `CRC mismatch (expected ${crcHex}, computed ${computedCrc})`
      }
    };
  }

  let uncompressed: Uint8Array;
  try {
    uncompressed = inflateSync(compressed);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'E_INFLATE',
        message: `Decompression failed: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }

  let json: unknown;
  try {
    const text = strFromU8(uncompressed);
    json = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'E_INFLATE',
        message: `Failed to parse decompressed JSON: ${err instanceof Error ? err.message : String(err)}`
      }
    };
  }

  const parsed = BuildPlanSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'E_SCHEMA',
        message: `BuildPlan schema validation failed: ${parsed.error.message}`
      }
    };
  }

  return {
    ok: true,
    value: parsed.data,
    plan: parsed.data
  };
}
