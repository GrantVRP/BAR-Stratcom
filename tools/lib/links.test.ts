import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkRelativeLinks, extractLinks, headingIds, markdownFiles, slugify } from './links';

describe('markdown link check (T11.5)', () => {
  it('finds links, images, references and autolinks, but not code', () => {
    const md = [
      'See [the guide](docs/user-guide.md#first-run) and ![shot](docs/images/home.png "Home").',
      '`[not](a-link.md)` and <https://github.com/GrantVRP/BAR-Stratcom>',
      '```md',
      '[inside](fence.md)',
      '```',
      '[ref]: ./privacy.md'
    ].join('\n');
    expect(extractLinks(md)).toEqual([
      { target: 'docs/user-guide.md#first-run', line: 1 },
      { target: 'docs/images/home.png', line: 1 },
      { target: 'https://github.com/GrantVRP/BAR-Stratcom', line: 2 },
      { target: './privacy.md', line: 6 }
    ]);
  });

  it("makes GitHub's heading ids", () => {
    expect(slugify('Troubleshooting by health state')).toBe('troubleshooting-by-health-state');
    expect(slugify('`WIDGETS DISABLED` — the lobby blocks widgets')).toBe('widgets-disabled--the-lobby-blocks-widgets');
    expect(slugify('AI drafting (bring your own key)')).toBe('ai-drafting-bring-your-own-key');
    expect([...headingIds('# Setup\n## Setup\n```\n# not a heading\n```\n<a id="custom"></a>')]).toEqual(['setup', 'setup-1', 'custom']);
  });

  describe('on files', () => {
    let root: string;
    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'links-'));
      fs.mkdirSync(path.join(root, 'docs'));
      fs.writeFileSync(path.join(root, 'docs', 'guide.md'), '# Guide\n## First run\nBack to [the readme](../README.md#top-heading).\n[Here](#first-run)');
      fs.writeFileSync(
        path.join(root, 'README.md'),
        '# Top heading\n[ok](docs/guide.md#first-run) [no file](docs/missing.md) [no heading](docs/guide.md#second-run) [out](../elsewhere.md) [web](https://example.org)'
      );
    });
    afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

    it('reports a missing file, a missing heading and a link out of the repository; external links are not checked', () => {
      const files = markdownFiles(root, ['README.md', 'docs']);
      expect(files).toEqual(['README.md', 'docs/guide.md']);
      expect(checkRelativeLinks(root, files)).toEqual([
        { file: 'README.md', line: 2, target: 'docs/missing.md', reason: 'no such file' },
        { file: 'README.md', line: 2, target: 'docs/guide.md#second-run', reason: 'no heading #second-run' },
        { file: 'README.md', line: 2, target: '../elsewhere.md', reason: 'points outside the repository' }
      ]);
    });
  });
});
