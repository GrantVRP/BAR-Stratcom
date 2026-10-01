// Pure Base64URL (RFC 4648 §5) implementation without Node.js Buffer or DOM APIs
const B64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const B64URL_MAP = new Int8Array(128).fill(-1);
for (let i = 0; i < B64URL_CHARS.length; i++) {
  B64URL_MAP[B64URL_CHARS.charCodeAt(i)] = i;
}

/**
 * Encodes a Uint8Array into an unpadded URL-safe base64 string.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    const b2 = bytes[i + 2]!;
    result +=
      B64URL_CHARS[b0 >>> 2]! +
      B64URL_CHARS[((b0 & 3) << 4) | (b1 >>> 4)]! +
      B64URL_CHARS[((b1 & 15) << 2) | (b2 >>> 6)]! +
      B64URL_CHARS[b2 & 63]!;
  }

  const rem = len - i;
  if (rem === 1) {
    const b0 = bytes[i]!;
    result += B64URL_CHARS[b0 >>> 2]! + B64URL_CHARS[(b0 & 3) << 4]!;
  } else if (rem === 2) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1]!;
    result +=
      B64URL_CHARS[b0 >>> 2]! + B64URL_CHARS[((b0 & 3) << 4) | (b1 >>> 4)]! + B64URL_CHARS[(b1 & 15) << 2]!;
  }

  return result;
}

/**
 * Decodes an unpadded URL-safe base64 string into a Uint8Array.
 * Returns null if the input has invalid length or non-base64url characters.
 */
export function base64UrlToBytes(str: string): Uint8Array | null {
  if (str.length % 4 === 1) {
    return null;
  }

  const rem = str.length % 4;
  const fullBlocks = Math.floor(str.length / 4);
  const totalBytes = fullBlocks * 3 + (rem === 2 ? 1 : rem === 3 ? 2 : 0);
  const out = new Uint8Array(totalBytes);

  let outIdx = 0;
  let i = 0;

  for (; i + 3 < str.length; i += 4) {
    const c0 = str.charCodeAt(i);
    const c1 = str.charCodeAt(i + 1);
    const c2 = str.charCodeAt(i + 2);
    const c3 = str.charCodeAt(i + 3);
    if (c0 >= 128 || c1 >= 128 || c2 >= 128 || c3 >= 128) {
      return null;
    }

    const v0 = B64URL_MAP[c0]!;
    const v1 = B64URL_MAP[c1]!;
    const v2 = B64URL_MAP[c2]!;
    const v3 = B64URL_MAP[c3]!;
    if (v0 === -1 || v1 === -1 || v2 === -1 || v3 === -1) {
      return null;
    }

    out[outIdx++] = (v0 << 2) | (v1 >>> 4);
    out[outIdx++] = ((v1 & 15) << 4) | (v2 >>> 2);
    out[outIdx++] = ((v2 & 3) << 6) | v3;
  }

  if (rem === 2) {
    const c0 = str.charCodeAt(i);
    const c1 = str.charCodeAt(i + 1);
    if (c0 >= 128 || c1 >= 128) {
      return null;
    }

    const v0 = B64URL_MAP[c0]!;
    const v1 = B64URL_MAP[c1]!;
    if (v0 === -1 || v1 === -1) {
      return null;
    }

    out[outIdx++] = (v0 << 2) | (v1 >>> 4);
  } else if (rem === 3) {
    const c0 = str.charCodeAt(i);
    const c1 = str.charCodeAt(i + 1);
    const c2 = str.charCodeAt(i + 2);
    if (c0 >= 128 || c1 >= 128 || c2 >= 128) {
      return null;
    }

    const v0 = B64URL_MAP[c0]!;
    const v1 = B64URL_MAP[c1]!;
    const v2 = B64URL_MAP[c2]!;
    if (v0 === -1 || v1 === -1 || v2 === -1) {
      return null;
    }

    out[outIdx++] = (v0 << 2) | (v1 >>> 4);
    out[outIdx++] = ((v1 & 15) << 4) | (v2 >>> 2);
  }

  return out;
}
