import React, { useEffect, useState } from 'react';

export function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    if (window.stratcom?.getInfo) {
      window.stratcom
        .getInfo()
        .then((info) => {
          setVersion(info.version);
        })
        .catch((err) => {
          console.error('Failed to get app info:', err);
        });
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0c14] text-[#e4e4e7]">
      <h1
        style={{ fontFamily: "'Press Start 2P', monospace" }}
        className="text-2xl font-bold tracking-wider"
      >
        BAR STRATCOM
      </h1>
      <p
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className="text-sm text-zinc-400"
      >
        {version}
      </p>
    </div>
  );
}
