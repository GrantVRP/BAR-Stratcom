"use client";

import React, { useCallback, useEffect } from "react";
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
      {/* Centered Start Button */}
      <button
        type="button"
        onClick={handleLaunch}
        className="px-12 py-5 text-xl font-pixel-heading font-bold text-white uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-none cursor-pointer"
        style={{ backgroundColor: factionColor }}
      >
        Start
      </button>

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
