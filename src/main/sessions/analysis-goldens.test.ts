import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { analyze } from '../../core/analysis/analyze';
import { loadRegistry, findDataDir } from '../registry/loader';
import { DemoSource, readStateLines } from '../demo/demo-source';
import { simulate } from '../../core/sim/simulate';
import { StateDocSchema } from '../../core/schemas/protocol';
import { BuildPlanSchema } from '../../core/schemas/plans';
import { SessionReportSchema, type SessionReport } from '../../core/schemas/report';

describe('Analysis Goldens on Real Fixtures', () => {
  const dataDir = findDataDir();
  const sessionsDir = path.join(dataDir, 'fixtures', 'sessions');
  const samplesDir = path.join(dataDir, 'builds', 'samples');
  const goldenDir = path.resolve(process.cwd(), 'src/core/analysis/__golden__');
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
    it(`evaluates fixture ${fixtureId} identically to golden report`, () => {
      const goldenPath = path.join(goldenDir, `report-${fixtureId}.json`);
      expect(fs.existsSync(goldenPath)).toBe(true);
      const golden: SessionReport = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

      const fixtureDir = path.join(sessionsDir, fixtureId);
      const demoSource = new DemoSource({ fixtureDir, speed: 1 });
      const meta = demoSource.getMeta();

      const planPath = path.join(samplesDir, `${fixtureId}.json`);
      expect(fs.existsSync(planPath)).toBe(true);
      const plan = BuildPlanSchema.parse(JSON.parse(fs.readFileSync(planPath, 'utf8')));

      const planSim = simulate({
        plan,
        registry,
        map: mapInput,
        options: { schedule: 'respect-targets' }
      });

      const rawStateLines = readStateLines(fixtureDir);
      const states = rawStateLines.map((l) => StateDocSchema.parse(JSON.parse(l)));
      const events = demoSource.getEvents();

      const report = analyze(
        {
          meta,
          states,
          events,
          registry
        },
        plan,
        planSim,
        null,
        'intermediate'
      );

      // Verify schema compliance and golden match
      const validated = SessionReportSchema.parse(report);
      expect(validated).toEqual(golden);
    });
  }
});
