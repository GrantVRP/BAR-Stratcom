import * as fs from 'fs';
import * as path from 'path';
import type { SessionMeta } from '../../core/schemas/session';
import { SessionReportSchema, type SessionReport } from '../../core/schemas/report';
import { analyze } from '../../core/analysis/analyze';
import { loadRegistry } from '../registry/loader';
import { defaultPlanStore } from '../plans/store';
import { defaultSettingsStore } from '../settings/store';
import { simulate } from '../../core/sim/simulate';
import { readStateLines, readEventsLines } from './store';
import type { Registry } from '../../core/registry';
import type { PlanStore } from '../plans/store';
import type { SettingsStore } from '../settings/store';

export interface ReportGeneratorOptions {
  sessionDir: string;
  meta: SessionMeta;
  planStore?: PlanStore;
  settingsStore?: SettingsStore;
  registry?: Registry;
}

/**
 * Generates and atomically persists report.json for a finalized session (03 §9, 04 §4, T07.2).
 */
export async function generateReportForSession(
  options: ReportGeneratorOptions
): Promise<SessionReport | null> {
  const { sessionDir, meta } = options;

  try {
    const rawStateLines = readStateLines(sessionDir);
    const states = rawStateLines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const rawEventLines = readEventsLines(sessionDir);
    const events = rawEventLines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const registry = options.registry ?? loadRegistry();
    const settingsStore = options.settingsStore ?? defaultSettingsStore;
    const profile = settingsStore.getSettings().profile ?? 'intermediate';

    let plan = null;
    let planSim = null;

    const planId = meta.planId;
    if (planId) {
      const planStore = options.planStore ?? defaultPlanStore;
      plan = planStore.get(planId) ?? null;
      if (plan) {
        planSim = simulate({
          plan,
          registry,
          map: {
            windAvg: 12,
            windMin: 5,
            windMax: 20,
            tidalStrength: 0,
            mexYield: 1.5,
            mexYieldProvenance: 'estimated'
          },
          options: { schedule: 'respect-targets' }
        });
      }
    }

    const report = analyze(
      {
        meta,
        states,
        events,
        registry
      },
      plan,
      planSim,
      null, // benchmark null until T08.4
      profile
    );

    const validated = SessionReportSchema.parse(report);

    // Atomically write report.json
    const reportFile = path.join(sessionDir, 'report.json');
    const tmpFile = path.join(sessionDir, 'report.json.tmp');
    await fs.promises.writeFile(tmpFile, JSON.stringify(validated, null, 2), 'utf8');
    await fs.promises.rename(tmpFile, reportFile);

    return validated;
  } catch (err) {
    console.warn(`Failed to generate report for session ${meta.sessionId}:`, err);
    return null;
  }
}
