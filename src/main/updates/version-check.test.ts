import { describe, expect, it, vi } from 'vitest';

const openExternal = vi.fn().mockResolvedValue(undefined);
vi.mock('electron', () => ({ app: { isPackaged: false }, shell: { openExternal: (url: string) => openExternal(url) } }));

const { fetchNewerRelease, updateCheckMode, RELEASES_LATEST_URL } = await import('./version-check');
const { isAllowedExternalUrl, openExternalUrl } = await import('../shell/open-external');

type Init = { headers: Record<string, string>; signal: AbortSignal };

function githubAnswering(status: number, body: unknown) {
  const calls: Array<{ url: string; init: Init }> = [];
  const fetchImpl = async (url: string, init: Init): Promise<Response> => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { fetchImpl, calls };
}

describe('version check (D-17, T11.4)', () => {
  it('asks only GitHub\'s latest-release endpoint, sending nothing but the headers GitHub asks for', async () => {
    const gh = githubAnswering(200, { tag_name: 'v3.0.1', html_url: 'https://github.com/GrantVRP/BAR-Stratcom/releases/tag/v3.0.1', body: 'notes' });
    expect(await fetchNewerRelease('3.0.0', gh.fetchImpl)).toEqual({ latest: '3.0.1', url: 'https://github.com/GrantVRP/BAR-Stratcom/releases/tag/v3.0.1' });
    expect(gh.calls).toHaveLength(1);
    expect(gh.calls[0]!.url).toBe(RELEASES_LATEST_URL);
    expect(gh.calls[0]!.init.headers).toEqual({ Accept: 'application/vnd.github+json', 'User-Agent': 'BAR-StratCom' });
  });

  it('no banner for the same or an older version, a tag that is not a version, or a page off github.com', async () => {
    const answer = (tag: string, page = `https://github.com/GrantVRP/BAR-Stratcom/releases/tag/${tag}`) =>
      fetchNewerRelease('3.0.0', githubAnswering(200, { tag_name: tag, html_url: page }).fetchImpl);
    expect(await answer('v3.0.0')).toBeNull();
    expect(await answer('v2.9.0')).toBeNull();
    expect(await answer('nightly')).toBeNull();
    expect(await answer('v3.0.1', 'https://example.com/fake')).toBeNull();
  });

  it('no banner when GitHub has no release yet, rate-limits, answers nonsense or the network fails', async () => {
    expect(await fetchNewerRelease('3.0.0', githubAnswering(404, { message: 'Not Found' }).fetchImpl)).toBeNull();
    expect(await fetchNewerRelease('3.0.0', githubAnswering(403, { message: 'rate limit' }).fetchImpl)).toBeNull();
    expect(await fetchNewerRelease('3.0.0', githubAnswering(200, { unexpected: true }).fetchImpl)).toBeNull();
    expect(await fetchNewerRelease('3.0.0', () => Promise.reject(new Error('offline')))).toBeNull();
  });

  it('a dev build or test never goes online; STRATCOM_FAKE_UPDATE stands in for a release', () => {
    expect(updateCheckMode({})).toEqual({ kind: 'off' });
    expect(updateCheckMode({ STRATCOM_FAKE_UPDATE: 'not-a-version' })).toEqual({ kind: 'off' });
    expect(updateCheckMode({ STRATCOM_FAKE_UPDATE: '3.9.9' })).toEqual({
      kind: 'fake',
      info: { latest: '3.9.9', url: 'https://github.com/GrantVRP/BAR-Stratcom/releases/tag/v3.9.9' }
    });
  });
});

describe('shell:openExternal allow-list (02 §6)', () => {
  it('https links to the listed sites and their subdomains only', () => {
    for (const ok of ['https://github.com/GrantVRP/BAR-Stratcom/releases', 'https://www.beyondallreason.info/', 'https://api.bar-rts.com/x', 'https://ollama.com'])
      expect(isAllowedExternalUrl(ok), ok).toBe(true);
    for (const bad of [
      'http://github.com/',
      'https://github.com.evil.com/',
      'https://evilgithub.com/',
      'https://user:pw@github.com/',
      'file:///C:/Windows/system32/calc.exe',
      'javascript:alert(1)',
      'not a url'
    ])
      expect(isAllowedExternalUrl(bad), bad).toBe(false);
  });

  it('opens an allowed link and refuses anything else without calling the shell', async () => {
    openExternal.mockClear();
    await expect(openExternalUrl('https://github.com/GrantVRP/BAR-Stratcom/releases')).resolves.toEqual({ ok: true });
    await expect(openExternalUrl('https://example.com/')).rejects.toThrow('not on the list');
    expect(openExternal).toHaveBeenCalledTimes(1);
  });
});
