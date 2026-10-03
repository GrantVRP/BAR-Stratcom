import React from 'react';

export function AboutSettingsSection(): React.JSX.Element {
  return (
    <div data-testid="settings-section-about" className="space-y-6 font-mono text-xs">
      {/* App Header & Version */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
            BAR STRATCOM
          </span>
          <span
            data-testid="app-version-badge"
            className="rounded bg-[#1e293b] px-2 py-0.5 text-[10px] text-[#38bdf8] font-bold"
          >
            v3.0.0-dev.0
          </span>
        </div>

        <p className="text-xs text-[#e4e4e7]">
          Live tactical coaching, build order execution, and match intelligence for Beyond All Reason.
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
        <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
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
              <div className="font-bold text-[#e4e4e7]">Third-Party Dependencies</div>
              <div className="text-[10px] text-[#71717a]">Electron, React, Zustand, TailwindCSS, Zod, fflate, Lucide</div>
            </div>
            <span className="text-[10px] font-bold text-[#94a3b8]">MIT / Apache-2.0</span>
          </div>
        </div>
      </div>

      {/* BAR Attribution & Links */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">
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
