import { describe, expect, it } from 'vitest';
import { UNIT_ART_CREDIT, unitSpriteCount, unitSpriteUrl } from './unit-sprites';

describe('32-bit unit sprites (T10.5)', () => {
  it('bundles a sprite for every scraped Armada and Cortex unit', () => {
    expect(unitSpriteCount()).toBe(377);
  });

  it('picks the 32 px art for small icons and the 64 px art above that', () => {
    expect(unitSpriteUrl('armpw', 22)).toMatchObject({ nativeSize: 32 });
    expect(unitSpriteUrl('ARMPW', 48)).toMatchObject({ nativeSize: 64 });
    expect(unitSpriteUrl('corpyro', 128)?.url).toMatch(/corpyro.*\.png/);
    expect(unitSpriteUrl('armcomlvl2', 64)).toBeNull();
  });

  it('credits the original artists', () => {
    expect(UNIT_ART_CREDIT).toContain('IceXuick and Floris');
  });
});
