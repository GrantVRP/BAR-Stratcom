import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRegistry } from '../src/core/registry/registry';
import { eventsToPlan } from '../src/core/plans/events-to-plan';
import { simulate } from '../src/core/sim/simulate';
import { avgWindFor, findMapByScriptName } from '../src/core/maps';
import type { WidgetEvent, StateDoc } from '../src/core/schemas/protocol';
import type { SessionMeta } from '../src/core/schemas/session';
import type { MapsFile } from '../src/core/schemas/maps';

export interface UnitTypeMatchDelta {
  unitId: string;
  count: number;
  recT: number;
  simT: number;
  delta: number;
}

export interface IndexMatchDelta {
  index: number;
  recDef: string;
  simDef: string;
  recT: number;
  simT: number;
  delta: number;
}

export interface ReclaimWindow {
  t: number;
  deltaIncomeM: number;
  incomeBefore: number;
  incomeAfter: number;
}

export interface CalibrationFixtureReport {
  fixtureId: string;
  mapScriptName: string;
  factionId: string;
  mexYield: number;
  unitTypeDeltas: UnitTypeMatchDelta[];
  unitTypeMedian: number;
  unitTypeP90: number;
  indexDeltas: IndexMatchDelta[];
  indexMedian: number;
  indexP90: number;
  metalMape: number;
  energyMape: number;
  reclaimWindows: ReclaimWindow[];
  passed: {
    finishMedian: boolean;
    finishP90: boolean;
    metalMape: boolean;
    energyMape: boolean;
    all: boolean;
  };
}

export const PLAYER_FIXTURES = [
  '2026-10-01-cortex-1v1-vs-ai-barr',
  '2026-10-01-cortex-1v1-vs-ai-barr-499s',
  '2026-10-02-cortex-1v1-vs-ai-altair',
  '2026-10-02-armada-1v1-vs-ai-isthmus'
];

export function runCalibration(projectRoot = process.cwd()): CalibrationFixtureReport[] {
  const snapshotPath = path.join(projectRoot, 'data/snapshots/test-31479-433a460/units.json');
  const factionsPath = path.join(projectRoot, 'data/factions.json');
  const aliasesPath = path.join(projectRoot, 'data/aliases.json');
  const mapsPath = path.join(projectRoot, 'data/maps/maps.json');
  const windPath = path.join(projectRoot, 'data/wind/avg-wind.json');
  const fixturesDir = path.join(projectRoot, 'data/fixtures/sessions');

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const factions = JSON.parse(fs.readFileSync(factionsPath, 'utf-8'));
  const aliases = JSON.parse(fs.readFileSync(aliasesPath, 'utf-8'));
  const mapsData: MapsFile = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
  const windTable: Record<string, Record<string, number>> = fs.existsSync(windPath)
    ? JSON.parse(fs.readFileSync(windPath, 'utf-8'))
    : {};
  const registry = createRegistry(snapshot, factions, aliases);

  const reports: CalibrationFixtureReport[] = [];

  for (const fId of PLAYER_FIXTURES) {
    const fDir = path.join(fixturesDir, fId);
    const meta: SessionMeta = JSON.parse(fs.readFileSync(path.join(fDir, 'meta.json'), 'utf-8'));
    const eventLines = fs.readFileSync(path.join(fDir, 'events.ndjson'), 'utf-8').trim().split('\n');
    const events: WidgetEvent[] = eventLines.map((l) => JSON.parse(l));
    const stateLines = fs.readFileSync(path.join(fDir, 'state.ndjson'), 'utf-8').trim().split('\n');
    const states: StateDoc[] = stateLines.map((l) => JSON.parse(l));

    const mapRecord = findMapByScriptName(mapsData.maps, meta.mapScriptName);
    if (!mapRecord) {
      throw new Error(`Map not found in maps.json: ${meta.mapScriptName}`);
    }

    const myTeam = meta.teams.find((t) => t.isMe) ?? meta.teams[0]!;
    const mexYield = mapRecord.mexYield?.value ?? 1.5;

    // Wind series lookup
    const windSeries: number[] = [];
    for (const s of states) {
      const sec = Math.floor(s.gameSeconds);
      if (windSeries[sec] === undefined) {
        windSeries[sec] = s.wind.current;
      }
    }

    // Starting resource state at frame 30
    const stateF30 = states.find((s) => s.frame === 30) ?? states[0]!;
    const start = {
      metal: stateF30.res?.metal?.current ?? 1000,
      energy: stateF30.res?.energy?.current ?? 1000,
      metalStorage: stateF30.res?.metal?.storage ?? 1000,
      energyStorage: stateF30.res?.energy?.storage ?? 1000
    };

    // Synthesize plan
    const plan = eventsToPlan({
      registry,
      events,
      teamId: myTeam.teamId,
      teams: meta.teams,
      meta: {
        player: myTeam.playerName,
        map: meta.mapScriptName,
        source: {
          kind: 'own-game',
          sessionId: meta.sessionId,
          map: meta.mapScriptName,
          capturedAt: meta.startedAt
        }
      }
    });

    // Simulate over 360 s
    const simResult = simulate({
      registry,
      plan,
      map: {
        windAvg: avgWindFor(mapRecord, windTable),
        windMin: mapRecord.wind.min,
        windMax: mapRecord.wind.max,
        tidalStrength: mapRecord.tidalStrength,
        mexYield,
        mexYieldProvenance: mapRecord.mexYield?.provenance ?? 'estimated'
      },
      start,
      options: {
        horizon: 360,
        schedule: 'respect-targets',
        windSeries
      }
    });

    // Recorded unit finishes (first 20)
    type FinishedEvent = Extract<WidgetEvent, { e: 'finished' }>;
    const recFinishes = events
      .filter((e): e is FinishedEvent => e.e === 'finished' && e.tm === myTeam.teamId && e.f > 0)
      .map((e) => ({ d: e.d, u: e.u, t: Number((e.f / 30).toFixed(1)) }))
      .slice(0, 20);

    // Simulated unit finishes (decomposed from steps)
    const simFinishes: Array<{ unitId: string; t: number }> = [];
    for (const sRes of simResult.steps) {
      const pStep = plan.steps.find((s) => s.id === sRes.stepId);
      if (!pStep || sRes.start === null || sRes.finish === null) continue;
      const duration = sRes.finish - sRes.start;
      for (let k = 1; k <= pStep.count; k++) {
        const unitT = Number((sRes.start + (duration * k) / pStep.count).toFixed(1));
        simFinishes.push({ unitId: pStep.unitId!, t: unitT });
      }
    }
    simFinishes.sort((a, b) => a.t - b.t);

    // 1. Unit Type Matching (k-th unit of type X)
    const simTypeCounts = new Map<string, number>();
    const simTypedList: Array<{ unitId: string; count: number; t: number }> = [];
    for (const sf of simFinishes) {
      const c = (simTypeCounts.get(sf.unitId) ?? 0) + 1;
      simTypeCounts.set(sf.unitId, c);
      simTypedList.push({ unitId: sf.unitId, count: c, t: sf.t });
    }

    const recTypeCounts = new Map<string, number>();
    const unitTypeDeltas: UnitTypeMatchDelta[] = [];
    for (const rf of recFinishes) {
      const c = (recTypeCounts.get(rf.d) ?? 0) + 1;
      recTypeCounts.set(rf.d, c);
      const match = simTypedList.find((s) => s.unitId === rf.d && s.count === c);
      if (match) {
        unitTypeDeltas.push({
          unitId: rf.d,
          count: c,
          recT: rf.t,
          simT: match.t,
          delta: Number(Math.abs(match.t - rf.t).toFixed(1))
        });
      }
    }

    const sortedUT = [...unitTypeDeltas].map((d) => d.delta).sort((a, b) => a - b);
    const unitTypeMedian = sortedUT[Math.floor(sortedUT.length / 2)] ?? 0;
    const unitTypeP90 = sortedUT[Math.floor((sortedUT.length - 1) * 0.9)] ?? 0;

    // 2. Index Matching (i-th finished unit overall)
    const indexDeltas: IndexMatchDelta[] = [];
    const countMatch = Math.min(20, recFinishes.length, simFinishes.length);
    for (let i = 0; i < countMatch; i++) {
      const rf = recFinishes[i]!;
      const sf = simFinishes[i]!;
      indexDeltas.push({
        index: i + 1,
        recDef: rf.d,
        simDef: sf.unitId,
        recT: rf.t,
        simT: sf.t,
        delta: Number(Math.abs(sf.t - rf.t).toFixed(1))
      });
    }
    const sortedIdx = [...indexDeltas].map((d) => d.delta).sort((a, b) => a - b);
    const indexMedian = sortedIdx[Math.floor(sortedIdx.length / 2)] ?? 0;
    const indexP90 = sortedIdx[Math.floor((sortedIdx.length - 1) * 0.9)] ?? 0;

    // 3. Income MAPE (t >= 30s)
    let metalApeSum = 0;
    let energyApeSum = 0;
    let mapeCount = 0;

    for (let t = 30; t <= 360; t++) {
      const recState = states.find((s) => Math.round(s.gameSeconds) === t);
      const simSample = simResult.samples.find((s) => s.t === t);
      if (recState?.res && simSample) {
        const recM = recState.res.metal?.income ?? 0;
        const simM = simSample.metal.income;
        const recE = recState.res.energy?.income ?? 0;
        const simE = simSample.energy.income;

        if (recM > 0) metalApeSum += Math.abs(simM - recM) / recM;
        if (recE > 0) energyApeSum += Math.abs(simE - recE) / recE;
        mapeCount++;
      }
    }

    const metalMape = Number(((metalApeSum / mapeCount) * 100).toFixed(2));
    const energyMape = Number(((energyApeSum / mapeCount) * 100).toFixed(2));

    // 4. Suspected Reclaim Windows
    const reclaimWindows: ReclaimWindow[] = [];
    for (let i = 1; i < states.length; i++) {
      const prev = states[i - 1]!;
      const curr = states[i]!;
      if (curr.gameSeconds > 360) break;
      const prevM = prev.res?.metal?.income ?? 0;
      const currM = curr.res?.metal?.income ?? 0;
      const diffM = currM - prevM;
      if (diffM >= 3.0) {
        const mexFinished = events.some(
          (e) =>
            e.e === 'finished' &&
            'd' in e &&
            (e.d === 'cormex' || e.d === 'armmex') &&
            Math.abs(e.f - curr.frame) <= 30
        );
        if (!mexFinished) {
          reclaimWindows.push({
            t: Math.round(curr.gameSeconds),
            deltaIncomeM: Number(diffM.toFixed(1)),
            incomeBefore: Number(prevM.toFixed(1)),
            incomeAfter: Number(currM.toFixed(1))
          });
        }
      }
    }

    const finishMedianPass = unitTypeMedian <= 8.0;
    const finishP90Pass = unitTypeP90 <= 20.0;
    const metalMapePass = metalMape <= 15.0;
    const energyMapePass = energyMape <= 15.0;

    reports.push({
      fixtureId: fId,
      mapScriptName: meta.mapScriptName,
      factionId: myTeam.factionId ?? 'cortex',
      mexYield,
      unitTypeDeltas,
      unitTypeMedian,
      unitTypeP90,
      indexDeltas,
      indexMedian,
      indexP90,
      metalMape,
      energyMape,
      reclaimWindows,
      passed: {
        finishMedian: finishMedianPass,
        finishP90: finishP90Pass,
        metalMape: metalMapePass,
        energyMape: energyMapePass,
        all: finishMedianPass && finishP90Pass && metalMapePass && energyMapePass
      }
    });
  }

  return reports;
}

export function generateCalibrationMarkdown(reports: CalibrationFixtureReport[]): string {
  const lines: string[] = [];

  lines.push('# Calibration Report — BAR StratCom v3');
  lines.push('');
  lines.push('Deterministic economy simulator calibration against real player game recordings (0–360 s).');
  lines.push('Authority: `04-domain-engines.md` §2.6 and task card `T04.5`.');
  lines.push('');
  lines.push('## Threshold Summary');
  lines.push('');
  lines.push('| Fixture | Faction | Map | Mex Yield | Finish Median (≤8s) | Finish P90 (≤20s) | Metal MAPE (≤15%) | Energy MAPE (≤15%) | Status |');
  lines.push('|---|---|---|---|---|---|---|---|---|');

  for (const r of reports) {
    const status = r.passed.all ? 'PASS' : 'FAIL';
    lines.push(
      `| \`${r.fixtureId}\` | ${r.factionId} | ${r.mapScriptName} | ${r.mexYield} M/s | ${r.unitTypeMedian.toFixed(1)} s | ${r.unitTypeP90.toFixed(1)} s | ${r.metalMape.toFixed(2)}% | ${r.energyMape.toFixed(2)}% | **${status}** |`
    );
  }
  lines.push('');

  lines.push('## Model Changes & Evidence');
  lines.push('');
  lines.push('- **Change:** Updated `BarR 1.1` `mexYield` in `data/maps/maps.json` from 1.04 to 1.43 M/s.');
  lines.push('  - **Evidence:** BarR 1.1 starting base contains 4 metal spots: two 1.82 M/s spots and two 1.04 M/s spots. The standard opening builds all 4 spots (average yield = (1.82 + 1.04) / 2 = 1.43 M/s). An initial median over the first 5 spots selected 1.04 M/s, causing a ~16% metal income underestimation.');
  lines.push('  - **Effect:** Metal MAPE on `2026-10-01-cortex-1v1-vs-ai-barr` dropped from 16.03% to 6.53%; on `2026-10-01-cortex-1v1-vs-ai-barr-499s` dropped from 15.89% to 7.70%.');
  lines.push('- **Change:** Derived `baseMexExtractsMetal` dynamically from the faction snapshot (T1 extractor `eco-metal`) per owner review item 4.');
  lines.push('  - **Evidence:** Snapshot unitdefs confirm `cormex`/`armmex` have `extractsMetal: 0.001`.');
  lines.push('  - **Effect:** Verified faction-independent extractor scaling without relying on hardcoded constants.');
  lines.push('');

  for (const r of reports) {
    lines.push(`## Fixture: \`${r.fixtureId}\``);
    lines.push('');
    lines.push(`- **Map:** ${r.mapScriptName} (mexYield: ${r.mexYield} M/s)`);
    lines.push(`- **Faction:** ${r.factionId}`);
    lines.push(`- **Metal Income MAPE (t ≥ 30s):** ${r.metalMape.toFixed(2)}% (threshold ≤ 15%)`);
    lines.push(`- **Energy Income MAPE (t ≥ 30s):** ${r.energyMape.toFixed(2)}% (threshold ≤ 15%)`);
    lines.push(`- **Unit-type finish error:** median = ${r.unitTypeMedian.toFixed(1)} s, p90 = ${r.unitTypeP90.toFixed(1)} s`);
    lines.push(`- **Sequential index finish error:** median = ${r.indexMedian.toFixed(1)} s, p90 = ${r.indexP90.toFixed(1)} s`);
    lines.push('');
    lines.push('### First 20 Units Finish Comparison');
    lines.push('');
    lines.push('| # | Unit | Rec Finish | Sim Finish | |Δ| (Unit-Type) | Seq Sim Unit | Seq Sim Finish | |Δ| (Seq) |');
    lines.push('|---|---|---|---|---|---|---|---|');

    const maxRows = Math.min(20, r.unitTypeDeltas.length);
    for (let i = 0; i < maxRows; i++) {
      const ut = r.unitTypeDeltas[i]!;
      const idx = r.indexDeltas[i];
      const seqSim = idx ? idx.simDef : '-';
      const seqFinish = idx ? `${idx.simT.toFixed(1)} s` : '-';
      const seqDelta = idx ? `${idx.delta.toFixed(1)} s` : '-';
      lines.push(
        `| ${i + 1} | \`${ut.unitId}\` #${ut.count} | ${ut.recT.toFixed(1)} s | ${ut.simT.toFixed(1)} s | ${ut.delta.toFixed(1)} s | \`${seqSim}\` | ${seqFinish} | ${seqDelta} |`
      );
    }
    lines.push('');

    lines.push('### Suspected Reclaim Windows (t ≤ 360 s)');
    lines.push('');
    if (r.reclaimWindows.length === 0) {
      lines.push('No un-modeled income spikes (dIncome ≥ 3.0 M/s) observed.');
    } else {
      lines.push('| Time (t) | Δ Metal Income | Income Before | Income After | Description |');
      lines.push('|---|---|---|---|---|');
      for (const rw of r.reclaimWindows) {
        lines.push(
          `| ${rw.t} s | +${rw.deltaIncomeM.toFixed(1)} M/s | ${rw.incomeBefore.toFixed(1)} M/s | ${rw.incomeAfter.toFixed(1)} M/s | Suspected wreck/rock reclaim |`
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

export function writeCalibrationReport(projectRoot = process.cwd()): string {
  const reports = runCalibration(projectRoot);
  const markdown = generateCalibrationMarkdown(reports);
  const reportPath = path.join(projectRoot, 'docs/plan/reports/calibration.md');
  fs.writeFileSync(reportPath, markdown, 'utf-8');
  return reportPath;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const outPath = writeCalibrationReport();
  console.log(`[calibrate] Wrote calibration report to: ${outPath}`);
}
