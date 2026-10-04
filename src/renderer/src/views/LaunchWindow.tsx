import React, { useCallback, useEffect, useState } from 'react';
import { FactionEmblem } from '../components/ui/FactionEmblem';
import { WalkingBot } from '../components/sprites/WalkingBot';
import armadaTurbineStill from '../assets/original/armada_turbine_still.png';
import cortexTurbineStill from '../assets/original/cortex_turbine_still.png';
import armadaTurbineFull from '../assets/original/armada_turbine_full.webp';
import cortexTurbineFull from '../assets/original/cortex_turbine_full.webp';

/** Width of the stage the bot walks across (px). */
const STAGE_WIDTH = 640;

export interface LaunchWindowProps {
  onStart: () => void;
  version?: string;
  defaultFaction?: 'armada' | 'cortex';
}

function playArcadeStartChime(): void {
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

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.08, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.18);
    });
  } catch {
    // Silent fallback if audio context fails
  }
}

export function LaunchWindow({
  onStart,
  version = '3.0.0-dev.0',
  defaultFaction = 'armada'
}: LaunchWindowProps): React.JSX.Element {
  const [faction, setFaction] = useState<'armada' | 'cortex'>(defaultFaction);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const isArmada = faction === 'armada';
  const factionColor = isArmada ? '#449bed' : '#ff2244';

  const handleLaunch = useCallback(() => {
    playArcadeStartChime();
    onStart();
  }, [onStart]);

  const toggleFaction = useCallback(() => {
    setFaction((prev) => (prev === 'armada' ? 'cortex' : 'armada'));
  }, []);

  // Keyboard navigation: press any key to launch; arrows switch faction
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        toggleFaction();
        return;
      }
      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }
      e.preventDefault();
      handleLaunch();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLaunch, toggleFaction]);

  const turbineImage = isArmada
    ? reducedMotion
      ? armadaTurbineStill
      : armadaTurbineFull
    : reducedMotion
      ? cortexTurbineStill
      : cortexTurbineFull;

  return (
    <div
      data-testid="launch-window"
      onClick={handleLaunch}
      className="crt fixed inset-0 z-50 h-screen w-screen flex flex-col justify-between bg-[#0a0c14] p-6 text-[#e4e4e7] select-none cursor-pointer overflow-hidden"
    >
      {/* Top Header Branding */}
      <header className="flex flex-col items-center gap-1 pt-6 text-center shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center border-2 bg-black shadow-[2px_2px_0px_#000]"
            style={{ borderColor: factionColor }}
          >
            <FactionEmblem faction={faction} size={28} />
          </div>
          <h1
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-xl sm:text-2xl font-bold tracking-wider"
          >
            <span className="text-white drop-shadow-[2px_2px_0px_#000]">BAR </span>
            <span style={{ color: factionColor }} className="drop-shadow-[2px_2px_0px_#000]">
              STRATCOM
            </span>
          </h1>
        </div>
        <p
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className="text-xs text-zinc-400"
        >
          {version}
        </p>
      </header>

      {/* Center Tactical Stage */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 my-auto">
        <div
          data-testid="launcher-stage"
          className="relative flex h-64 max-w-full items-center justify-center overflow-hidden"
          style={{ width: STAGE_WIDTH }}
        >
          <img
            src={turbineImage}
            alt={`${faction} Tactical Energy Turbine`}
            className="h-64 w-64 object-contain pixelated pointer-events-none drop-shadow-[0_0_24px_rgba(0,0,0,0.8)]"
            style={{ imageRendering: 'pixelated' }}
          />
          <WalkingBot key={faction} faction={faction} reducedMotion={reducedMotion} stageWidth={STAGE_WIDTH} />
        </div>

        <button
          type="button"
          data-testid="launcher-button"
          onClick={(e) => {
            e.stopPropagation();
            handleLaunch();
          }}
          style={{
            backgroundColor: factionColor,
            fontFamily: "'Press Start 2P', monospace"
          }}
          className="px-10 py-4 text-base font-bold text-white uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none cursor-pointer transition-none"
        >
          LAUNCH
        </button>

        <div
          style={{ fontFamily: "'Press Start 2P', monospace" }}
          className="animate-pulse text-[10px] uppercase tracking-wider text-zinc-400"
        >
          [PRESS ANY KEY OR CLICK TO CONTINUE]
        </div>
      </main>

      {/* Footer Area */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-4 text-center shrink-0">
        <div
          style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
          className="text-zinc-500 uppercase tracking-wide"
        >
          UNOFFICIAL COMMUNITY TOOL // NOT AFFILIATED WITH THE BEYOND ALL REASON TEAM
        </div>

        {/* Faction Switcher */}
        <div
          data-testid="launcher-faction-toggle"
          onClick={(e) => {
            e.stopPropagation();
            toggleFaction();
          }}
          className="flex items-center gap-2 cursor-pointer border border-zinc-800 bg-[#0d0f17] px-3 py-1.5"
        >
          <span
            style={{ fontFamily: "'Press Start 2P', monospace", color: factionColor }}
            className="text-[10px] font-bold uppercase tracking-wider"
          >
            {faction}
          </span>
          <div
            className="relative h-5 w-10 border border-black p-0.5"
            style={{ backgroundColor: `${factionColor}33`, borderColor: factionColor }}
          >
            <div
              className={`h-3.5 w-3.5 border border-black transition-transform duration-150 ${
                isArmada ? 'translate-x-0' : 'translate-x-5'
              }`}
              style={{ backgroundColor: factionColor }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
