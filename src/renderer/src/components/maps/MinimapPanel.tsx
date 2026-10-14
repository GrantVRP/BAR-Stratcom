import React, { useEffect, useState } from 'react';
import type { MapRecord } from '../../../../core/schemas';
import type { IpcResponseData } from '../../../../shared';
import { ipcClient } from '../../lib/ipc-client';

/** Map size units → elmos (start positions are in elmos). */
const ELMOS_PER_UNIT = 512;

type Minimap = IpcResponseData<'maps:minimap'>['data'];

/**
 * The map's minimap from maps-metadata.beyondallreason.dev (fetched by main, attributed) with the
 * start positions plotted on top as numbered dots. Without a minimap the dots stay on a grid.
 */
export function MinimapPanel({ map }: { map: MapRecord }): React.JSX.Element {
  const [answer, setAnswer] = useState<{ scriptName: string; minimap: Minimap; failed: boolean } | null>(null);
  const [broken, setBroken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void ipcClient.invoke('maps:minimap', { scriptName: map.scriptName }).then((res) => {
      if (active) setAnswer({ scriptName: map.scriptName, minimap: res.ok ? res.data.data : null, failed: !res.ok });
    });
    return () => {
      active = false;
    };
  }, [map.scriptName]);

  const current = answer?.scriptName === map.scriptName ? answer : null;
  const minimap = current?.minimap && broken !== current.minimap.url ? current.minimap : null;
  const w = map.sizeX * ELMOS_PER_UNIT;
  const h = map.sizeZ * ELMOS_PER_UNIT;
  const r = Math.max(w, h) / 60;

  return (
    <figure className="space-y-1.5">
      <div
        data-testid="map-minimap"
        className="relative w-full max-w-[420px] overflow-hidden border-2 border-black bg-[#0d0f17] bg-[linear-gradient(#1b1f2e_1px,transparent_1px),linear-gradient(90deg,#1b1f2e_1px,transparent_1px)] bg-[size:12.5%_12.5%]"
        style={{ aspectRatio: `${map.sizeX} / ${map.sizeZ}` }}
      >
        {minimap && (
          <img src={minimap.url} alt={`Minimap of ${map.name}`} className="absolute inset-0 h-full w-full" onError={() => setBroken(minimap.url)} />
        )}
        <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-label={`${map.startPositions.length} start positions`} role="img">
          {map.startPositions.map((p, i) => (
            <g key={i} data-testid="map-start-position">
              <circle cx={p.x} cy={p.z} r={r} fill="#fbbf24" stroke="#000" strokeWidth={r / 4} />
              <text x={p.x} y={p.z} dy={r * 0.4} textAnchor="middle" fontSize={r * 1.1} fontFamily="monospace" fontWeight={700} fill="#000">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption data-testid="map-minimap-credit" className="font-mono text-[11px] text-zinc-400">
        {minimap
          ? `Minimap: maps-metadata.beyondallreason.dev${minimap.author ? ` // map by ${minimap.author}` : ''}`
          : current?.failed
            ? 'Minimap unavailable (offline)'
            : current
              ? 'No minimap listed for this map'
              : 'Loading minimap…'}
      </figcaption>
    </figure>
  );
}
