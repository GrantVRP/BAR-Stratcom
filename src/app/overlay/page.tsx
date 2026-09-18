"use client";

import React from "react";
import { useOverlaySync } from "@/hooks/useOverlaySync";
import { useLiveGame } from "@/hooks/useLiveGame";
import { TacticalOverlay } from "@/components/tactical/TacticalOverlay";

export default function StandaloneOverlayPage() {
  const { overlayState } = useOverlaySync(false);
  const { liveState: fallbackLiveState } = useLiveGame();

  const effectiveLiveState = overlayState.liveState || fallbackLiveState;

  return (
    <main className="h-screen w-full bg-[#0a0c14]/95 text-zinc-100 font-pixel-body flex items-start justify-center p-2 relative overflow-y-auto custom-scrollbar select-none">
      {/* Full CRT Scanline overlay */}
      <div className="crt-scanlines pointer-events-none opacity-40 fixed inset-0" />

      <div className="w-full max-w-[420px] relative z-10 pb-6">
        <TacticalOverlay
          faction={overlayState.faction}
          selectedMap={overlayState.selectedMap}
          steps={overlayState.steps}
          liveState={effectiveLiveState}
          strategyTitle={overlayState.strategyTitle}
          isOpen={true}
          onClose={() => {
            if (typeof window !== "undefined") {
              window.close();
            }
          }}
          className="!static !w-full !max-w-none"
        />
      </div>
    </main>
  );
}
