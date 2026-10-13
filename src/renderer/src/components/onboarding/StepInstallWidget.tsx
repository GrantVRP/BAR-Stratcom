import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { ipcClient } from '../../lib/ipc-client';
import { useSettings } from '../../stores';
import type { WidgetStatus } from '../../../../shared/ipc';

export interface StepInstallWidgetProps {
  onBack: () => void;
  onNext: () => void;
}

export function StepInstallWidget({ onBack, onNext }: StepInstallWidgetProps): React.JSX.Element {
  const { settings } = useSettings();
  const [widgetStatus, setWidgetStatus] = useState<WidgetStatus | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStatus = async (): Promise<void> => {
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
    return () => {
      active = false;
    };
  }, []);

  const handleInstall = async (): Promise<void> => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await ipcClient.invoke('game:installWidget');
      if (res.ok) {
        setFeedback(res.data.message);
        await loadStatus();
      } else {
        setFeedback(res.message);
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
        setFeedback(res.data.message);
        await loadStatus();
      }
    } finally {
      setBusy(false);
    }
  };

  const isInstalled = widgetStatus?.installed ?? false;

  return (
    <div data-testid="onboarding-step-3" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-5 space-y-4">
        <div className="border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#38bdf8]">
            INSTALL COMPANION WIDGET
          </span>
        </div>

        <p className="text-xs text-[#e4e4e7] leading-relaxed">
          A small widget that reads your game. It doesn't change gameplay.
        </p>

        {/* Status Box */}
        <div className="flex items-center justify-between rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
          <div>
            <span className="font-bold text-[#e4e4e7] text-xs">WIDGET STATUS</span>
            <div className="text-[11px] text-[#71717a]">
              {isInstalled
                ? widgetStatus?.installedVersion
                  ? `Version ${widgetStatus.installedVersion} is installed and ready.`
                  : 'The widget is installed and ready.'
                : 'Widget is not yet installed in your BAR folder.'}
            </div>
          </div>
          <span
            data-testid="onboarding-widget-status"
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
              isInstalled ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'bg-[#fbbf24]/15 text-[#fbbf24]'
            }`}
          >
            {isInstalled ? 'INSTALLED ✓' : 'NOT INSTALLED'}
          </span>
        </div>

        {/* Install Action */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !settings?.bar?.dataDir}
            onClick={() => void handleInstall()}
            data-testid="onboarding-install-widget-btn"
          >
            {isInstalled ? 'REINSTALL / UPDATE WIDGET' : 'INSTALL COMPANION WIDGET'}
          </Button>

          {widgetStatus?.legacyPresent && (
            <Button
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => void handleRemoveLegacy()}
              data-testid="onboarding-remove-legacy-btn"
              className="border border-[#fbbf24]/40 text-[#fbbf24]"
            >
              REMOVE LEGACY WIDGET
            </Button>
          )}
        </div>

        {feedback && (
          <div className="text-[10px] text-[#38bdf8] pt-1">{feedback}</div>
        )}

        {/* Enable Once In-Game Instruction Box */}
        <div className="rounded border border-[#38bdf8]/30 bg-[#0c1929] p-3 space-y-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
            ENABLE IT ONCE IN-GAME
          </span>
          <p className="text-xs text-[#bae6fd] leading-relaxed">
            Then enable it once in game: press <kbd className="px-1 py-0.5 bg-[#1e293b] rounded font-bold text-white">F11</kbd>.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="md" onClick={onBack} data-testid="onboarding-back-btn">
          ◂ BACK
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          data-testid="onboarding-next-btn"
        >
          NEXT STEP ▸
        </Button>
      </div>
    </div>
  );
}
