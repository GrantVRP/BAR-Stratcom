import { describe, expect, it } from 'vitest';
import { compareVersions, isNewerVersion, parseVersion } from './semver';

describe('version compare for the release check', () => {
  it('parses release tags and package versions', () => {
    expect(parseVersion('v3.0.1')).toEqual({ major: 3, minor: 0, patch: 1, pre: [] });
    expect(parseVersion('3.0.0-dev.0')).toEqual({ major: 3, minor: 0, patch: 0, pre: ['dev', 0] });
    expect(parseVersion('3.0.0+build.5')?.pre).toEqual([]);
    for (const bad of ['', 'latest', '3.0', 'v3.0.x', '3.0.0-']) expect(parseVersion(bad), bad).toBeNull();
  });

  it('orders by major, minor, patch, then pre-release (a release beats its pre-releases)', () => {
    expect(isNewerVersion('v3.0.1', '3.0.0')).toBe(true);
    expect(isNewerVersion('3.1.0', '3.0.9')).toBe(true);
    expect(isNewerVersion('4.0.0', '3.9.9')).toBe(true);
    expect(isNewerVersion('3.0.0', '3.0.0-dev.0')).toBe(true);
    expect(isNewerVersion('3.0.0-rc.1', '3.0.0-dev.0')).toBe(true);
    expect(isNewerVersion('3.0.0-dev.10', '3.0.0-dev.9')).toBe(true);
    expect(isNewerVersion('3.0.0-dev.1', '3.0.0-dev')).toBe(true);
    expect(isNewerVersion('3.0.0', '3.0.0')).toBe(false);
    expect(isNewerVersion('2.9.9', '3.0.0')).toBe(false);
    expect(isNewerVersion('3.0.0-dev.0', '3.0.0')).toBe(false);
    expect(compareVersions('v3.0.0', '3.0.0')).toBe(0);
  });

  it('a tag that is not a version is never newer', () => {
    expect(compareVersions('nightly', '3.0.0')).toBeNull();
    expect(isNewerVersion('nightly', '3.0.0')).toBe(false);
  });
});
