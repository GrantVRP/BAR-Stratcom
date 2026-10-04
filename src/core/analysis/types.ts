import type { SessionMeta } from '../schemas/session';
import type { StateDoc, WidgetEvent } from '../schemas/protocol';
import type { LiveSnapshot } from '../schemas/live';
import type { Registry } from '../registry';
import type { Profile } from '../schemas/common';
import type { SessionReportMetrics, SessionReportBenchmark } from '../schemas/report';

export interface AnalysisSessionInput {
  meta: SessionMeta;
  states: readonly (StateDoc | LiveSnapshot)[];
  events: readonly WidgetEvent[];
  registry?: Registry;
}

export interface ComputeMetricsOptions {
  meta: SessionMeta;
  states: readonly (StateDoc | LiveSnapshot)[];
  events: readonly WidgetEvent[];
  registry?: Registry;
  teamId?: number;
}

export interface TipContext {
  metrics: SessionReportMetrics;
  hasPlan: boolean;
  adherence: number;
  plannedFirstFactory: number | null;
  benchmark: SessionReportBenchmark | null;
  profile: Profile;
}
