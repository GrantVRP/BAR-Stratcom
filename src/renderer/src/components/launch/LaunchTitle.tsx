import React from 'react';

export interface LaunchTitleProps {
  /** STRATCOM's colour; with two, the word is half one and half the other, blended across the middle. */
  colors: readonly [string] | readonly [string, string];
  version: string;
  /** Shown left of the title (the launcher's faction emblem). */
  emblem?: React.ReactNode;
}

function stratcomStyle(colors: LaunchTitleProps['colors']): React.CSSProperties {
  if (colors.length === 1) return { color: colors[0] };
  return {
    backgroundImage: `linear-gradient(90deg, ${colors[0]} 40%, ${colors[1]} 60%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent'
  };
}

/** The BAR STRATCOM title panel at the top of the launcher (and of the README animation). */
export function LaunchTitle({ colors, version, emblem }: LaunchTitleProps): React.JSX.Element {
  return (
    <header
      data-testid="launch-title"
      className="absolute left-1/2 top-6 z-[48] flex -translate-x-1/2 flex-col items-center gap-1 border-2 border-black bg-[#0a0c14]/90 px-6 py-3 shadow-[4px_4px_0px_#000]"
    >
      <div className="flex items-center gap-3">
        {emblem}
        <h1 style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-xl font-bold tracking-wider sm:text-2xl">
          <span className="text-white drop-shadow-[2px_2px_0px_#000]">BAR </span>
          <span data-testid="launch-title-stratcom" style={stratcomStyle(colors)} className="drop-shadow-[2px_2px_0px_#000]">
            STRATCOM
          </span>
        </h1>
      </div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs text-zinc-400">
        {version}
      </p>
    </header>
  );
}
