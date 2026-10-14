import { app } from 'electron';
import { z } from 'zod';
import { isNewerVersion, parseVersion } from '../../core/updates/semver';
import { isAllowedExternalUrl } from '../shell/open-external';

/** The only request the version check makes (GitHub's "latest release": no drafts, no pre-releases). */
export const RELEASES_LATEST_URL = 'https://api.github.com/repos/GrantVRP/BAR-Stratcom/releases/latest';
export const RELEASES_PAGE = 'https://github.com/GrantVRP/BAR-Stratcom/releases';

export interface UpdateInfo {
  latest: string;
  url: string;
}

/** The fields we read from GitHub's release object (it has many more). */
const ReleaseSchema = z.object({ tag_name: z.string(), html_url: z.string() });

type FetchLike = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<Response>;

/**
 * Asks GitHub for the latest release and answers it only when it is newer than `current` and its page
 * is a github.com link; any failure (offline, rate limit, no release yet) answers null — no banner.
 */
export async function fetchNewerRelease(current: string, fetchImpl: FetchLike = fetch): Promise<UpdateInfo | null> {
  try {
    const res = await fetchImpl(RELEASES_LATEST_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'BAR-StratCom' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const release = ReleaseSchema.safeParse(await res.json());
    if (!release.success) return null;
    const latest = release.data.tag_name.replace(/^v/, '');
    if (!isNewerVersion(latest, current) || !isAllowedExternalUrl(release.data.html_url)) return null;
    return { latest, url: release.data.html_url };
  } catch {
    return null;
  }
}

/**
 * Where the check runs: a packaged app asks GitHub; a dev build or test never goes online, except that
 * STRATCOM_FAKE_UPDATE=<version> (non-packaged only, e2e) answers that version as the latest release.
 */
export function updateCheckMode(env: NodeJS.ProcessEnv = process.env): { kind: 'github' } | { kind: 'fake'; info: UpdateInfo } | { kind: 'off' } {
  let packaged = true;
  try {
    packaged = app.isPackaged;
  } catch {
    // outside Electron: treat as packaged
  }
  if (packaged) return { kind: 'github' };
  const fake = env.STRATCOM_FAKE_UPDATE;
  if (fake && parseVersion(fake)) return { kind: 'fake', info: { latest: fake.replace(/^v/, ''), url: `${RELEASES_PAGE}/tag/v${fake.replace(/^v/, '')}` } };
  return { kind: 'off' };
}
