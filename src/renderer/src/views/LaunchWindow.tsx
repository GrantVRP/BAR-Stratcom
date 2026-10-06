import React, { useCallback, useEffect, useState } from 'react';
import { FactionEmblem } from '../components/ui/FactionEmblem';
import { LaunchScene3D } from '../components/launch3d/LaunchScene3D';
import { factionAccent } from '../lib/faction-style';

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
    // close the context after the chime, or Chromium's audio service stays up for nothing (T11.3)
    setTimeout(() => void ctx.close().catch(() => undefined), 1000);
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
  const factionColor = factionAccent(faction);

  const handleLaunch = useCallback(() => {
    playArcadeStartChime();
    onStart();
  }, [onStart]);

  const toggleFaction = useCallback(() => {
    setFaction((prev) => (prev === 'armada' ? 'cortex' : 'armada'));
  }, []);

  // Arrows switch faction. Only the LAUNCH button enters the app (owner request, T06.16).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        toggleFaction();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFaction]);

  const panel = 'border-2 border-black bg-[#0a0c14]/90 shadow-[4px_4px_0px_#000]';

  return (
    <div
      data-testid="launch-window"
      className="crt crt-soft fixed inset-0 z-50 h-screen w-screen select-none overflow-hidden bg-[#0a0c14] text-[#e4e4e7]"
    >
      <LaunchScene3D faction={faction} reducedMotion={reducedMotion} />

      {/* Title */}
      <header className={`absolute left-1/2 top-6 z-[48] flex -translate-x-1/2 flex-col items-center gap-1 px-6 py-3 ${panel}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center border-2 bg-black" style={{ borderColor: factionColor }}>
            <FactionEmblem faction={faction} size={32} />
          </div>
          <h1 style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-xl font-bold tracking-wider sm:text-2xl">
            <span className="text-white drop-shadow-[2px_2px_0px_#000]">BAR </span>
            <span style={{ color: factionColor }} className="drop-shadow-[2px_2px_0px_#000]">
              STRATCOM
            </span>
          </h1>
        </div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs text-zinc-400">
          {version}
        </p>
      </header>

      {/* Launch (bottom-right, clear of the runner's track) */}
      <div className="absolute left-[74%] top-[70%] z-[48] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
        <button
          type="button"
          data-testid="launcher-button"
          onClick={handleLaunch}
          style={{ backgroundColor: factionColor, fontFamily: "'Press Start 2P', monospace" }}
          className="cursor-pointer border-2 border-black px-10 py-4 text-base font-bold uppercase tracking-wider text-white shadow-[4px_4px_0px_#000] transition-none active:translate-y-1 active:shadow-none"
        >
          LAUNCH
        </button>
      </div>

      {/* Footer (owner request: no disclaimer line here; the unofficial notice is on the top-bar tag and About page) */}
      <footer className="absolute inset-x-0 bottom-0 z-[48] flex items-center justify-end gap-3 border-t-2 border-black bg-[#0a0c14]/90 px-6 py-3">
        {/* Faction switcher */}
        <div
          data-testid="launcher-faction-toggle"
          onClick={(e) => {
            e.stopPropagation();
            toggleFaction();
          }}
          className="flex cursor-pointer items-center gap-2 border border-zinc-700 bg-[#0d0f17] px-3 py-1.5"
        >
          <span style={{ fontFamily: "'Press Start 2P', monospace", color: factionColor }} className="text-[10px] font-bold uppercase tracking-wider">
            {faction}
          </span>
          <div className="relative h-5 w-10 border border-black p-0.5" style={{ backgroundColor: `${factionColor}33`, borderColor: factionColor }}>
            <div
              className={`h-3.5 w-3.5 border border-black transition-transform duration-150 ${isArmada ? 'translate-x-0' : 'translate-x-5'}`}
              style={{ backgroundColor: factionColor }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
