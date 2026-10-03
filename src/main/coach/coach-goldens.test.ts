import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { loadRegistry, findDataDir } from '../registry/loader';
import { DemoSource, derivePlanFromDemo, readStateLines } from '../demo/demo-source';
import { simulate } from '../../core/sim/simulate';
import { StateDocSchema, WidgetEventSchema } from '../../core/schemas/protocol';
import { computeScenarioTimeline, makeBehindPlan, type CoachTimeline } from '../../core/coach/timeline';

describe('Coach Goldens on Real Fixtures (04 §3, T05.9)', () => {
  const dataDir = findDataDir();
  const sessionsDir = path.join(dataDir, 'fixtures', 'sessions');
  const goldenDir = path.resolve(process.cwd(), 'src/core/coach/__golden__');
  const registry = loadRegistry();

  const FIXTURES = [
    '2026-10-01-cortex-1v1-vs-ai-barr',
    '2026-10-01-cortex-1v1-vs-ai-barr-499s',
    '2026-10-02-armada-1v1-vs-ai-isthmus',
    '2026-10-02-cortex-1v1-vs-ai-altair'
  ];

  const mapInput = {
    windAvg: 12,
    windMin: 5,
    windMax: 20,
    tidalStrength: 0,
    mexYield: 1.5,
    mexYieldProvenance: 'estimated' as const
  };

  for (const fixtureId of FIXTURES) {
    it(`evaluates fixture ${fixtureId} identically to golden timeline`, () => {
      const goldenPath = path.join(goldenDir, `${fixtureId}.json`);
      expect(fs.existsSync(goldenPath)).toBe(true);

      const golden: CoachTimeline = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
      const fixtureDir = path.join(sessionsDir, fixtureId);
      const demoSource = new DemoSource({ fixtureDir, speed: 1 });
      const meta = demoSource.getMeta();
      const myTeam = meta.teams.find((t) => t.isMe) ?? meta.teams[0]!;

      const nominalPlan = derivePlanFromDemo(demoSource, registry);
      const behindPlan = makeBehindPlan(nominalPlan, 30);

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

      const eventLines = fs
        .readFileSync(path.join(fixtureDir, 'events.ndjson'), 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const events = eventLines.map((l) => WidgetEventSchema.parse(JSON.parse(l)));

      const nominal = computeScenarioTimeline({
        plan: nominalPlan,
        planSim: nominalSim,
        registry,
        states,
        events,
        teamId: myTeam.teamId
      });

      const behind = computeScenarioTimeline({
        plan: behindPlan,
        planSim: behindSim,
        registry,
        states,
        events,
        teamId: myTeam.teamId
      });

      // Assert nominal matches golden
      expect(nominal.finalAheadBehindSec).toBe(golden.nominal.finalAheadBehindSec);
      expect(nominal.alertIntervals).toEqual(golden.nominal.alertIntervals);
      expect(nominal.cues).toEqual(golden.nominal.cues);

      // Assert behind matches golden
      expect(behind.finalAheadBehindSec).toBe(golden.behind.finalAheadBehindSec);
      expect(behind.alertIntervals).toEqual(golden.behind.alertIntervals);
      expect(behind.cues).toEqual(golden.behind.cues);

      // Invariant: behind scenario is strictly 30s behind nominal
      expect(behind.finalAheadBehindSec).toBe(nominal.finalAheadBehindSec! - 30);

      // Invariant: behind scenario has BEHIND_PLAN alerts
      expect(behind.alertIntervals.some((i) => i.id === 'BEHIND_PLAN')).toBe(true);
    });
  }
});
