/**
 * T08.3: curated plan candidates from the H2 pro games.
 *
 *   npx tsx tools/curate.ts [--force]
 *
 * For every human Armada/Cortex team of every pro fixture (folder name contains `-pro-`), builds the
 * first 10 minutes as a plan (eventsToPlan), validates and simulates it, selects the candidates
 * (tools/lib/curate-select.ts) and writes data/builds/_candidates/*.json plus the H3 review sheet
 * data/builds/_review.md. Refuses to overwrite a review sheet that already holds owner decisions
 * unless --force.
 */
import fs from 'node:fs';
import path from 'node:path';
import { eventsToPlan } from '../src/core/plans/events-to-plan';
import { validatePlan } from '../src/core/plans/validate';
import { simulate } from '../src/core/sim/simulate';
import { avgWindFor, findMapByScriptName, stripMapVersionSuffix } from '../src/core/maps';
import { AvgWindFileSchema, MapsFileSchema, SessionMetaSchema } from '../src/core/schemas';
import type { BuildPlan } from '../src/core/schemas';
import type { WidgetEvent } from '../src/core/schemas/protocol';
import { getMapSlug } from './lib/fixture-repair';
import { enabledFactions, isAiPlayerName, registryLoader } from './lib/registry-for';
import { matchProReplay, playerSkill, type ProListReplay } from './lib/pro-match';
import { MATRIX_CELLS, cellKey, selectCandidates } from './lib/curate-select';
import { hasOwnerDecisions, renderReview, type ReviewCandidate } from './lib/curate-review';
import type { UnmatchedSession } from './import-fixtures';
import type { RawSessionFile } from './lib/fixture-repair';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const HORIZON_SEC = 600;
const TARGET = 20;
const MINIMUM = 16;

const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, 'utf-8'));

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Spectator/replay sessions recorded since the list was generated that match no list replay. */
function findUnmatched(rawDir: string, list: readonly ProListReplay[], since: string): UnmatchedSession[] | null {
  if (!fs.existsSync(rawDir)) return null;
  const sinceId = since.slice(0, 10).replace(/-/g, '');
  const out: UnmatchedSession[] = [];
  for (const f of fs.readdirSync(rawDir).filter((n) => n.startsWith('session-') && n.endsWith('.json')).sort()) {
    const s = readJson(path.join(rawDir, f)) as RawSessionFile;
    if (s.mode === 'player' || s.sessionId.slice(0, 8) < sinceId) continue;
    const teams = s.teams.map((t) => ({ playerName: t.playerName, factionId: t.factionId, allyTeamId: t.allyTeamId }));
    if (!matchProReplay({ mapScriptName: s.map.scriptName, teams }, list)) {
      out.push({ sessionId: s.sessionId, map: s.map.scriptName, players: teams.map((t) => t.playerName) });
    }
  }
  return out;
}

function main(): void {
  const force = process.argv.includes('--force');
  const fixturesDir = path.join(DATA, 'fixtures/sessions');
  const buildsDir = path.join(DATA, 'builds');
  const candidatesDir = path.join(buildsDir, '_candidates');
  const reviewPath = path.join(buildsDir, '_review.md');
  if (!force && fs.existsSync(reviewPath) && hasOwnerDecisions(fs.readFileSync(reviewPath, 'utf-8'))) {
    throw new Error(`${reviewPath} already holds owner decisions; rerun with --force to overwrite them`);
  }

  const listFile = readJson(path.join(ROOT, 'docs/plan/reports/h2-replay-list.json')) as { generatedAt: string; replays: ProListReplay[] };
  const maps = MapsFileSchema.parse(readJson(path.join(DATA, 'maps/maps.json'))).maps;
  const wind = AvgWindFileSchema.parse(readJson(path.join(DATA, 'wind/avg-wind.json'))).table;
  const enabled = enabledFactions(DATA);
  const registryFor = registryLoader(DATA);

  const all: ReviewCandidate[] = [];
  const plans = new Map<string, BuildPlan>();
  const proDirs = fs.readdirSync(fixturesDir).filter((n) => n.includes('-pro-')).sort();
  for (const dir of proDirs) {
    const meta = SessionMetaSchema.parse(readJson(path.join(fixturesDir, dir, 'meta.json')));
    const replay = listFile.replays.find((r) => r.id === meta.replay?.replayId);
    if (!replay) {
      console.warn(`[curate] ${dir}: no replay id in the H2 list, skipped`);
      continue;
    }
    const events = fs
      .readFileSync(path.join(fixturesDir, dir, 'events.ndjson'), 'utf-8')
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as WidgetEvent);
    const registry = registryFor(meta.gameVersion);
    const mapRecord = findMapByScriptName(maps, meta.mapScriptName);

    for (const team of meta.teams) {
      if (isAiPlayerName(team.playerName) || !team.factionId || !enabled.has(team.factionId)) continue;
      const plan = eventsToPlan({
        registry,
        events,
        teamId: team.teamId,
        horizonSec: HORIZON_SEC,
        teams: meta.teams,
        meta: {
          player: team.playerName,
          map: meta.mapScriptName,
          factionId: team.factionId,
          gameVersion: meta.gameVersion,
          skill: 'advanced',
          role: 'any',
          tags: ['pro'],
          source: {
            kind: 'curated',
            replayId: replay.id,
            player: team.playerName,
            playerRating: playerSkill(replay, team.playerName),
            map: meta.mapScriptName,
            playedAt: replay.date,
            gameVersion: meta.gameVersion,
            reviewedBy: '',
            reviewedAt: ''
          }
        }
      });
      const mapShort = stripMapVersionSuffix(meta.mapScriptName).replace(/_/g, ' ');
      plan.id = `pro-${plan.factionId}-${plan.opening}-${getMapSlug(meta.mapScriptName)}-${replay.id.slice(0, 6)}-t${team.teamId}`;
      plan.title = `${capital(plan.opening)} ${plan.energyStyle} // ${mapShort}`.slice(0, 60);
      plan.description = `First ${HORIZON_SEC / 60} minutes of ${team.playerName} (${capital(plan.factionId)}) in a ${replay.modeDetail} on ${meta.mapScriptName}, played ${replay.date}.`;

      const factoryStep = plan.steps.find((s) => s.unitId && registry.get(s.unitId)?.isFactory);
      const factoryDef = factoryStep?.unitId ? registry.get(factoryStep.unitId) : undefined;
      let sim: ReviewCandidate['sim'] = null;
      try {
        const r = simulate({
          registry,
          plan,
          map: {
            windAvg: mapRecord ? avgWindFor(mapRecord, wind) : null,
            windMin: mapRecord?.wind.min ?? 0,
            windMax: mapRecord?.wind.max ?? 0,
            tidalStrength: mapRecord?.tidalStrength ?? 0,
            mexYield: mapRecord?.mexYield?.value ?? 1.5,
            mexYieldProvenance: mapRecord?.mexYield?.provenance ?? 'estimated'
          },
          options: { horizon: HORIZON_SEC }
        });
        sim = { energyStallSec: r.totals.energyStallSec, metalStallSec: r.totals.metalStallSec, flags: r.flags.filter((f) => f !== 'horizonReached') };
      } catch (err) {
        console.warn(`[curate] ${plan.id}: simulation failed: ${String(err)}`);
      }
      const enemies = meta.teams.filter((t) => t.allyTeamId !== team.allyTeamId).map((t) => t.playerName);
      all.push({
        key: plan.id,
        player: team.playerName,
        skill: playerSkill(replay, team.playerName) ?? 0,
        faction: plan.factionId,
        opening: plan.opening,
        modeGroup: replay.mode === '1v1' ? '1v1' : 'team',
        steps: plan.steps.length,
        firstFactorySec: factoryStep?.targetTime ?? null,
        errors: validatePlan(plan, registry).errors.length,
        title: plan.title,
        modeDetail: replay.modeDetail,
        map: meta.mapScriptName,
        playedAt: replay.date,
        replayUrl: replay.url,
        opponents: enemies.length > 3 ? [...enemies.slice(0, 3), `+${enemies.length - 3} more`] : enemies,
        firstFactory: factoryStep && factoryDef ? { unitId: factoryDef.id, name: factoryDef.name, sec: factoryStep.targetTime ?? 0 } : null,
        sim
      });
      plans.set(plan.id, plan);
    }
  }

  // grouped by matrix cell for the review sheet, best player first
  const picked = selectCandidates(all, { target: TARGET, minimum: MINIMUM }).sort(
    (a, b) => MATRIX_CELLS.indexOf(cellKey(a)) - MATRIX_CELLS.indexOf(cellKey(b)) || b.skill - a.skill
  );
  fs.rmSync(candidatesDir, { recursive: true, force: true });
  fs.mkdirSync(candidatesDir, { recursive: true });
  for (const c of picked) fs.writeFileSync(path.join(candidatesDir, `${c.key}.json`), JSON.stringify(plans.get(c.key), null, 2) + '\n');
  fs.writeFileSync(
    reviewPath,
    renderReview({
      generatedAt: new Date().toISOString(),
      games: proDirs.length,
      teamsConsidered: all.length,
      candidates: picked,
      eligible: all,
      unmatched: findUnmatched(path.join(DATA, 'raw/h2'), listFile.replays, listFile.generatedAt)
    })
  );
  console.log(`[curate] ${all.length} players considered, ${picked.length} candidates written to ${path.relative(ROOT, candidatesDir)}`);
}

main();
