import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { ipcClient } from '../../lib/ipc-client';
import { useSettings } from '../../stores';

export interface StepFindBarProps {
  onBack: () => void;
  onNext: () => void;
}

export function StepFindBar({ onBack, onNext }: StepFindBarProps): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const [busy, setBusy] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const detectBar = async (): Promise<void> => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await ipcClient.invoke('game:locate');
      if (res.ok && res.data) {
        await updateSettings({
          bar: {
            dataDir: res.data.dataDir,
            source: res.data.source
          }
        });
        setFeedback(`Located Beyond All Reason via ${res.data.source}.`);
      } else {
        setFeedback('Could not auto-detect BAR directory. Please browse manually.');
      }
    } finally {
      setBusy(false);
    }
  };

  const browseBar = async (): Promise<void> => {
    setBusy(true);
    setFeedback(null);
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
          setFeedback(`Directory set to ${locateRes.data.dataDir}.`);
        } else {
          setFeedback('Selected directory does not appear to contain BAR data.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!settings?.bar?.dataDir) {
      ipcClient.invoke('game:locate').then((res) => {
        if (!active) return;
        if (res.ok && res.data) {
          void updateSettings({
            bar: {
              dataDir: res.data.dataDir,
              source: res.data.source
            }
          });
          setFeedback(`Located Beyond All Reason via ${res.data.source}.`);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [settings?.bar?.dataDir, updateSettings]);

  const dataDir = settings?.bar?.dataDir;
  const source = settings?.bar?.source;

  return (
    <div data-testid="onboarding-step-2" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-5 space-y-4">
        <div className="border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#38bdf8]">
            LOCATE BEYOND ALL REASON
          </span>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            STRATCOM COMMUNICATES WITH YOUR GAME VIA THE &lt;BAR DATA&gt;/stratcom DIRECTORY
          </p>
        </div>

        <p className="text-xs text-[#e4e4e7] leading-relaxed">
          StratCom needs to know where Beyond All Reason is installed on your computer.
          We can auto-detect it from your Windows registry, running game processes, or default installation folders.
        </p>

        {/* Directory Card */}
        <div className="rounded bg-[#0a0c14] p-3 border border-[#1f2430] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#e4e4e7] text-xs">CURRENT BAR DATA PATH</span>
            {source && (
              <span className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] uppercase text-[#38bdf8] font-bold">
                DETECTED VIA {source}
              </span>
            )}
          </div>
          <div
            data-testid="onboarding-bar-dir"
            className="rounded bg-[#12131a] p-2 text-xs text-[#e4e4e7] border border-[#27272a] truncate font-mono"
          >
            {dataDir ?? 'Not detected yet — click Auto-Detect or Browse below'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={busy}
            onClick={() => void detectBar()}
            data-testid="onboarding-detect-btn"
          >
            AUTO-DETECT BAR
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={busy}
            onClick={() => void browseBar()}
            data-testid="onboarding-browse-btn"
          >
            BROWSE FOLDER
          </Button>
        </div>

        {feedback && (
          <div className="text-[10px] text-[#38bdf8] pt-1">{feedback}</div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="md" onClick={onBack} data-testid="onboarding-back-btn">
          ◂ BACK
        </Button>
        <Button
          variant="armada"
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
