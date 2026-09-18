"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Faction } from "@/lib/game-data";

export interface LaunchWindowProps {
  onStart: () => void;
  faction: Faction;
  onFactionChange: (faction: Faction) => void;
}

// 8-Bit Vintage Arcade Chime using Web Audio API
function playArcadeStartChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes = [440, 554.37, 659.25, 880];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.08, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.18);
    });
  } catch {
    // Audio autoplay restrictions: silent fallback
  }
}

export function LaunchWindow({
  onStart,
  faction,
  onFactionChange,
}: LaunchWindowProps) {
  const isArmada = faction === "Armada";
  const factionColor = isArmada ? "#449bed" : "#ff2244";

  const handleLaunch = useCallback(() => {
    playArcadeStartChime();
    onStart();
  }, [onStart]);

  const toggleFaction = useCallback(() => {
    onFactionChange(isArmada ? "Cortex" : "Armada");
  }, [isArmada, onFactionChange]);

  const mechRef = useRef<HTMLDivElement>(null);
  const [buttonShift, setButtonShift] = useState<number>(65);

  // Dynamically calibrate LAUNCH button position to achieve exact symmetrical 1:1 spacing
  // matching the Barcom logo distance from the animation.
  useEffect(() => {
    const calculateShift = () => {
      if (!mechRef.current) return;
      const height = mechRef.current.clientHeight;
      if (height === 0) return;
      const isSm = window.innerWidth >= 640;
      const logoExpansion = isSm ? 9 : 7.2;
      // In the 640x640 canvas: feet contact at Y=511 (129px bottom empty).
      // The top robot body sits at Y~62 (62px top empty).
      // Difference = 67px (10.47% of canvas).
      // Shifting up by `height * (67 / 640) + logoExpansion` balances top and bottom gaps to 1:1.
      const shift = Math.round(height * (67 / 640) + logoExpansion);
      setButtonShift(shift);
    };

    calculateShift();

    const ro = new ResizeObserver(() => {
      calculateShift();
    });
    if (mechRef.current) {
      ro.observe(mechRef.current);
    }

    window.addEventListener("resize", calculateShift);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calculateShift);
    };
  }, [faction]);

  // Keyboard controls: ENTER or SPACE to start, Arrow keys to toggle faction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleLaunch();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        toggleFaction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleLaunch, toggleFaction]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0c14] select-none"
    >
      {/* Centered Area: Barcom Logo + Mech animation + Launch button */}
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-5 z-10 w-full max-w-full px-4">
        {/* Barcom Logo Centered Above Animations (145% scale) */}
        <div
          className="flex items-center gap-2.5 sm:gap-3.5 select-none origin-center"
          style={{ transform: "scale(1.45)" }}
        >
          <div
            className="size-8 sm:size-10 bg-black flex items-center justify-center shrink-0 border-2 shadow-[2px_2px_0px_#000] transition-colors duration-150"
            style={{ borderColor: factionColor }}
          >
            <img
              src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
              alt={`${faction} Logo`}
              width={26}
              height={26}
              className="object-contain pixelated"
            />
          </div>
          <div className="relative">
            <h1 className="text-base sm:text-xl lg:text-2xl font-pixel-heading tracking-wider flex items-center gap-2 sm:gap-2.5">
              <span className="text-white drop-shadow-[2px_2px_0px_#000]">BAR</span>
              <span
                className="drop-shadow-[2px_2px_0px_#000] transition-colors duration-150"
                style={{ color: factionColor }}
              >
                STRATCOM
              </span>
              <span className="text-[9px] sm:text-[11px] px-1.5 py-0.5 bg-[#1a1c26] text-zinc-400 border border-[#2a2e42] align-middle">
                v2.5
              </span>
            </h1>
          </div>
        </div>
        {/* Mech Animation Container */}
        <div ref={mechRef} className="flex flex-col items-center">
          {faction === "Armada" && (
            <motion.div
              key="armada-sprinter"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center overflow-visible"
            >
              <img
                src="/sprinter-pixel.webp"
                alt="Armada Sprinter"
                width={640}
                height={640}
                className="w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] lg:w-[600px] lg:h-[600px] max-w-[90vw] max-h-[55vh] object-contain pointer-events-none"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>
          )}

          {faction === "Cortex" && (
            <motion.div
              key="cortex-fiend"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center overflow-visible"
            >
              <img
                src="/fiend-pixel.webp"
                alt="Cortex Fiend"
                width={640}
                height={640}
                className="w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] lg:w-[600px] lg:h-[600px] max-w-[90vw] max-h-[55vh] object-contain pointer-events-none"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>
          )}
        </div>

        {/* Launch Button (symmetrically positioned relative to logo) */}
        <div
          className="self-center flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transform: `translateY(-${buttonShift}px)` }}
        >
          <button
            type="button"
            onClick={handleLaunch}
            className="px-12 py-5 text-xl font-pixel-heading font-bold text-white uppercase tracking-wider text-center flex items-center justify-center border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-none cursor-pointer"
            style={{ backgroundColor: factionColor }}
          >
            <span className="pl-[0.05em]">LAUNCH</span>
          </button>
        </div>
      </div>

      {/* Bottom-Right Faction Switch */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
        <span
          className="font-pixel-heading text-xs font-bold uppercase tracking-wider"
          style={{ color: factionColor }}
        >
          {faction}
        </span>

        {/* Tactile Toggle Switch */}
        <button
          type="button"
          onClick={toggleFaction}
          aria-label={`Current faction: ${faction}. Click to switch.`}
          className="relative w-14 h-7 border-2 border-black shadow-[2px_2px_0px_#000] p-0.5 transition-none cursor-pointer flex items-center"
          style={{ backgroundColor: `${factionColor}33`, borderColor: factionColor }}
        >
          <span
            className={`size-5 transition-transform duration-150 border border-black shadow-sm ${
              isArmada ? "translate-x-0" : "translate-x-7"
            }`}
            style={{ backgroundColor: factionColor }}
          />
        </button>
      </div>
    </motion.div>
  );
}

export default LaunchWindow;
