import React, { useEffect, useState } from 'react';
import { DevUiGallery } from './views/DevUiGallery';

export function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('');
  const [currentHash, setCurrentHash] = useState<string>(
    typeof window !== 'undefined' ? window.location.hash : ''
  );

  useEffect(() => {
    function handleHashChange(): void {
      setCurrentHash(window.location.hash);
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (window.stratcom?.invoke) {
      window.stratcom
        .invoke('app:getInfo')
        .then((res) => {
          if (res.ok) {
            setVersion(res.data.version);
          } else {
            console.error('Failed to get app info:', res.message);
          }
        })
        .catch((err: unknown) => {
          console.error('Failed to get app info:', err);
        });
    }
  }, []);

  if (currentHash.startsWith('#/dev/ui')) {
    return <DevUiGallery />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0c14] text-[#e4e4e7]">
      <h1 style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-2xl font-bold tracking-wider">
        BAR STRATCOM
      </h1>
      <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-sm text-zinc-400">
        {version}
      </p>
    </div>
  );
}
