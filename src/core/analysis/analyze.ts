import type { BuildPlan } from '../schemas/plans';
import type { SimResult, SimStepResult } from '../sim/types';
import type { BenchmarkFile } from '../schemas/benchmark';
import { percentileAt } from '../benchmarks';
import type { Profile } from '../schemas/common';
import {
  SessionReportSchema,
  type SessionReport,
  type SessionReportStep,
  type SessionReportBenchmark
} from '../schemas/report';
import { DEFAULT_PROFILES } from '../coach/profiles';
import { createFinishedLedger, applyEventsToLedger } from '../coach/ledger';
import { DEFAULT_ADHERENCE_TOLERANCE_SEC } from './constants';
import { computeMetrics } from './metrics';
import { computeGrade } from './grade';
import { evaluateTips } from './tips';
import { suggestProfile, type ReportCandidate } from './suggest';
import type { AnalysisSessionInput } from './types';

function isFactoryFallback(defId: string): boolean {
  const lower = defId.toLowerCase();
  return (
    lower.includes('lab') ||
    lower.includes('vp') ||
    lower.includes('ap') ||
    lower.includes('hp') ||
    lower.includes('plat')
  );
}

/**
 * Post-match analysis engine (04 §4, T07.2, T07.3).
 * Pure domain function computing metrics, adherence, tips, grade, benchmark percentiles, and profile suggestions.
 */
export function analyze(
  session: AnalysisSessionInput,
  plan: BuildPlan | null,
  planSim: SimResult | null,
  benchmark: BenchmarkFile | null,
  profile: Profile = 'intermediate',
  options: { pastReports?: ReportCandidate[] } = {}
): SessionReport {
  const myTeam = session.meta.teams.find((t) => t.isMe) ?? session.meta.teams[0];
  const myTeamId = myTeam?.teamId ?? 0;
  const factionId = myTeam?.factionId ?? null;

  // 1. Compute summary metrics
  const metrics = computeMetrics({
    meta: session.meta,
    states: session.states,
    events: session.events,
    registry: session.registry,
    teamId: myTeamId
  });

  // 2. Evaluate plan steps and adherence
  const reportSteps: SessionReportStep[] = [];
  let adherence = 1.0;
  let plannedFirstFactory: number | null = null;

  if (plan && planSim) {
    const ledger = applyEventsToLedger(createFinishedLedger(), session.events, {
      teamId: myTeamId
    });

    const toleranceSec =
      DEFAULT_PROFILES[profile]?.tolerances.adherenceSec ?? DEFAULT_ADHERENCE_TOLERANCE_SEC;

    const simStepMap = new Map<string, SimStepResult>();
    for (const s of planSim.steps) {
      simStepMap.set(s.stepId, s);
    }

    const cumulativeCount: Record<string, number> = {};
    let buildStepsCount = 0;
    let onTimeBuildStepsCount = 0;

    for (const step of plan.steps) {
      const sim = simStepMap.get(step.id);
      const plannedFinish = sim?.finish ?? step.targetTime ?? 0;

      if (plannedFirstFactory === null && step.unitId) {
        const u = session.registry?.get(step.unitId);
        if (u?.isFactory || isFactoryFallback(step.unitId)) {
          plannedFirstFactory = plannedFinish;
        }
      }

      if (step.action === 'build' && step.unitId) {
        buildStepsCount++;
        const required = (cumulativeCount[step.unitId] ?? 0) + step.count;
        cumulativeCount[step.unitId] = required;

        const finishes = ledger[step.unitId] ?? [];
        const lastFinish = finishes[required - 1];
        const actualFinish =
          finishes.length >= required && lastFinish !== undefined
            ? Math.round(lastFinish * 10) / 10
            : null;
        const deltaSec =
          actualFinish !== null ? Math.round(actualFinish - plannedFinish) || 0 : null;

        reportSteps.push({
          stepId: step.id,
          plannedFinish,
          actualFinish,
          deltaSec
        });

        if (actualFinish !== null && actualFinish <= plannedFinish + toleranceSec) {
          onTimeBuildStepsCount++;
        }
      } else {
        reportSteps.push({
          stepId: step.id,
          plannedFinish,
          actualFinish: null,
          deltaSec: null
        });
      }
    }

    adherence = buildStepsCount > 0 ? onTimeBuildStepsCount / buildStepsCount : 1.0;
    adherence = Math.round(adherence * 1000) / 1000;
  }

  // 3. Benchmark percentiles
  let benchmarkResult: SessionReportBenchmark | null = null;
  if (benchmark) {
    const at300 = metrics.incomeAt['300'];
    const at600 = metrics.incomeAt['600'];
    const pMetal300 = at300 ? percentileAt(benchmark, 'metalIncome', 300, at300.metal) : null;
    const pMetal600 = at600 ? percentileAt(benchmark, 'metalIncome', 600, at600.metal) : null;

    benchmarkResult = {
      percentileMetalAt300: pMetal300,
      percentileMetalAt600: pMetal600
    };
  }

  // 4. Grade calculation
  const { grade } = computeGrade(metrics, adherence, Boolean(plan));

  // 5. Tips generation
  const tips = evaluateTips({
    metrics,
    hasPlan: Boolean(plan),
    adherence,
    plannedFirstFactory,
    benchmark: benchmarkResult,
    profile
  });

  const profileSuggestion = options.pastReports
    ? suggestProfile(
        [{ grade, adherence, profile }, ...options.pastReports],
        profile
      )
    : null;

  const report: SessionReport = {
    schemaVersion: 1,
    sessionId: session.meta.sessionId,
    planId: plan?.id ?? session.meta.planId,
    profile,
    factionId,
    metrics,
    steps: reportSteps,
    adherence,
    benchmark: benchmarkResult,
    tips,
    grade,
    profileSuggestion
  };

  return SessionReportSchema.parse(report);
}
