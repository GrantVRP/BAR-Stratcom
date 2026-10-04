import { describe, expect, it } from 'vitest';
import { parseCategoryPage } from './fetch-unitpics';

// Trimmed from the real /units/armada-bots markup (2026-10-04): each unit's large picture sits right
// after its /unit/<id> link; the small strategic icon that follows must be ignored.
const HTML = `
<a title="Click for more info" href="/unit/armpw" class="flex-unit-img w-inline-block"><img alt="" src="https://cdn.prod.website-files.com/5c69241780da2a1dfc6caa4e/69ca535d1247669f47c7ad38_armpw.webp" class="unit-img"/></a>
<div title="Strategic Icon" class="us-strategic-icon"><img loading="lazy" src="https://cdn.prod.website-files.com/5c69241780da2a1dfc6caa4e/6994c0a799bfd9b1bf2e71dc_armpw.webp" alt=""/></div>
<a title="Click for more info" href="/unit/armck" class="flex-unit-img w-inline-block"><img alt="" src="https://cdn.prod.website-files.com/x/abc_armck.webp" class="unit-img"/></a>
<a title="Click for more info" href="/unit/armck" class="other-link">Construction Bot</a>
<a href="/unit/armrock"><img src="https://cdn.prod.website-files.com/x/def_someotherunit.webp"/></a>
`;

describe('fetch-unitpics page parsing (T10.5)', () => {
  it('pairs each unit id with its own picture, once', () => {
    expect(parseCategoryPage(HTML)).toEqual([
      { unitId: 'armpw', url: 'https://cdn.prod.website-files.com/5c69241780da2a1dfc6caa4e/69ca535d1247669f47c7ad38_armpw.webp' },
      { unitId: 'armck', url: 'https://cdn.prod.website-files.com/x/abc_armck.webp' }
    ]);
  });
});
