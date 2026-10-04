import React from 'react';
import { Toggle } from '../ui/Toggle';
import { useSettings } from '../../stores';

export function AssistSettingsSection(): React.JSX.Element {
  const { settings } = useSettings();

  const armNext = settings?.assist?.armNext ?? false;
  const factoryQueue = settings?.assist?.factoryQueue ?? false;

  return (
    <div data-testid="settings-section-assist" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            GAMEPLAY ASSIST MODULES
          </span>
          <span className="rounded bg-[#fbbf24]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#fbbf24]">
            COMING IN MILESTONE M09
          </span>
        </div>

        <p className="text-xs text-[#a1a1aa]">
          Assist modules send build commands for you. Off by default.
        </p>

        {/* Arm Next Toggle */}
        <div className="rounded bg-[#0a0c14] p-3 border border-[#1f2430] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#e4e4e7] text-xs">ARM NEXT STEP</span>
            <Toggle
              checked={armNext}
              onChange={() => {}}
              disabled={true}
              aria-label="Arm Next Step (Disabled until M09)"
            />
          </div>
          <p className="text-xs text-[#71717a]">
            Readies the next build step when you can afford it.
          </p>
          <div className="text-[10px] text-[#fbbf24]">
            Coming soon.
          </div>
        </div>

        {/* Factory Queue Toggle */}
        <div className="rounded bg-[#0a0c14] p-3 border border-[#1f2430] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#e4e4e7] text-xs">FACTORY QUEUE SYNC</span>
            <Toggle
              checked={factoryQueue}
              onChange={() => {}}
              disabled={true}
              aria-label="Factory Queue Sync (Disabled until M09)"
            />
          </div>
          <p className="text-xs text-[#71717a]">
            Queues planned units in your factories.
          </p>
          <div className="space-y-1">
            <div className="text-[10px] text-[#fbbf24]">
              Coming soon.
            </div>
            <div className="text-[10px] text-[#94a3b8]">
              Only in lobbies that allow unit-control widgets.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
