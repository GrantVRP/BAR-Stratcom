/** A release version: major.minor.patch, an optional pre-release (3.0.0-dev.0); a leading "v" is allowed. */
export interface Version {
  major: number;
  minor: number;
  patch: number;
  pre: Array<string | number>;
}

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseVersion(text: string): Version | null {
  const m = VERSION_RE.exec(text.trim());
  if (!m) return null;
  const pre = m[4] ? m[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : [];
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre };
}

function comparePre(a: Version['pre'], b: Version['pre']): number {
  // a release ranks above its pre-releases (3.0.0 > 3.0.0-dev.0)
  if (a.length === 0 || b.length === 0) return b.length - a.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    if (typeof x === 'number') return -1; // numeric identifiers rank below alphanumeric ones
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** Semantic-version order: > 0 when `a` is newer, < 0 when older, 0 when equal; null if either is not a version. */
export function compareVersions(a: string, b: string): number | null {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return null;
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch || comparePre(x.pre, y.pre);
}

export function isNewerVersion(latest: string, current: string): boolean {
  return (compareVersions(latest, current) ?? 0) > 0;
}
