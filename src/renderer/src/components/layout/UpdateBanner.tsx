import React, { useEffect, useRef, useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';
import { useSettings } from '../../stores';
import { Button } from '../ui/Button';

/**
 * Newer release banner (D-17, T11.4): asks main once at start while Settings → App "check for updates
 * on launch" is on (main asks GitHub only in the packaged app). Non-blocking: a thin info bar under the
 * top bar with the release page link and a dismiss for this session.
 */
export function UpdateBanner(): React.JSX.Element | null {
  const checkOnLaunch = useSettings((s) => s.settings?.updates?.checkOnLaunch);
  const [update, setUpdate] = useState<{ latest: string; url: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (checkOnLaunch !== true || asked.current) return;
    asked.current = true;
    void ipcClient.invoke('updates:check').then((res) => {
      if (res.ok && res.data) setUpdate(res.data);
    });
  }, [checkOnLaunch]);

  if (!update || dismissed) return null;
  return (
    <div
      data-testid="update-banner"
      role="status"
      className="flex items-center gap-3 border-b border-[#38bdf8]/30 bg-[#38bdf8]/10 px-4 py-1.5 font-mono text-xs"
    >
      <span className="text-[#38bdf8]">BAR StratCom {update.latest} is out.</span>
      <Button variant="ghost" size="sm" onClick={() => void ipcClient.invoke('shell:openExternal', { url: update.url })} data-testid="update-banner-open">
        RELEASE PAGE
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        data-testid="update-banner-dismiss"
        className="ml-auto px-1 text-[#71717a] hover:text-[#e4e4e7]"
      >
        ✕
      </button>
    </div>
  );
}
