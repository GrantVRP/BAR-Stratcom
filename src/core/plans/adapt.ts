/**
 * Deterministic plan adapter ("generator"): adapt a real build to a map, never invent
 * one. select base → energy substitution → retime → stall fix (≤ 3) → validate.
 */
import type { Registry } from '../registry';
import type {
  BuildPlan,
  BuildStep,
  MapRecord,
  PlanMode,
  PlanOpening,
  PlanRole,
  PlanSkill,
  PlanValidationResult,
  UnitDefRecord
} from '../schemas';
import { simulate } from '../sim/simulate';
import type { SimResult } from '../sim/types';
import { validatePlan } from './validate';
import { FALLBACK_MEX_YIELD, STALL_FIX, WIND_CLASS } from './constants';

export interface AdaptTarget {
  factionId: string;
  mapRecord: MapRecord;
  /** Measured average wind of the map; null when unknown (no substitution, W_WIND_UNKNOWN). */
  avgWind: number | null;
  mode: PlanMode;
  role?: PlanRole;
  opening?: PlanOpening;
  skill: PlanSkill;
}

export interface AdaptInput {
  registry: Registry;
  library: readonly BuildPlan[];
  target: AdaptTarget;
  /** ISO timestamp from the caller (core has no clock). */
  createdAt: string;
}

export type AdaptResult =
  | { plan: BuildPlan; transforms: string[]; issues: PlanValidationResult; sim: SimResult }
  | { error: 'NO_BASE_PLAN' };

export type WindClass = 'high' | 'mid' | 'low' | 'unknown';

export function windClass(avgWind: number | null): WindClass {
  if (avgWind === null) return 'unknown';
  if (avgWind >= WIND_CLASS.highMin) return 'high';
  if (avgWind < WIND_CLASS.lowBelow) return 'low';
  return 'mid';
}

const SKILLS: PlanSkill[] = ['beginner', 'intermediate', 'advanced'];

/** Step 1: same faction, a mode including the target, matching opening/role; nearest wind fit, then skill. */
export function selectBasePlan(library: readonly BuildPlan[], target: AdaptTarget): BuildPlan | null {
  const windDistance = (p: BuildPlan): number => {
    const fit = p.mapFit;
    if (target.avgWind === null) return 0;
    if (fit?.windMin === undefined || fit.windMax === undefined) return Number.POSITIVE_INFINITY;
    return Math.abs((fit.windMin + fit.windMax) / 2 - target.avgWind);
  };
  const skillDistance = (p: BuildPlan): number => Math.abs(SKILLS.indexOf(p.skill) - SKILLS.indexOf(target.skill));
  const candidates = library.filter(
    (p) =>
      p.factionId === target.factionId &&
      p.modes.includes(target.mode) &&
      (!target.opening || p.opening === target.opening) &&
      (!target.role || p.role === target.role || p.role === 'any')
  );
  candidates.sort(
    (a, b) => windDistance(a) - windDistance(b) || skillDistance(a) - skillDistance(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  return candidates[0] ?? null;
}

/** Energy a building adds (solar collectors produce through negative upkeep in BAR unit defs). */
export function energyOutput(unit: UnitDefRecord): number {
  return unit.economy.energyMake - Math.min(0, unit.economy.energyUpkeep);
}

const isWind = (u: UnitDefRecord): boolean => u.economy.windGenerator > 0;
const isSolar = (u: UnitDefRecord): boolean =>
  u.isBuilding && !isWind(u) && u.economy.tidalGenerator === 0 && u.economy.extractsMetal === 0 && energyOutput(u) > 0;

function buildOptionsOf(registry: Registry, plan: BuildPlan, actor: BuildStep['actor']): string[] {
  if (actor.kind === 'commander') return registry.commanderOf(plan.factionId).buildOptions;
  return registry.get(actor.unitId)?.buildOptions ?? [];
}

/** The cheapest T1 solar (or wind turbine) this actor can build. */
function energyUnitFor(registry: Registry, options: readonly string[], kind: 'solar' | 'wind'): UnitDefRecord | null {
  const units = options
    .map((id) => registry.get(id))
    .filter((u): u is UnitDefRecord => !!u && u.techLevel === 1 && (kind === 'wind' ? isWind(u) : isSolar(u)));
  units.sort((a, b) => a.metalCost - b.metalCost || (a.id < b.id ? -1 : 1));
  return units[0] ?? null;
}

/** Step 2: wind ↔ solar by wind class, keeping the expected energy. */
function substituteEnergy(plan: BuildPlan, registry: Registry, avgWind: number, cls: WindClass): string | null {
  const toSolar = cls === 'low' && plan.energyStyle === 'wind';
  const toWind = cls === 'high' && plan.energyStyle === 'solar';
  if (!toSolar && !toWind) return null;
  const steps: BuildStep[] = [];
  let changed = 0;
  for (const step of plan.steps) {
    const unit = step.unitId ? registry.get(step.unitId) : undefined;
    const from = unit && (toSolar ? isWind(unit) : isSolar(unit)) ? unit : null;
    const to = from ? energyUnitFor(registry, buildOptionsOf(registry, plan, step.actor), toSolar ? 'solar' : 'wind') : null;
    if (!from || !to) {
      steps.push(step);
      continue;
    }
    const windOut = (u: UnitDefRecord): number => Math.min(avgWind, u.economy.windGenerator);
    const count = toSolar
      ? Math.ceil((step.count * windOut(from)) / energyOutput(to))
      : Math.ceil((step.count * energyOutput(from)) / windOut(to));
    changed += 1;
    if (count > 0) steps.push({ ...step, unitId: to.id, count });
  }
  if (changed === 0) return null;
  plan.steps = steps;
  plan.energyStyle = toSolar ? 'solar' : 'wind';
  return toSolar ? 'energy(wind→solar)' : 'energy(solar→wind)';
}

function simulateAsap(registry: Registry, plan: BuildPlan, target: AdaptTarget): SimResult {
  const map = target.mapRecord;
  return simulate({
    registry,
    plan,
    map: {
      windAvg: target.avgWind,
      windMin: map.wind.min,
      windMax: map.wind.max,
      tidalStrength: map.tidalStrength,
      mexYield: map.mexYield?.value ?? FALLBACK_MEX_YIELD,
      mexYieldProvenance: map.mexYield?.provenance ?? 'estimated'
    },
    options: { schedule: 'asap' }
  });
}

/** Step 3: write each simulated start into targetTime (unreached steps keep theirs). */
function retime(plan: BuildPlan, sim: SimResult): void {
  const starts = new Map(sim.steps.map((s) => [s.stepId, s.start]));
  plan.steps = plan.steps.map((s) => {
    const start = starts.get(s.id);
    return start === null || start === undefined ? s : { ...s, targetTime: Math.round(start * 10) / 10 };
  });
}

/** The first energy stall in the window that lasts longer than the limit, or null. */
function earlyStall(sim: SimResult): { start: number } | null {
  const stall = sim.intervals.energyStall.find(
    (i) => i.start < STALL_FIX.windowSec && Math.min(i.end, STALL_FIX.windowSec) - i.start > STALL_FIX.minStallSec
  );
  return stall ? { start: stall.start } : null;
}

/** Index of the first step that starts at or after the stall (or is running when it begins). */
function firstStalledStepIndex(plan: BuildPlan, sim: SimResult, stallStart: number): number {
  const byId = new Map(sim.steps.map((s) => [s.stepId, s]));
  const after = plan.steps.findIndex((s) => (byId.get(s.id)?.start ?? -1) >= stallStart);
  if (after >= 0) return after;
  const running = plan.steps.findIndex((s) => {
    const r = byId.get(s.id);
    return r?.start !== null && r?.start !== undefined && r.start <= stallStart && (r.finish === null || r.finish > stallStart);
  });
  return running >= 0 ? running : plan.steps.length;
}

function uniqueStepId(plan: BuildPlan, base: string): string {
  const ids = new Set(plan.steps.map((s) => s.id));
  let n = 1;
  while (ids.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function adaptPlan(input: AdaptInput): AdaptResult {
  const { registry, target } = input;
  const base = selectBasePlan(input.library, target);
  if (!base) return { error: 'NO_BASE_PLAN' };

  const plan: BuildPlan = structuredClone(base);
  const transforms: string[] = [`base(${base.id})`];
  const extraWarnings: PlanValidationResult['warnings'] = [];
  const cls = windClass(target.avgWind);

  if (target.avgWind === null) {
    extraWarnings.push({ code: 'W_WIND_UNKNOWN', message: `Average wind of ${target.mapRecord.scriptName} is unknown: energy kept as planned` });
  } else {
    const t = substituteEnergy(plan, registry, target.avgWind, cls);
    if (t) transforms.push(t);
  }

  let sim = simulateAsap(registry, plan, target);
  retime(plan, sim);
  transforms.push('retime(asap)');

  const fixKind: 'solar' | 'wind' = cls === 'high' || (cls === 'mid' && plan.energyStyle === 'wind') ? 'wind' : 'solar';
  for (let i = 0; i < STALL_FIX.maxInserts; i += 1) {
    const stall = earlyStall(sim);
    const unit = stall ? energyUnitFor(registry, registry.commanderOf(plan.factionId).buildOptions, fixKind) : null;
    if (!stall || !unit) break;
    const at = firstStalledStepIndex(plan, sim, stall.start);
    plan.steps.splice(at, 0, { id: uniqueStepId(plan, 'fix'), actor: { kind: 'commander' }, action: 'build', unitId: unit.id, count: 1 });
    sim = simulateAsap(registry, plan, target);
    retime(plan, sim);
    transforms.push(`stall-fix(${unit.id})`);
  }

  const mapName = target.mapRecord.scriptName;
  plan.id = `${base.id}-adapted-${slug(mapName)}`;
  plan.title = `${base.title} // ${target.mapRecord.name}`.slice(0, 60);
  plan.mapFit = { windMin: target.mapRecord.wind.min, windMax: target.mapRecord.wind.max, maps: [mapName] };
  plan.source = { kind: 'adapted', fromPlanId: base.id, transforms, createdAt: input.createdAt };

  const issues = validatePlan(plan, registry);
  return { plan, transforms, issues: { errors: issues.errors, warnings: [...extraWarnings, ...issues.warnings] }, sim };
}
