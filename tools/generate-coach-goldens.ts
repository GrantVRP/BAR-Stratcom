import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRegistry } from '../src/core/registry';
import { eventsToPlan } from '../src/core/plans/events-to-plan';
import { readStateLines } from './lib/state-reader';
import { simulate } from '../src/core/sim/simulate';
import { StateDocSchema, WidgetEventSchema } from '../src/core/schemas/protocol';
import {
  computeScenarioTimeline,
  makeBehindPlan,
  type CoachTimeline
} from '../src/core/coach/timeline';

const PLAYER_FIXTURES = [
  '2026-10-01-cortex-1v1-vs-ai-barr',
  '2026-10-01-cortex-1v1-vs-ai-barr-499s',
  '2026-10-02-armada-1v1-vs-ai-isthmus',
  '2026-10-02-cortex-1v1-vs-ai-altair'
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function main() {
  const rootDir = process.cwd();
  const sessionsDir = path.join(rootDir, 'data', 'fixtures', 'sessions');
  const goldenDir = path.resolve(rootDir, 'src/core/coach/__golden__');
  if (!fs.existsSync(goldenDir)) {
    fs.mkdirSync(goldenDir, { recursive: true });
  }

  const snapshot = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data/snapshots/test-31479-433a460/units.json'), 'utf-8')
  );
  const factions = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/factions.json'), 'utf-8'));
  const aliases = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/aliases.json'), 'utf-8'));
  const registry = createRegistry(snapshot, factions, aliases);

  const reportSections: string[] = [
    '# Coach Goldens Report — BAR StratCom v3',
    '',
    'Golden coach evaluation timelines on real player fixtures (04 §3, T05.9).',
    'Evaluated with (a) nominal plan (`eventsToPlan`) and (b) behind plan (every `targetTime` 30 s earlier).',
    'Sanity check target for owner checkpoint **H2**.',
    '',
    '## Summary Overview',
    '',
    '| Fixture | Faction | Map | Duration | Nominal AB | Behind AB | Nominal Alerts | Behind Alerts | Nominal Cues | Behind Cues |',
    '|---|---|---|---|---|---|---|---|---|---|'
  ];

  for (const fixtureId of PLAYER_FIXTURES) {
    const fixtureDir = path.join(sessionsDir, fixtureId);
    const metaRaw = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'meta.json'), 'utf-8'));
    const myTeam = metaRaw.teams.find((t: { isMe?: boolean }) => t.isMe) ?? metaRaw.teams[0];

    const eventLines = fs
      .readFileSync(path.join(fixtureDir, 'events.ndjson'), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const events = eventLines.map((l) => WidgetEventSchema.parse(JSON.parse(l)));

    const nominalPlan = eventsToPlan({
      registry,
      events,
      teamId: myTeam.teamId,
      teams: metaRaw.teams,
      meta: {
        id: `plan-demo-${metaRaw.sessionId}`,
        player: myTeam.playerName,
        map: metaRaw.mapScriptName,
        factionId: myTeam.factionId ?? 'armada',
        gameVersion: metaRaw.gameVersion,
        source: { kind: 'manual', createdAt: metaRaw.startedAt }
      }
    });
    const behindPlan = makeBehindPlan(nominalPlan, 30);

    const mapInput = {
      windAvg: 12,
      windMin: 5,
      windMax: 20,
      tidalStrength: 0,
      mexYield: 1.5,
      mexYieldProvenance: 'estimated' as const
    };

    const nominalSim = simulate({
      plan: nominalPlan,
      registry,
      map: mapInput,
      options: { schedule: 'respect-targets' }
    });

    const behindSim = simulate({
      plan: behindPlan,
      registry,
      map: mapInput,
      options: { schedule: 'respect-targets' }
    });

    const stateLines = readStateLines(fixtureDir);
    const states = stateLines.map((l) => StateDocSchema.parse(JSON.parse(l)));
    states.sort((a, b) => a.frame - b.frame);

    const nominalTimeline = computeScenarioTimeline({
      plan: nominalPlan,
      planSim: nominalSim,
      registry,
      states,
      events,
      teamId: myTeam.teamId
    });

    const behindTimeline = computeScenarioTimeline({
      plan: behindPlan,
      planSim: behindSim,
      registry,
      states,
      events,
      teamId: myTeam.teamId
    });

    const fullTimeline: CoachTimeline = {
      fixtureId,
      nominal: nominalTimeline,
      behind: behindTimeline
    };

    // Save golden JSON
    const goldenPath = path.join(goldenDir, `${fixtureId}.json`);
    fs.writeFileSync(goldenPath, JSON.stringify(fullTimeline, null, 2) + '\n', 'utf8');

    // Add summary row
    const durationStr = formatTime(metaRaw.durationSec);
    reportSections.push(
      `| \`${fixtureId}\` | ${myTeam.factionId ?? 'unknown'} | ${metaRaw.mapScriptName} | ${durationStr} | ${nominalTimeline.finalAheadBehindSec ?? 0}s | ${behindTimeline.finalAheadBehindSec ?? 0}s | ${nominalTimeline.alertIntervals.length} | ${behindTimeline.alertIntervals.length} | ${nominalTimeline.cues.length} | ${behindTimeline.cues.length} |`
    );
  }

  // Detailed fixture breakdowns
  reportSections.push('', '---', '');

  for (const fixtureId of PLAYER_FIXTURES) {
    const goldenPath = path.join(goldenDir, `${fixtureId}.json`);
    const timeline: CoachTimeline = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
    const fixtureDir = path.join(sessionsDir, fixtureId);
    const metaRaw = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'meta.json'), 'utf8'));
    const myTeam = metaRaw.teams.find((t: { isMe?: boolean }) => t.isMe) ?? metaRaw.teams[0];

    reportSections.push(`## Fixture: \`${fixtureId}\``, '');
    reportSections.push(`- **Map:** ${metaRaw.mapScriptName}`);
    reportSections.push(`- **Faction:** ${myTeam?.factionId ?? 'unknown'}`);
    reportSections.push(`- **Duration:** ${formatTime(metaRaw.durationSec)} (${Math.round(metaRaw.durationSec)} s)`);
    reportSections.push(
      `- **Nominal Scenario:** Final Ahead/Behind = \`${timeline.nominal.finalAheadBehindSec}s\`, ${timeline.nominal.alertIntervals.length} alert intervals, ${timeline.nominal.cues.length} cues`
    );
    reportSections.push(
      `- **Behind Scenario (30s earlier):** Final Ahead/Behind = \`${timeline.behind.finalAheadBehindSec}s\`, ${timeline.behind.alertIntervals.length} alert intervals, ${timeline.behind.cues.length} cues`
    );
    reportSections.push('', '### Nominal Alert Intervals', '');

    if (timeline.nominal.alertIntervals.length === 0) {
      reportSections.push('*(No alerts fired in nominal scenario)*');
    } else {
      reportSections.push('| Alert ID | Window | Duration | Description |');
      reportSections.push('|---|---|---|---|');
      for (const interval of timeline.nominal.alertIntervals) {
        const win = `${formatTime(interval.startSec)} – ${formatTime(interval.endSec)}`;
        const dur = `${interval.endSec - interval.startSec}s`;
        reportSections.push(`| \`${interval.id}\` | ${win} | ${dur} | Alert active |`);
      }
    }
    reportSections.push('', '### Behind Scenario Alert Intervals (Key Delta: BEHIND_PLAN)', '');

    const behindAlerts = timeline.behind.alertIntervals.filter((i) => i.id === 'BEHIND_PLAN');
    if (behindAlerts.length === 0) {
      reportSections.push('*(No BEHIND_PLAN alerts fired)*');
    } else {
      reportSections.push('| Alert ID | Window | Duration | Description |');
      reportSections.push('|---|---|---|---|');
      for (const interval of behindAlerts) {
        const win = `${formatTime(interval.startSec)} – ${formatTime(interval.endSec)}`;
        const dur = `${interval.endSec - interval.startSec}s`;
        reportSections.push(`| \`${interval.id}\` | ${win} | ${dur} | Pushed behind by shifted targets |`);
      }
    }
    reportSections.push('');
  }

  reportSections.push('## Sanity-Check Checklist for Owner (H2)', '');
  reportSections.push('- [ ] **Alert plausibility**: verify stall/float alerts match player recollection of economy stress.');
  reportSections.push('- [ ] **Behind plan reactivity**: verify BEHIND_PLAN triggers when construction falls behind the accelerated schedule.');
  reportSections.push('- [ ] **Audio rate limiting**: verify cues obey spacing without spamming.');
  reportSections.push('');

  const reportPath = path.resolve(rootDir, 'docs/plan/reports/coach-goldens.md');
  fs.writeFileSync(reportPath, reportSections.join('\n') + '\n', 'utf8');
}

main().catch(console.error);
