import React, { useEffect, useState } from 'react';
import { useSettings } from '../../stores';
import { Toggle } from '../ui/Toggle';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ipcClient } from '../../lib/ipc-client';

export function AppSettingsSection(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const [shortcutStatus, setShortcutStatus] = useState<'registered' | 'busy' | 'disabled'>('disabled');
  const [customInput, setCustomInput] = useState<string | null>(null);
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);

  const shortcutInput = customInput ?? settings?.globalShortcut ?? 'Ctrl+Alt+S';
  const showOnStart = settings?.launcher?.showOnStart ?? true;
  const checkUpdates = settings?.updates?.checkOnLaunch ?? true;
  const alwaysOnTop = settings?.coachWindow?.alwaysOnTop ?? true;
  const overlayMode = settings?.coachWindow?.overlayMode ?? false;

  useEffect(() => {
    let active = true;
    ipcClient.invoke('coach:getShortcutStatus').then((res) => {
      if (!active || !res.ok) return;
      setShortcutStatus(res.data.status);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleApplyShortcut = async (): Promise<void> => {
    const trimmed = shortcutInput.trim();
    await updateSettings({ globalShortcut: trimmed || null });
    setCustomInput(null);
    const res = await ipcClient.invoke('coach:getShortcutStatus');
    if (res.ok) {
      setShortcutStatus(res.data.status);
    }
    setShortcutFeedback(trimmed ? `Shortcut set to ${trimmed}` : 'Shortcut disabled');
    setTimeout(() => setShortcutFeedback(null), 3000);
  };

  const handleResetShortcut = async (): Promise<void> => {
    const def = 'Ctrl+Alt+S';
    setCustomInput(null);
    await updateSettings({ globalShortcut: def });
    const res = await ipcClient.invoke('coach:getShortcutStatus');
    if (res.ok) {
      setShortcutStatus(res.data.status);
    }
    setShortcutFeedback('Reset to default Ctrl+Alt+S');
    setTimeout(() => setShortcutFeedback(null), 3000);
  };

  return (
    <div data-testid="settings-section-app" className="space-y-6 font-mono text-xs">
      {/* Startup & Updates */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-4">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          LAUNCHER & SYSTEM PREFERENCES
        </span>

        {/* Launcher on start */}
        <div className="flex items-center justify-between rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
          <div>
            <div className="font-bold text-[#e4e4e7] text-xs">SHOW TITLE LAUNCHER ON START</div>
            <div className="text-[10px] text-[#71717a]">
              Show the launch screen on start.
            </div>
          </div>
          <Toggle
            checked={showOnStart}
            onChange={(checked) => void updateSettings({ launcher: { showOnStart: checked } })}
            data-testid="launcher-show-toggle"
          />
        </div>

        {/* Update checking */}
        <div className="space-y-2 rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-[#e4e4e7] text-xs">CHECK FOR UPDATES ON LAUNCH</div>
              <div className="text-[10px] text-[#71717a]">
                Check GitHub for new versions on start.
              </div>
            </div>
            <Toggle
              checked={checkUpdates}
              onChange={(checked) => void updateSettings({ updates: { checkOnLaunch: checked } })}
              data-testid="updates-check-toggle"
            />
          </div>
          <div className="text-[10px] text-[#94a3b8] border-t border-[#1f2430] pt-2">
            Only GitHub is contacted. No tracking.
          </div>
        </div>

        {/* Re-run Onboarding */}
        <div className="flex items-center justify-between rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
          <div>
            <div className="font-bold text-[#e4e4e7] text-xs">ONBOARDING SETUP WIZARD</div>
            <div className="text-[10px] text-[#71717a]">
              Run the setup wizard again.
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              window.location.hash = '#/onboarding';
            }}
            data-testid="rerun-onboarding-btn"
          >
            RE-RUN SETUP WIZARD
          </Button>
        </div>
      </div>

      {/* Global Shortcut */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            GLOBAL SHORTCUT (IN-GAME HOTKEY)
          </span>
          <span
            data-testid="shortcut-status-badge"
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              shortcutStatus === 'registered'
                ? 'bg-[#4ade80]/15 text-[#4ade80]'
                : shortcutStatus === 'busy'
                  ? 'bg-[#f87171]/15 text-[#f87171]'
                  : 'bg-[#71717a]/15 text-[#71717a]'
            }`}
          >
            {shortcutStatus}
          </span>
        </div>

        <p className="text-xs text-[#a1a1aa]">
          Shows or hides the coach window in game.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Input
            value={shortcutInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Ctrl+Alt+S"
            className="w-48 text-xs font-mono"
            data-testid="global-shortcut-input"
          />
          <Button variant="default" size="sm" onClick={() => void handleApplyShortcut()} data-testid="apply-shortcut-btn">
            APPLY
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleResetShortcut()}>
            RESET DEFAULT
          </Button>
        </div>

        {shortcutFeedback && (
          <div className="text-[10px] text-[#38bdf8]">{shortcutFeedback}</div>
        )}
      </div>

      {/* Coach Window Preferences */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-4">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          COACH WINDOW DISPLAY PREFERENCES
        </span>

        {/* Always on top */}
        <div className="flex items-center justify-between rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
          <div>
            <div className="font-bold text-[#e4e4e7] text-xs">ALWAYS ON TOP</div>
            <div className="text-[10px] text-[#71717a]">
              Keep the coach window on top.
            </div>
          </div>
          <Toggle
            checked={alwaysOnTop}
            onChange={(checked) =>
              void updateSettings({
                coachWindow: {
                  ...(settings?.coachWindow ?? { overlayMode: false }),
                  alwaysOnTop: checked
                }
              })
            }
            data-testid="always-on-top-toggle"
          />
        </div>

        {/* Overlay mode */}
        <div className="space-y-2 rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-[#e4e4e7] text-xs">OVERLAY MODE (TRANSPARENT HUD)</div>
              <div className="text-[10px] text-[#71717a]">
                Transparent HUD over the game.
              </div>
            </div>
            <Toggle
              checked={overlayMode}
              onChange={(checked) =>
                void updateSettings({
                  coachWindow: {
                    ...(settings?.coachWindow ?? { alwaysOnTop: true }),
                    overlayMode: checked
                  }
                })
              }
              data-testid="overlay-mode-toggle"
            />
          </div>
          <div className="text-[10px] text-[#fbbf24] border-t border-[#1f2430] pt-2">
            Needs BAR in borderless windowed mode.
          </div>
        </div>
      </div>
    </div>
  );
}
