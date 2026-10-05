import React from 'react';
import type { AssistSettings } from '../../../../core/schemas/settings';
import { useSettings } from '../../stores';
import { ASSIST_BINDS, bindCommand } from '../../lib/assist';
import { Toggle } from '../ui/Toggle';

const OFF: AssistSettings = { armNext: false, factoryQueue: false };

const MODULES: Record<keyof AssistSettings, { title: string; text: string; note?: string }> = {
  armNext: {
    title: 'ARM NEXT BUILD',
    text: 'With a builder or your commander selected, press the key: the next planned building is picked and you click to place it. It never gives orders, so it works in every game.'
  },
  factoryQueue: {
    title: 'LOAD FACTORY QUEUE',
    text: 'With the planned factory selected, press the key: its next planned units are queued (up to 20).',
    note: 'Only in lobbies that allow unit-control widgets. Elsewhere BAR shows ASSIST BLOCKED BY LOBBY.'
  }
};

/** Settings → Assist (06 §4.10, T09.2): two opt-in helpers, off by default (D-06). */
export function AssistSettingsSection(): React.JSX.Element {
  const assist = useSettings((s) => s.settings?.assist) ?? OFF;
  const update = useSettings((s) => s.update);

  return (
    <div data-testid="settings-section-assist" className="space-y-6 font-mono text-xs">
      <div className="space-y-4 rounded border border-[#27272a] bg-[#12131a] p-4">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">IN-GAME ASSIST</span>
        <p className="text-zinc-400">Off by default. Each helper runs only when you press its key in BAR.</p>

        {ASSIST_BINDS.map((bind) => {
          const module = MODULES[bind.id];
          return (
            <div key={bind.id} data-testid={`assist-${bind.id}`} className="space-y-2 border border-[#1f2430] bg-[#0a0c14] p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-zinc-200">{module.title}</span>
                <Toggle
                  checked={assist[bind.id]}
                  onChange={(on) => void update({ assist: { ...assist, [bind.id]: on } })}
                  data-testid={`assist-toggle-${bind.id}`}
                  aria-label={module.title}
                />
              </div>
              <p className="text-zinc-300">{module.text}</p>
              {module.note && <p className="text-[#fbbf24]">{module.note}</p>}
              <div className="text-[10px] uppercase text-zinc-400">Bind once, in BAR chat</div>
              <code data-testid={`assist-bind-${bind.id}`} className="block select-all border border-zinc-700 bg-black/40 px-2 py-1 text-[13px] text-[#38bdf8]">
                {bindCommand(bind)}
              </code>
            </div>
          );
        })}
      </div>
    </div>
  );
}
