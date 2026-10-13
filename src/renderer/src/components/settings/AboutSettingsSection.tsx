import React, { useEffect, useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';

export function AboutSettingsSection(): React.JSX.Element {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    void ipcClient.invoke('app:getInfo').then((res) => {
      if (res.ok) setVersion(res.data.version);
    });
  }, []);

  return (
    <div data-testid="settings-section-about" className="space-y-6 font-mono text-xs">
      {/* App Header & Version */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            BAR STRATCOM
          </span>
          <span
            data-testid="app-version-badge"
            className="rounded bg-[#1e293b] px-2 py-0.5 text-[10px] text-[#38bdf8] font-bold"
          >
            {version ? `v${version}` : '…'}
          </span>
        </div>

        <p className="text-xs text-[#e4e4e7]">
          Live tactical coaching, build order execution, and match intelligence for Beyond All Reason.
        </p>
        <p data-testid="about-version-check" className="text-[11px] text-[#a1a1aa]">
          Version check (Settings → App, on by default): at start the packaged app asks GitHub for the latest release
          and shows a banner when it is newer. Nothing about you or your games is sent.
        </p>

        {/* Unofficial Community Tool Disclaimer */}
        <div className="rounded border border-[#fbbf24]/30 bg-[#1f1a10] p-3 space-y-1">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">
            UNOFFICIAL COMMUNITY TOOL
          </span>
          <p className="text-xs text-[#fef08a]">
            BAR StratCom is an unofficial community project and is NOT affiliated with, endorsed by,
            or sponsored by the Beyond All Reason development team or the Spring/Recoil engine developers.
          </p>
        </div>
      </div>

      {/* Licenses */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          LICENSES & OPEN SOURCE
        </span>

        <div className="space-y-2 text-xs">
          <div className="flex items-start justify-between rounded bg-[#0a0c14] p-2.5 border border-[#1f2430]">
            <div>
              <div className="font-bold text-[#e4e4e7]">Desktop Application (Electron / Core / UI)</div>
              <div className="text-[10px] text-[#71717a]">All desktop source code and core algorithms</div>
            </div>
            <span className="text-[10px] font-bold text-[#4ade80]">MIT License</span>
          </div>

          <div className="flex items-start justify-between rounded bg-[#0a0c14] p-2.5 border border-[#1f2430]">
            <div>
              <div className="font-bold text-[#e4e4e7]">Lua In-Game Widget (gui_stratcom.lua)</div>
              <div className="text-[10px] text-[#71717a]">Engine widget integration and state exporter</div>
            </div>
            <span className="text-[10px] font-bold text-[#38bdf8]">GPL-2.0-or-later</span>
          </div>

          <div className="flex items-start justify-between rounded bg-[#0a0c14] p-2.5 border border-[#1f2430]">
            <div>
              <div className="font-bold text-[#e4e4e7]">Typography & Fonts</div>
              <div className="text-[10px] text-[#71717a]">Press Start 2P, VT323, JetBrains Mono</div>
            </div>
            <span className="text-[10px] font-bold text-[#94a3b8]">OFL-1.1</span>
          </div>

          <div className="flex items-start justify-between rounded bg-[#0a0c14] p-2.5 border border-[#1f2430]">
            <div>
              <div className="font-bold text-[#e4e4e7]">Third-Party Packages</div>
              <div className="text-[10px] text-[#71717a]">
                Electron, React, three.js, Zustand, Tailwind CSS, Zod, fflate, Lucide, the AI provider SDKs and what
                they use. Full list and licence texts: resources\THIRD_PARTY_NOTICES.md in the app folder.
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#94a3b8]">SEE NOTICES</span>
          </div>
        </div>
      </div>

      {/* BAR Attribution & Links */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          BEYOND ALL REASON ATTRIBUTION
        </span>

        <p className="text-xs text-[#a1a1aa]">
          Beyond All Reason (BAR) is a free, open-source real-time strategy game created and
          continuously maintained by the Beyond All Reason community and developer team.
        </p>

        <div className="pt-1">
          <a
            href="https://www.beyondallreason.info"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#38bdf8] hover:underline"
          >
            https://www.beyondallreason.info
          </a>
        </div>
      </div>
    </div>
  );
}
