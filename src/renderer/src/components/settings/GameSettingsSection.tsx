import React, { useEffect, useState } from 'react';
import { useLive, useSettings } from '../../stores';
import { Button } from '../ui/Button';
import { ipcClient } from '../../lib/ipc-client';
import type { WidgetStatus } from '../../../../shared/ipc';

export function GameSettingsSection(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const { health } = useLive();
  const [widgetStatus, setWidgetStatus] = useState<WidgetStatus | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const loadWidgetStatus = async (): Promise<void> => {
    const res = await ipcClient.invoke('game:widgetStatus');
    if (res.ok) {
      setWidgetStatus(res.data);
    }
  };

  useEffect(() => {
    let active = true;
    ipcClient.invoke('game:widgetStatus').then((res) => {
      if (!active || !res.ok) return;
      setWidgetStatus(res.data);
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleDetect = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await ipcClient.invoke('game:locate');
      if (res.ok && res.data) {
        await updateSettings({
          bar: {
            dataDir: res.data.dataDir,
            source: res.data.source
          }
        });
        setMessage(`BAR located at: ${res.data.dataDir} (${res.data.source})`);
        await loadWidgetStatus();
      } else {
        setMessage('Could not auto-detect Beyond All Reason directory. Use Browse.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBrowse = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const browseRes = await ipcClient.invoke('game:browse');
      if (browseRes.ok && browseRes.data) {
        const manualPath = browseRes.data;
        const locateRes = await ipcClient.invoke('game:locate', { manualPath });
        if (locateRes.ok && locateRes.data) {
          await updateSettings({
            bar: {
              dataDir: locateRes.data.dataDir,
              source: locateRes.data.source
            }
          });
          setMessage(`Directory set: ${locateRes.data.dataDir}`);
          await loadWidgetStatus();
        } else {
          setMessage('Selected folder does not appear to be a valid BAR data folder.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleInstallWidget = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await ipcClient.invoke('game:installWidget');
      if (res.ok) {
        setMessage(res.data.message);
        await loadWidgetStatus();
      } else {
        setMessage(res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUninstallWidget = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await ipcClient.invoke('game:uninstallWidget');
      if (res.ok) {
        setMessage(res.data.message);
        await loadWidgetStatus();
      } else {
        setMessage(res.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveLegacy = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await ipcClient.invoke('game:removeLegacyWidget', { confirm: true });
      if (res.ok) {
        setMessage(res.data.message);
        await loadWidgetStatus();
      }
    } finally {
      setBusy(false);
    }
  };

  const heartbeatAge = health.lastHeartbeat
    ? Math.max(0, Math.floor((now - health.lastHeartbeat) / 1000))
    : null;

  return (
    <div data-testid="settings-section-game" className="space-y-6 font-mono text-xs">
      {/* BAR Folder Section */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
            BAR GAME DIRECTORY
          </span>
          {settings?.bar?.source && (
            <span className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] uppercase text-[#94a3b8]">
              Source: {settings.bar.source}
            </span>
          )}
        </div>

        <div>
          <label className="text-[10px] text-[#71717a] uppercase">Current Data Path</label>
          <div
            data-testid="bar-dir-path"
            className="mt-1 rounded bg-[#0a0c14] p-2 text-xs text-[#e4e4e7] border border-[#1f2430] truncate"
          >
            {settings?.bar?.dataDir ?? 'Not configured / not detected'}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="default" size="sm" disabled={busy} onClick={() => void handleDetect()} data-testid="detect-bar-btn">
            AUTO-DETECT
          </Button>
          <Button variant="default" size="sm" disabled={busy} onClick={() => void handleBrowse()} data-testid="browse-bar-btn">
            BROWSE FOLDER
          </Button>
        </div>
      </div>

      {/* Widget Management */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
            LUA WIDGET (gui_stratcom.lua)
          </span>
          <span
            data-testid="widget-status-badge"
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              widgetStatus?.installed ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-[#fbbf24]/15 text-[#fbbf24]'
            }`}
          >
            {widgetStatus?.installed ? `v${widgetStatus.installedVersion}` : 'NOT INSTALLED'}
          </span>
        </div>

        <p className="text-xs text-[#a1a1aa]">
          StratCom connects to Beyond All Reason via a non-intrusive UI widget. After installing,
          enable it once in-game via the F11 widget menu or <span className="text-[#38bdf8]">/luaui reload</span>.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="armada"
            size="sm"
            disabled={busy || !settings?.bar?.dataDir}
            onClick={() => void handleInstallWidget()}
            data-testid="install-widget-btn"
          >
            {widgetStatus?.installed ? 'REINSTALL / UPDATE WIDGET' : 'INSTALL WIDGET'}
          </Button>

          {widgetStatus?.installed && (
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => void handleUninstallWidget()}
              data-testid="uninstall-widget-btn"
            >
              UNINSTALL WIDGET
            </Button>
          )}

          {widgetStatus?.legacyPresent && (
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => void handleRemoveLegacy()}
              className="border border-[#fbbf24]/40 text-[#fbbf24]"
            >
              REMOVE LEGACY WIDGET
            </Button>
          )}
        </div>
      </div>

      {/* Live Bridge Diagnostics */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-2">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
          DIAGNOSTICS & TELEMETRY
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
          <div className="rounded bg-[#0a0c14] p-2 border border-[#1f2430]">
            <span className="text-[10px] text-[#71717a] uppercase">Protocol</span>
            <div className="text-xs font-bold text-[#e4e4e7]">v1 (Active)</div>
          </div>
          <div className="rounded bg-[#0a0c14] p-2 border border-[#1f2430]">
            <span className="text-[10px] text-[#71717a] uppercase">Heartbeat Age</span>
            <div className="text-xs font-bold text-[#e4e4e7]">
              {heartbeatAge !== null ? `${heartbeatAge}s ago` : 'None'}
            </div>
          </div>
          <div className="rounded bg-[#0a0c14] p-2 border border-[#1f2430]">
            <span className="text-[10px] text-[#71717a] uppercase">Status</span>
            <div className="text-xs font-bold uppercase text-[#38bdf8]">{health.status}</div>
          </div>
          <div className="rounded bg-[#0a0c14] p-2 border border-[#1f2430]">
            <span className="text-[10px] text-[#71717a] uppercase">Bundled Version</span>
            <div className="text-xs font-bold text-[#e4e4e7]">{widgetStatus?.bundledVersion ?? '3.0.1'}</div>
          </div>
        </div>
      </div>

      {message && (
        <div data-testid="settings-game-message" className="rounded border border-[#38bdf8]/30 bg-[#0c1929] p-2.5 text-xs text-[#38bdf8]">
          {message}
        </div>
      )}
    </div>
  );
}
