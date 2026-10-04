import type { SessionReportTip } from '../schemas/report';
import type { TipContext } from './types';
import {
  TIP_ENERGY_STALL_THRESHOLD_SEC,
  TIP_METAL_FLOAT_THRESHOLD_SEC,
  TIP_IDLE_FACTORY_THRESHOLD_SEC,
  TIP_IDLE_BUILDERS_THRESHOLD_SEC,
  TIP_IDLE_COMMANDER_THRESHOLD_SEC,
  TIP_ADHERENCE_THRESHOLD,
  TIP_SLOW_FACTORY_DELAY_SEC,
  TIP_BENCHMARK_PERCENTILE_THRESHOLD
} from './constants';

export interface TipRule {
  id: string;
  severity: 'info' | 'warn' | 'danger';
  when: (ctx: TipContext) => boolean;
  impact: (ctx: TipContext) => number;
  text: (ctx: TipContext) => string;
}

export const TIP_RULES: TipRule[] = [
  // 1. Energy stall
  {
    id: 'tip.energy-stall',
    severity: 'danger',
    when: (ctx) => ctx.metrics.energyStallSec > TIP_ENERGY_STALL_THRESHOLD_SEC,
    impact: (ctx) => Math.min(25, ctx.metrics.energyStallSec / 2),
    text: (ctx) =>
      `Energy-stalled for ${Math.round(ctx.metrics.energyStallSec)}s. Keep energy income above what you spend before adding factories or builders.`
  },
  // 2. Metal float
  {
    id: 'tip.metal-float',
    severity: 'warn',
    when: (ctx) => ctx.metrics.metalFloatSec > TIP_METAL_FLOAT_THRESHOLD_SEC,
    impact: (ctx) => Math.min(20, ctx.metrics.metalFloatSec / 3),
    text: (ctx) =>
      `Floated metal for ${Math.round(ctx.metrics.metalFloatSec)}s. Add build power (constructor or turret) or queue more.`
  },
  // 3. Idle factories
  {
    id: 'tip.idle-factory',
    severity: 'warn',
    when: (ctx) => ctx.metrics.idleFactorySec > TIP_IDLE_FACTORY_THRESHOLD_SEC,
    impact: (ctx) => Math.min(15, ctx.metrics.idleFactorySec / 4),
    text: (ctx) =>
      `Factories sat idle for ${Math.round(ctx.metrics.idleFactorySec)}s. Use repeat-queue so they never stop.`
  },
  // 4. Idle constructors
  {
    id: 'tip.idle-builders',
    severity: 'warn',
    when: (ctx) => ctx.metrics.idleBuilderSec > TIP_IDLE_BUILDERS_THRESHOLD_SEC,
    impact: (ctx) => Math.min(15, ctx.metrics.idleBuilderSec / 6),
    text: (ctx) =>
      `Constructors were idle for ${Math.round(ctx.metrics.idleBuilderSec)} builder-seconds. Always give them a queue.`
  },
  // 5. Idle commander (first 10 minutes)
  {
    id: 'tip.idle-commander',
    severity: 'warn',
    when: (ctx) => ctx.metrics.idleCommanderSec > TIP_IDLE_COMMANDER_THRESHOLD_SEC,
    impact: (ctx) => Math.min(10, ctx.metrics.idleCommanderSec / 2),
    text: (ctx) =>
      `Commander idle for ${Math.round(ctx.metrics.idleCommanderSec)}s in the first 10 minutes. It is your best builder early.`
  },
  // 6. Plan adherence
  {
    id: 'tip.adherence',
    severity: 'warn',
    when: (ctx) => ctx.hasPlan && ctx.adherence < TIP_ADHERENCE_THRESHOLD,
    impact: (ctx) => (1 - ctx.adherence) * 15,
    text: (ctx) =>
      `Only ${Math.round(ctx.adherence * 100)}% of steps on time. Practise the first 10 steps against AI.`
  },
  // 7. Slow first factory
  {
    id: 'tip.slow-factory',
    severity: 'warn',
    when: (ctx) => {
      if (!ctx.hasPlan || ctx.metrics.timeToFirstFactory === null || ctx.plannedFirstFactory === null) {
        return false;
      }
      return ctx.metrics.timeToFirstFactory > ctx.plannedFirstFactory + TIP_SLOW_FACTORY_DELAY_SEC;
    },
    impact: (ctx) => {
      const delay = (ctx.metrics.timeToFirstFactory ?? 0) - (ctx.plannedFirstFactory ?? 0);
      return Math.min(15, delay / 2);
    },
    text: (ctx) => {
      const delay = Math.round((ctx.metrics.timeToFirstFactory ?? 0) - (ctx.plannedFirstFactory ?? 0));
      return `First factory was ${delay}s late.`;
    }
  },
  // 8. Low metal benchmark at 5:00
  {
    id: 'tip.benchmark',
    severity: 'info',
    when: (ctx) => {
      if (!ctx.benchmark || ctx.benchmark.percentileMetalAt300 === null) {
        return false;
      }
      return ctx.benchmark.percentileMetalAt300 < TIP_BENCHMARK_PERCENTILE_THRESHOLD;
    },
    impact: (ctx) => {
      const p = ctx.benchmark?.percentileMetalAt300 ?? 0;
      return Math.max(1, TIP_BENCHMARK_PERCENTILE_THRESHOLD - p);
    },
    text: () => 'Metal income at 5:00 was below 75% of pro games.'
  }
];

/**
 * Evaluates all deterministic tip rules against the session metrics and context.
 * Sorts matching tips by impact descending and returns top 3 (04 §4.2).
 */
export function evaluateTips(ctx: TipContext): SessionReportTip[] {
  const matching: Array<{ tip: SessionReportTip; impact: number }> = [];

  for (const rule of TIP_RULES) {
    if (rule.when(ctx)) {
      matching.push({
        tip: {
          id: rule.id,
          severity: rule.severity,
          text: rule.text(ctx)
        },
        impact: rule.impact(ctx)
      });
    }
  }

  // Sort by impact descending; tie-break deterministically by rule id
  matching.sort((a, b) => {
    if (b.impact !== a.impact) {
      return b.impact - a.impact;
    }
    return a.tip.id.localeCompare(b.tip.id);
  });

  return matching.slice(0, 3).map((m) => m.tip);
}
