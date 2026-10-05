import React, { useEffect, useMemo, useState } from 'react';
import { avgWindFor } from '../../../../core/maps';
import type { BuildPlan, MapNotesFile, MapRecord } from '../../../../core/schemas';
import { ipcClient } from '../../lib/ipc-client';
import { AVG_WIND_TABLE } from '../../lib/wind-table';
import { usePlans } from '../../stores';
import { AdaptPlanDialog } from '../plans/AdaptPlanDialog';
import { Button } from '../ui/Button';
import { Provenance } from '../ui/Provenance';
import { Select } from '../ui/Select';
import { MinimapPanel } from './MinimapPanel';
import { WindTurbine } from './WindTurbine';

const round1 = (n: number): string => String(Math.round(n * 10) / 10);

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-zinc-800 py-1.5">
      <dt className="font-['Press_Start_2P'] text-[10px] uppercase text-zinc-400">{label}</dt>
      <dd className="text-right font-mono text-sm text-zinc-100" data-num="true">
        {children}
      </dd>
    </div>
  );
}

/** One map (06 §4.9): measured facts, wind from BAR's table, minimap + start positions, notes, adapt. */
export function MapDetail({ map, onAdapted }: { map: MapRecord; onAdapted: (plan: BuildPlan) => void }): React.JSX.Element {
  const { plans, activePlanId, savePlan } = usePlans();
  const [notes, setNotes] = useState<{ fileName: string; file: MapNotesFile | null } | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const avgWind = avgWindFor(map, AVG_WIND_TABLE);

  useEffect(() => {
    let active = true;
    void ipcClient.invoke('maps:notes', { fileName: map.fileName }).then((res) => {
      if (active) setNotes({ fileName: map.fileName, file: res.ok ? res.data : null });
    });
    return () => {
      active = false;
    };
  }, [map.fileName]);

  const options = useMemo(
    () => [...plans].sort((a, b) => a.factionId.localeCompare(b.factionId) || a.title.localeCompare(b.title)),
    [plans]
  );
  const chosen: BuildPlan | undefined = options.find((p) => p.id === (planId ?? activePlanId)) ?? options[0];
  const shownNotes = notes?.fileName === map.fileName ? (notes.file?.notes ?? []) : [];

  return (
    <section data-testid="map-detail" className="space-y-4 border-2 border-zinc-800 bg-[#0c0e18] p-4">
      <header className="space-y-1">
        <h2 className="font-['Press_Start_2P'] text-sm leading-relaxed text-white">{map.name}</h2>
        <p className="font-mono text-xs text-zinc-400">
          {map.scriptName}
          {map.author ? ` // by ${map.author}` : ''}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MinimapPanel map={map} />
        <div className="space-y-3">
          <WindTurbine avgWind={avgWind} faction={plans.find((p) => p.id === activePlanId)?.factionId} />
          <div className="flex items-center justify-between">
            <span className="font-['Press_Start_2P'] text-[10px] uppercase text-zinc-400">Map data</span>
            <Provenance kind="MEASURED" tooltip="From BAR's map data (api.bar-rts.com); average wind from BAR's wind table" />
          </div>
          <dl data-testid="map-facts">
            <Row label="Size">{`${map.sizeX} × ${map.sizeZ}`}</Row>
            <Row label="Wind">{`${map.wind.min}–${map.wind.max}`}</Row>
            <Row label="Avg wind">{avgWind === null ? 'unknown' : `${round1(avgWind)} (BAR table)`}</Row>
            <Row label="Wind risk">
              <span title="BAR's wind-risk table is not in the exported game data yet">unknown</span>
            </Row>
            <Row label="Tidal">{map.tidalStrength}</Row>
            <Row label="Max metal">{map.maxMetal}</Row>
            <Row label="Mex yield">
              {map.mexYield ? (
                <span className="inline-flex items-center gap-2">
                  {map.mexYield.value} <Provenance kind={map.mexYield.provenance === 'measured' ? 'MEASURED' : 'ESTIMATED'} />
                </span>
              ) : (
                'unknown'
              )}
            </Row>
            <Row label="Water">{map.hasWater ? 'yes' : 'no'}</Row>
            <Row label="Start spots">{map.startPositions.length}</Row>
            <Row label="Played">{map.popularity ? `#${map.popularity.rank} // ${map.popularity.replays30d} games in 30 days` : 'unknown'}</Row>
          </dl>
        </div>
      </div>

      <div className="space-y-1.5" data-testid="map-notes">
        <h3 className="font-['Press_Start_2P'] text-[10px] uppercase text-zinc-400">Notes</h3>
        {shownNotes.length === 0 ? (
          <p className="font-mono text-xs text-zinc-400">No curated notes for this map yet.</p>
        ) : (
          <ul className="space-y-1 font-mono text-sm text-zinc-200">
            {shownNotes.map((n, i) => (
              <li key={i}>
                {n.text} <span className="text-xs text-zinc-400">({n.source.kind}: {n.source.ref})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-zinc-800 pt-3">
        <label className="space-y-1">
          <span className="block font-['Press_Start_2P'] text-[10px] uppercase text-zinc-400">Plan to adapt</span>
          <Select
            data-testid="map-adapt-plan"
            value={chosen?.id ?? ''}
            onChange={(e) => setPlanId(e.target.value)}
            options={options.map((p) => ({ value: p.id, label: `${p.factionId.toUpperCase()} // ${p.title}` }))}
          />
        </label>
        <Button variant="primary" size="md" data-testid="btn-adapt-for-map" disabled={!chosen} onClick={() => setAdaptOpen(true)}>
          ADAPT A PLAN FOR THIS MAP
        </Button>
      </div>

      {chosen && (
        <AdaptPlanDialog
          open={adaptOpen}
          plan={chosen}
          map={map}
          onClose={() => setAdaptOpen(false)}
          onSave={async (adapted) => {
            const saved = await savePlan(adapted);
            if (saved) {
              setAdaptOpen(false);
              onAdapted(saved);
            }
          }}
        />
      )}
    </section>
  );
}
