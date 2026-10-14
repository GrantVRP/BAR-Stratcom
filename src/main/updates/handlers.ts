import { app } from 'electron';
import { handle } from '../ipc/register';
import { defaultSettingsStore } from '../settings/store';
import { isNewerVersion } from '../../core/updates/semver';
import { openExternalUrl } from '../shell/open-external';
import { fetchNewerRelease, updateCheckMode } from './version-check';

/**
 * `updates:check`: only while Settings → App "check for updates on launch" is on; the
 * renderer asks once at start and shows a banner for a newer release. `shell:openExternal` opens the
 * banner's link (allow-listed sites only).
 */
export function registerUpdateHandlers(): void {
  handle('updates:check', async () => {
    if (!defaultSettingsStore.getSettings().updates.checkOnLaunch) return null;
    const mode = updateCheckMode();
    if (mode.kind === 'off') return null;
    if (mode.kind === 'fake') return isNewerVersion(mode.info.latest, app.getVersion()) ? mode.info : null;
    return fetchNewerRelease(app.getVersion());
  });
  handle('shell:openExternal', (req) => openExternalUrl(req.url));
}
