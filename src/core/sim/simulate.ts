import type { BuildStep, UnitDefRecord } from '../schemas';
import { validatePlan } from '../plans/validate';
import {
  DEFAULT_CONVERTER_THRESHOLD,
  DEFAULT_SIM_DT,
  DEFAULT_SIM_HORIZON,
  DEFAULT_START_RESOURCES
} from './constants';
import {
  applyStorage,
  computeIncome,
  createEconomyState,
  runConverters
} from './economy';
import {
  attachAssists,
  tickConstructions,
  tickReclaims,
  type ActiveConstruction,
  type ActiveReclaim,
  type AssistTask
} from './construction';
import { IntervalAccumulator } from './interval';
import {
  SimInputError,
  type SimFlag,
  type SimInput,
  type SimResult,
  type SimSample,
  type SimStepResult
} from './types';

interface ActorState {
  key: string;
  unitDef: UnitDefRecord;
  isAlive: boolean;
  queue: BuildStep[];
  currentStep: BuildStep | null;
  currentStepUnitsRemaining: number;
  activeConstructionId: string | null;
}

function getActorKey(actor: BuildStep['actor']): string {
  if (actor.kind === 'commander') return 'commander';
  return `${actor.kind}:${actor.unitId}:${actor.index}`;
}

/**
 * Simulates a BuildPlan on a given map using deterministic discrete-time simulation.
 */
export function simulate(input: SimInput): SimResult {
  // 1. Validate plan first; throw SimInputError if invalid
  const validation = validatePlan(input.plan, input.registry);
  if (validation.errors.length > 0) {
    const msg = `Plan validation failed: ${validation.errors.map((e) => e.message).join('; ')}`;
    throw new SimInputError(msg, validation.errors);
  }

  // 2. Resolve options & defaults
  const dt = input.options?.dt ?? DEFAULT_SIM_DT;
  const horizon = input.options?.horizon ?? DEFAULT_SIM_HORIZON;
  const hasTargetTimes = input.plan.steps.some((s) => s.targetTime !== undefined);
  const schedule = input.options?.schedule ?? (hasTargetTimes ? 'respect-targets' : 'asap');
  const converterThreshold = input.options?.converterThreshold ?? DEFAULT_CONVERTER_THRESHOLD;
  const startEstimated = !input.start;
  const start = input.start ?? DEFAULT_START_RESOURCES;

  // 3. Flags
  const flags: SimFlag[] = [];
  if (startEstimated) flags.push('startEstimated');
  if (input.map.mexYieldProvenance === 'estimated') flags.push('mexYieldEstimated');
  if (input.map.windAvg === null) flags.push('windUnknown');

  // 4. State & completed units
  const commanderDef = input.registry.commanderOf(input.plan.factionId);
  const completedUnits: UnitDefRecord[] = [commanderDef];
  let state = createEconomyState(start, completedUnits);

  // 5. Actors & Queues setup
  const actors = new Map<string, ActorState>();
  actors.set('commander', {
    key: 'commander',
    unitDef: commanderDef,
    isAlive: true,
    queue: [],
    currentStep: null,
    currentStepUnitsRemaining: 0,
    activeConstructionId: null
  });

  for (const step of input.plan.steps) {
    const key = getActorKey(step.actor);
    let actor = actors.get(key);
    if (!actor) {
      const def = step.actor.kind === 'commander' ? commanderDef : input.registry.get(step.actor.unitId);
      if (!def) throw new SimInputError(`Unknown unit definition for actor: ${key}`);
      actor = {
        key,
        unitDef: def,
        isAlive: false,
        queue: [],
        currentStep: null,
        currentStepUnitsRemaining: 0,
        activeConstructionId: null
      };
      actors.set(key, actor);
    }
    actor.queue.push(step);
  }

  const stepRecords = new Map<string, { start: number | null; finish: number | null }>();
  for (const step of input.plan.steps) {
    stepRecords.set(step.id, { start: null, finish: null });
  }

  const actorConstructionProgress = new Map<string, number>();
  const actorReclaimElapsed = new Map<string, number>();
  const builtCounts = new Map<string, number>();

  const metalStallIntervals = new IntervalAccumulator();
  const energyStallIntervals = new IntervalAccumulator();
  const metalFloatIntervals = new IntervalAccumulator();
  const energyFloatIntervals = new IntervalAccumulator();

  let metalStallSec = 0;
  let energyStallSec = 0;
  let idleBpSec = 0;

  // Samples (recorded every 1 s from t = 0 to horizon)
  const samples: SimSample[] = [];
  const initialWind = input.options?.windSeries
    ? (input.options.windSeries[0] ?? input.map.windAvg)
    : input.map.windAvg;
  const initialIncome = computeIncome(completedUnits, input.map, initialWind);

  samples.push({
    t: 0,
    metal: { current: state.metal.current, storage: state.metal.storage, income: initialIncome.metal, spend: 0 },
    energy: { current: state.energy.current, storage: state.energy.storage, income: initialIncome.energy, spend: 0 },
    bpTotal: commanderDef.buildSpeed,
    bpActive: 0,
    stallMetal: false,
    stallEnergy: false
  });

  let nextSampleTime = 1;
  const totalTicks = Math.round(horizon / dt);

  // 6. Main simulation loop
  for (let tickIndex = 0; tickIndex < totalTicks; tickIndex++) {
    const t = tickIndex * dt;

    // A. Start new steps for idle, alive actors
    for (const actor of actors.values()) {
      if (!actor.isAlive || actor.currentStep !== null || actor.queue.length === 0) continue;
      const nextStep = actor.queue[0];
      if (!nextStep) continue;

      if (schedule === 'respect-targets' && nextStep.targetTime !== undefined && t < nextStep.targetTime) {
        continue;
      }

      actor.currentStep = nextStep;
      actor.currentStepUnitsRemaining = nextStep.count;
      const rec = stepRecords.get(nextStep.id);
      if (rec && rec.start === null) rec.start = t;

      if (nextStep.action === 'note') {
        if (rec) rec.finish = t;
        actor.queue.shift();
        actor.currentStep = null;
      }
    }

    // B. Collect active tasks
    const activeConstructions: ActiveConstruction[] = [];
    const activeAssists: AssistTask[] = [];
    const activeReclaims: ActiveReclaim[] = [];

    for (const actor of actors.values()) {
      if (!actor.isAlive || !actor.currentStep) continue;
      const step = actor.currentStep;

      if (step.action === 'build' && step.unitId) {
        const unitDef = input.registry.get(step.unitId);
        if (unitDef) {
          const unitIndex = step.count - actor.currentStepUnitsRemaining + 1;
          const cId = `${step.id}:${unitIndex}`;
          actor.activeConstructionId = cId;
          activeConstructions.push({
            id: cId,
            unitDef,
            buildPower: actor.unitDef.buildSpeed,
            progress: actorConstructionProgress.get(cId) ?? 0
          });
        }
      } else if (step.action === 'assist' && step.assistStepId) {
        for (const other of actors.values()) {
          if (other.currentStep?.id === step.assistStepId && other.activeConstructionId) {
            activeAssists.push({
              actorId: actor.key,
              targetConstructionId: other.activeConstructionId,
              buildPower: actor.unitDef.buildSpeed
            });
            break;
          }
        }
      } else if (step.action === 'reclaim' && step.reclaim) {
        activeReclaims.push({
          id: step.id,
          metal: step.reclaim.metal,
          energy: step.reclaim.energy,
          durationSec: step.reclaim.durationSec,
          elapsedSec: actorReclaimElapsed.get(step.id) ?? 0
        });
      }
    }

    // C. Income
    const seriesIdx = Math.min((input.options?.windSeries?.length ?? 1) - 1, Math.floor(t));
    const windNow = input.options?.windSeries
      ? (input.options.windSeries[seriesIdx] ?? input.map.windAvg)
      : input.map.windAvg;
    const incomeRes = computeIncome(completedUnits, input.map, windNow);
    if (incomeRes.flags.windUnknown && !flags.includes('windUnknown')) {
      flags.push('windUnknown');
    }

    // D. Reclaims
    const reclaimRes = tickReclaims(activeReclaims, dt);
    for (const r of reclaimRes.updatedReclaims) actorReclaimElapsed.set(r.id, r.elapsedSec);
    for (const r of reclaimRes.completedReclaims) {
      actorReclaimElapsed.delete(r.id);
      for (const actor of actors.values()) {
        if (actor.currentStep?.id === r.id) {
          const rec = stepRecords.get(r.id);
          if (rec) rec.finish = t + dt;
          actor.queue.shift();
          actor.currentStep = null;
          break;
        }
      }
    }

    // E. Constructions & Assists
    const attached = attachAssists(activeConstructions, activeAssists);
    const availM = state.metal.current + (incomeRes.metal + reclaimRes.yielded.metal) * dt;
    const availE = state.energy.current + (incomeRes.energy + reclaimRes.yielded.energy) * dt;
    const constrRes = tickConstructions({
      constructions: attached,
      dt,
      available: { metal: availM, energy: availE }
    });

    for (const c of constrRes.updatedConstructions) actorConstructionProgress.set(c.id, c.progress);

    for (const c of constrRes.completedConstructions) {
      actorConstructionProgress.delete(c.id);
      completedUnits.push(c.unitDef);
      state.metal.storage += c.unitDef.economy.metalStorage;
      state.energy.storage += c.unitDef.economy.energyStorage;

      if (c.unitDef.isFactory) {
        const count = (builtCounts.get(c.unitDef.id) ?? 0) + 1;
        builtCounts.set(c.unitDef.id, count);
        const actor = actors.get(`factory:${c.unitDef.id}:${count}`);
        if (actor) actor.isAlive = true;
      } else if (c.unitDef.isBuilder && c.unitDef.canMove) {
        const count = (builtCounts.get(c.unitDef.id) ?? 0) + 1;
        builtCounts.set(c.unitDef.id, count);
        const actor = actors.get(`builder:${c.unitDef.id}:${count}`);
        if (actor) actor.isAlive = true;
      }

      for (const actor of actors.values()) {
        if (actor.activeConstructionId === c.id) {
          actor.activeConstructionId = null;
          actor.currentStepUnitsRemaining -= 1;
          if (actor.currentStepUnitsRemaining <= 0) {
            const finishedStepId = actor.currentStep?.id;
            if (finishedStepId) {
              const rec = stepRecords.get(finishedStepId);
              if (rec) rec.finish = t + dt;
              actor.queue.shift();
              actor.currentStep = null;

              for (const assister of actors.values()) {
                if (assister.currentStep?.action === 'assist' && assister.currentStep.assistStepId === finishedStepId) {
                  const arec = stepRecords.get(assister.currentStep.id);
                  if (arec) arec.finish = t + dt;
                  assister.queue.shift();
                  assister.currentStep = null;
                }
              }
            }
          }
          break;
        }
      }
    }

    // F. Converters & G. Storage
    const convRes = runConverters(state, completedUnits, dt, converterThreshold);
    state = convRes.state;

    const netIncome = {
      metal: incomeRes.metal + reclaimRes.yielded.metal,
      energy: incomeRes.energy + reclaimRes.yielded.energy
    };
    const storRes = applyStorage(state, dt, netIncome, constrRes.spent);
    state = storRes.state;

    // H. Intervals & Statistics
    const stallM = constrRes.stallMetal;
    const stallE = constrRes.stallEnergy;
    metalStallIntervals.record(stallM, t, dt);
    energyStallIntervals.record(stallE, t, dt);
    metalFloatIntervals.record(storRes.float.metal, t, dt);
    energyFloatIntervals.record(storRes.float.energy, t, dt);

    if (stallM) metalStallSec += dt;
    if (stallE) energyStallSec += dt;

    let bpTotal = 0;
    let bpActive = 0;
    for (const a of actors.values()) {
      if (a.isAlive) {
        bpTotal += a.unitDef.buildSpeed;
        if (a.currentStep !== null) bpActive += a.unitDef.buildSpeed;
      }
    }
    idleBpSec += Math.max(0, bpTotal - bpActive) * dt;

    // I. Sampling (every 1s)
    const tNext = t + dt;
    if (tNext >= nextSampleTime - 1e-6 && nextSampleTime <= horizon) {
      samples.push({
        t: nextSampleTime,
        metal: { current: state.metal.current, storage: state.metal.storage, income: incomeRes.metal, spend: constrRes.spent.metal / dt },
        energy: { current: state.energy.current, storage: state.energy.storage, income: incomeRes.energy, spend: constrRes.spent.energy / dt },
        bpTotal,
        bpActive,
        stallMetal: stallM,
        stallEnergy: stallE
      });
      nextSampleTime += 1;
    }
  }

  // 7. Finalize result
  const steps: SimStepResult[] = input.plan.steps.map((s) => ({
    stepId: s.id,
    start: stepRecords.get(s.id)?.start ?? null,
    finish: stepRecords.get(s.id)?.finish ?? null
  }));

  const unfinished = steps.some((s) => s.finish === null);
  if (unfinished && !flags.includes('horizonReached')) {
    flags.push('horizonReached');
  }

  return {
    samples,
    steps,
    intervals: {
      metalStall: metalStallIntervals.finish(),
      energyStall: energyStallIntervals.finish(),
      metalFloat: metalFloatIntervals.finish(),
      energyFloat: energyFloatIntervals.finish()
    },
    totals: { metalStallSec, energyStallSec, idleBpSec },
    flags
  };
}
