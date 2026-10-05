/**
 * AI drafting pipeline (04 §6.1): draft → parse → validate → repair (≤ 2 rounds) → simulate.
 * The model only drafts; the registry validates and the simulator measures. A draft that still has
 * errors after the repairs is returned for display but cannot be activated or saved.
 */
import type { Registry } from '../../core/registry';
import { AiPlanDraftSchema, type AiPlanDraft, type BuildPlan, type BuildStep, type MapRecord, type PlanIssue } from '../../core/schemas';
import { validatePlan } from '../../core/plans/validate';
import { FALLBACK_MEX_YIELD } from '../../core/plans/constants';
import { simulate } from '../../core/sim/simulate';
import type { SimFlag } from '../../core/sim/types';
import { buildContext, DRAFT_RULES, type DraftIntent } from './context';
import { toAiError } from './errors';
import { AiError, type AiProvider } from './types';

export const MAX_REPAIR_ROUNDS = 2;
/** Validation problems listed in one repair prompt (the rest follow once these are fixed). */
const MAX_LISTED_ISSUES = 25;

export type DraftPhase = 'draft' | 'repair' | 'simulate';

export interface DraftProgress {
  round: number;
  phase: DraftPhase;
}

export interface DraftReport {
  errors: PlanIssue[];
  warnings: PlanIssue[];
  /** Null when the plan has errors (the simulator only runs valid plans). */
  sim: { energyStallSec: number; metalStallSec: number; flags: SimFlag[] } | null;
}

export interface DraftResult {
  /** Null only when the last answer did not match the contract at all. */
  plan: BuildPlan | null;
  report: DraftReport;
  provider: string;
  model: string;
  rounds: number;
}

export interface DraftInput {
  provider: AiProvider;
  model: string;
  registry: Registry;
  intent: DraftIntent;
  map: MapRecord | null;
  avgWind: number | null;
  library: readonly BuildPlan[];
  /** ISO timestamp from the caller. */
  createdAt: string;
  /** Per provider call (120 s cloud, 300 s local). */
  timeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (progress: DraftProgress) => void;
}

interface Checked {
  plan: BuildPlan | null;
  errors: PlanIssue[];
  warnings: PlanIssue[];
}

/** Our step id for the n-th step (0-based); repair messages use the same ids. */
const stepId = (index: number): string => `s${index + 1}`;

/** Resolves with the promise, or rejects as soon as the signal aborts (a provider may ignore it). */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

async function ask(input: DraftInput, system: string, user: string): Promise<unknown> {
  const timeout = AbortSignal.timeout(input.timeoutMs);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  try {
    return await untilAborted(input.provider.draft({ system, user, schema: AiPlanDraftSchema, model: input.model }, signal), signal);
  } catch (err) {
    if (input.signal?.aborted) throw new AiError('CANCELLED');
    if (timeout.aborted) throw new AiError('TIMEOUT');
    throw toAiError(err);
  }
}

function toBuildPlan(draft: AiPlanDraft, input: DraftInput, repairRounds: number): BuildPlan {
  // the model's own step ids (if any) → ours, so assist steps keep pointing at the right step
  const ids = new Map<string, string>();
  draft.steps.forEach((s, i) => {
    if (s.id && !ids.has(s.id)) ids.set(s.id, stepId(i));
  });
  const steps: BuildStep[] = draft.steps.map((s, i) => {
    const step: BuildStep = { ...s, id: stepId(i) };
    if (s.assistStepId) step.assistStepId = ids.get(s.assistStepId) ?? s.assistStepId;
    return step;
  });
  const stamp = input.createdAt.replace(/[^0-9]/g, '').slice(0, 14);
  return {
    schemaVersion: 1,
    id: `ai-${input.intent.factionId}-${stamp}`,
    title: draft.title,
    ...(draft.description === undefined ? {} : { description: draft.description }),
    factionId: draft.factionId,
    gameVersion: input.registry.gameVersion,
    modes: draft.modes,
    role: draft.role,
    skill: draft.skill,
    opening: draft.opening,
    energyStyle: draft.energyStyle,
    ...(draft.mapFit === undefined ? {} : { mapFit: draft.mapFit }),
    source: { kind: 'ai-draft', provider: input.provider.id, model: input.model, createdAt: input.createdAt, repairRounds },
    steps,
    ...(draft.notes === undefined ? {} : { notes: draft.notes }),
    ...(draft.tags === undefined ? {} : { tags: draft.tags })
  };
}

/** The hard rules the schema does not express (04 §6.1): faction, 10–40 steps, targetTime ≤ 600. */
function contractIssues(draft: AiPlanDraft, intent: DraftIntent): PlanIssue[] {
  const issues: PlanIssue[] = [];
  if (draft.factionId !== intent.factionId) {
    issues.push({ code: 'E_WRONG_FACTION', message: `factionId must be "${intent.factionId}", got "${draft.factionId}"` });
  }
  const n = draft.steps.length;
  if (n < DRAFT_RULES.minSteps || n > DRAFT_RULES.maxSteps) {
    issues.push({ code: 'E_SCHEMA', message: `Write ${DRAFT_RULES.minSteps} to ${DRAFT_RULES.maxSteps} steps, got ${n}` });
  }
  draft.steps.forEach((s, i) => {
    if (s.action === 'reclaim') issues.push({ code: 'E_SCHEMA', stepId: stepId(i), message: 'Do not use the "reclaim" action' });
    if (s.targetTime !== undefined && s.targetTime > DRAFT_RULES.maxTargetTime) {
      issues.push({ code: 'E_SCHEMA', stepId: stepId(i), message: `targetTime must be at most ${DRAFT_RULES.maxTargetTime}, got ${s.targetTime}` });
    }
  });
  return issues;
}

/** Parses and validates one answer. */
function check(answer: unknown, input: DraftInput, repairRounds: number): Checked {
  if (typeof answer === 'string') {
    return { plan: null, errors: [{ code: 'E_SCHEMA', message: 'The answer is not valid JSON' }], warnings: [] };
  }
  const parsed = AiPlanDraftSchema.safeParse(answer);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue): PlanIssue => {
      const [root, index] = issue.path;
      const where = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return {
        code: 'E_SCHEMA',
        ...(root === 'steps' && typeof index === 'number' ? { stepId: stepId(index) } : {}),
        message: `${where}${issue.message}`
      };
    });
    return { plan: null, errors, warnings: [] };
  }
  const plan = toBuildPlan(parsed.data, input, repairRounds);
  const validation = validatePlan(plan, input.registry);
  return { plan, errors: [...contractIssues(parsed.data, input.intent), ...validation.errors], warnings: validation.warnings };
}

/** The repair round's message (04 §6.1): the request again, the previous answer, the problems. */
export function repairPrompt(original: string, answer: unknown, errors: readonly PlanIssue[]): string {
  const previous = typeof answer === 'string' ? answer.slice(0, 20_000) : JSON.stringify(answer);
  const listed = errors.slice(0, MAX_LISTED_ISSUES).map((e) => `- ${e.stepId ? `step ${e.stepId} (steps[${Number(e.stepId.slice(1)) - 1}]) ` : ''}${e.code}: ${e.message}`);
  if (errors.length > MAX_LISTED_ISSUES) listed.push(`- and ${errors.length - MAX_LISTED_ISSUES} more`);
  return [
    original,
    'YOUR PREVIOUS ANSWER',
    previous,
    'It breaks these rules (step ids count the steps from s1):',
    ...listed,
    'Return the full corrected JSON.'
  ].join('\n\n');
}

function simulateDraft(plan: BuildPlan, input: DraftInput): DraftReport['sim'] {
  const map = input.map;
  const result = simulate({
    registry: input.registry,
    plan,
    map: {
      windAvg: input.avgWind,
      windMin: map?.wind.min ?? 0,
      windMax: map?.wind.max ?? 0,
      tidalStrength: map?.tidalStrength ?? 0,
      mexYield: map?.mexYield?.value ?? FALLBACK_MEX_YIELD,
      mexYieldProvenance: map?.mexYield?.provenance ?? 'estimated'
    }
  });
  const round1 = (n: number): number => Math.round(n * 10) / 10;
  return { energyStallSec: round1(result.totals.energyStallSec), metalStallSec: round1(result.totals.metalStallSec), flags: result.flags };
}

/** Runs the whole pipeline. Throws AiError (CANCELLED, TIMEOUT, REFUSED, …) when the provider fails. */
export async function draftPlan(input: DraftInput): Promise<DraftResult> {
  const context = buildContext(input);
  let user = context.user;
  let checked: Checked = { plan: null, errors: [], warnings: [] };
  let round = 0;
  while (round <= MAX_REPAIR_ROUNDS) {
    if (input.signal?.aborted) throw new AiError('CANCELLED');
    round += 1;
    input.onProgress?.({ round, phase: round === 1 ? 'draft' : 'repair' });
    const answer = await ask(input, context.system, user);
    checked = check(answer, input, round - 1);
    if (checked.errors.length === 0) break;
    user = repairPrompt(context.user, answer, checked.errors);
  }
  let sim: DraftReport['sim'] = null;
  if (checked.plan && checked.errors.length === 0) {
    input.onProgress?.({ round, phase: 'simulate' });
    sim = simulateDraft(checked.plan, input);
  }
  return {
    plan: checked.plan,
    report: { errors: checked.errors, warnings: checked.warnings, sim },
    provider: input.provider.id,
    model: input.model,
    rounds: round
  };
}
