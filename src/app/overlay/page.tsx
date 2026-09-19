"use client";

import React, { useState, useEffect } from "react";
import { useOverlaySync } from "@/hooks/useOverlaySync";
import { useLiveGame } from "@/hooks/useLiveGame";
import { TacticalOverlay } from "@/components/tactical/TacticalOverlay";

export default function StandaloneOverlayPage() {
  const [mounted, setMounted] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const { overlayState } = useOverlaySync(false);
  const { liveState: fallbackLiveState } = useLiveGame();

  const handleCloseOrHide = () => {
    if (typeof window !== "undefined") {
      const electron = window.electronAPI;
      if (electron?.hide) {
        electron.hide();
      } else if (electron?.close) {
        electron.close();
      } else {
        window.close();
      }
    }
  };

  useEffect(() => {
    setMounted(true);

    // Global in-window key listener to dismiss or toggle overlay
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === "escape" ||
        k === "f8" ||
        k === "f7" ||
        k === "insert" ||
        k === "scrolllock" ||
        k === "pause" ||
        k === "`" ||
        (e.shiftKey && k === "o") ||
        (e.altKey && k === "o")
      ) {
        e.preventDefault();
        handleCloseOrHide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Listen for click-through mode changes from Electron main process
    if (typeof window !== "undefined" && window.electronAPI?.on) {
      window.electronAPI.on("click-through-changed", (enabled: boolean) => {
        setIsClickThrough(Boolean(enabled));
      });
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const effectiveLiveState = overlayState.liveState || fallbackLiveState;

  return (
    <main className="min-h-screen w-full bg-[#0a0c14] text-zinc-100 font-pixel-body flex items-start justify-center p-2 relative overflow-y-auto custom-scrollbar select-none">
      {/* Full CRT Scanline overlay */}
      <div className="crt-scanlines pointer-events-none opacity-40 fixed inset-0" />

      {/* Pass-Through / Ghost Mode Indicator Banner */}
      {isClickThrough && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-950/95 border-b-2 border-emerald-500 text-emerald-200 text-center py-1 px-2 font-pixel-heading text-[9px] flex items-center justify-center gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <span className="size-1.5 bg-emerald-400 arcade-blink" />
          <span>[PASS-THROUGH ACTIVE] Clicks pass directly to BAR! Press CTRL+SHIFT+T or ALT+T to interact</span>
        </div>
      )}

      <div className={`w-full max-w-[420px] relative z-10 pb-6 ${isClickThrough ? "pt-6" : ""}`}>
        {mounted ? (
          <TacticalOverlay
            faction={overlayState.faction}
            selectedMap={overlayState.selectedMap}
            steps={overlayState.steps}
            liveState={effectiveLiveState}
            strategyTitle={overlayState.strategyTitle}
            isOpen={true}
            onClose={handleCloseOrHide}
            className="!static !w-full !max-w-none"
          />
        ) : (
          <div className="p-4 bg-[#0c0c14] border-2 border-zinc-800 text-center font-pixel-heading text-xs text-[#449bed] animate-pulse">
            LOADING TACTICAL OVERLAY...
          </div>
        )}
      </div>
    </main>
  );
}

