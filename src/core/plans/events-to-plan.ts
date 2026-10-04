import type { Registry } from '../registry';
import type { WidgetEvent } from '../schemas/protocol';
import type {
  BuildPlan,
  BuildStep,
  Actor,
  PlanOpening,
  PlanEnergyStyle,
  PlanMode,
  PlanSource,
  PlanRole,
  PlanSkill
} from '../schemas/plans';

export interface EventsToPlanInput {
  registry: Registry;
  events: WidgetEvent[];
  teamId: number;
  horizonSec?: number;
  teams?: Array<{ teamId: number; allyTeamId: number }>;
  meta: {
    player: string;
    map: string;
    source: PlanSource;
    title?: string;
    id?: string;
    factionId?: string;
    gameVersion?: string;
    modes?: PlanMode[];
    role?: PlanRole;
    skill?: PlanSkill;
    notes?: string;
    tags?: string[];
  };
}

export function deriveOpening(firstFactoryDef: string | undefined): PlanOpening {
  if (!firstFactoryDef) return 'mixed';
  const def = firstFactoryDef.toLowerCase();
  if (def.includes('lab') || def.includes('bot')) return 'bot';
  if (def.includes('vp') || def.includes('veh')) return 'vehicle';
  if (def.includes('ap') || def.includes('air') || def.includes('plat')) return 'air';
  if (def.includes('sy') || def.includes('ship') || def.includes('yard')) return 'sea';
  if (def.includes('hp') || def.includes('hov')) return 'hover';
  return 'mixed';
}

export function deriveEnergyStyle(
  createdEvents: Array<{ d: string; f: number }>,
  reg: Registry
): PlanEnergyStyle {
  let wind = 0;
  let solar = 0;
  let tidal = 0;

  for (const e of createdEvents) {
    if (e.f > 300 * 30) continue;
    const unit = reg.get(e.d);
    if (!unit) continue;
    if (unit.economy.windGenerator > 0) {
      wind += 1;
    } else if (unit.economy.tidalGenerator > 0) {
      tidal += 1;
    } else if (
      unit.isBuilding &&
      (unit.economy.energyMake > 0 || unit.economy.energyUpkeep < 0)
    ) {
      solar += 1;
    }
  }

  const total = wind + solar + tidal;
  if (total === 0) return 'solar';
  if (wind / total >= 0.6) return 'wind';
  if (solar / total >= 0.6) return 'solar';
  if (tidal / total >= 0.6) return 'tidal';
  return 'mixed';
}

export function deriveModes(teams?: Array<{ teamId: number; allyTeamId: number }>): PlanMode[] {
  if (!teams || teams.length === 0) return ['1v1'];
  const t0 = teams[0];
  const t1 = teams[1];
  if (teams.length === 2 && t0 && t1 && t0.allyTeamId !== t1.allyTeamId) {
    return ['1v1'];
  }
  const allyCounts = new Map<number, number>();
  for (const t of teams) {
    allyCounts.set(t.allyTeamId, (allyCounts.get(t.allyTeamId) ?? 0) + 1);
  }
  const maxAllySize = Math.max(...allyCounts.values());
  if (maxAllySize <= 1 && allyCounts.size === 2) return ['1v1'];
  if (maxAllySize <= 4) return ['small-team'];
  return ['large-team'];
}

interface IntermediateCreated {
  f: number;
  u: number;
  d: string;
  b: number;
  bd: string;
}

interface IntermediateStep {
  actor: Actor;
  unitId: string;
  f: number;
  targetTime: number;
}

interface GroupedStep {
  actor: Actor;
  unitId: string;
  count: number;
  targetTime: number;
  firstFrame: number;
}

export function eventsToPlan(input: EventsToPlanInput): BuildPlan {
  const { registry: reg, events, teamId, horizonSec = 600, meta } = input;
  const horizonFrames = horizonSec * 30;

  // 1. Identify finished and destroyed units across the events to detect cancellations
  const finishedUnits = new Set<number>();
  const destroyedUnits = new Set<number>();

  for (const e of events) {
    if ('tm' in e && e.tm === teamId) {
      if (e.e === 'finished') finishedUnits.add(e.u);
      else if (e.e === 'destroyed') destroyedUnits.add(e.u);
    }
  }

  // 2. Filter created events: teamId, f <= horizonFrames, skip commander, skip cancelled builds
  const validCreated: IntermediateCreated[] = [];
  let detectedFactionId: string | null = null;

  for (const e of events) {
    if (e.e !== 'created' || e.tm !== teamId) continue;

    const unitDef = reg.get(e.d);
    if (!detectedFactionId && unitDef?.factionId) {
      detectedFactionId = unitDef.factionId;
    }

    // Skip commander itself (f <= 0, or isCommander, or missing builder)
    if (unitDef?.isCommander || !e.bd || e.f <= 0) {
      if (unitDef?.factionId) detectedFactionId = unitDef.factionId;
      continue;
    }

    if (e.f > horizonFrames) continue;

    // Drop cancelled units: created and destroyed without ever finished
    if (destroyedUnits.has(e.u) && !finishedUnits.has(e.u)) {
      continue;
    }

    if (e.b === undefined || e.b === null) continue;

    validCreated.push({
      f: e.f,
      u: e.u,
      d: e.d,
      b: e.b,
      bd: e.bd
    });
  }

  // 3. Resolve actors: commander, factory with instance index, mobile builder with instance index.
  // Turrets, resurrect bots without buildOptions, or unknown units are skipped.
  const builderInstancesByDef = new Map<string, Map<number, number>>();
  function getBuilderIndex(bd: string, b: number): number {
    let instances = builderInstancesByDef.get(bd);
    if (!instances) {
      instances = new Map<number, number>();
      builderInstancesByDef.set(bd, instances);
    }
    let idx = instances.get(b);
    if (idx === undefined) {
      idx = instances.size + 1;
      instances.set(b, idx);
    }
    return idx;
  }

  let firstFactoryDef: string | undefined;
  const rawStepsByActor = new Map<string, IntermediateStep[]>();

  for (const item of validCreated) {
    const builderDef = reg.get(item.bd);
    if (!builderDef) continue;

    let actor: Actor | null = null;

    if (builderDef.isCommander) {
      actor = { kind: 'commander' };
    } else if (builderDef.isFactory) {
      const idx = getBuilderIndex(item.bd, item.b);
      actor = { kind: 'factory', unitId: item.bd, index: idx };
      if (!firstFactoryDef) firstFactoryDef = item.bd;
    } else if (builderDef.isBuilder && builderDef.canMove) {
      const idx = getBuilderIndex(item.bd, item.b);
      actor = { kind: 'builder', unitId: item.bd, index: idx };
    } else {
      // Construction turret or unknown: skipped
      continue;
    }

    // Verify builder can build target unit (guards against resurrect bots resurrecting wrecks)
    if (!builderDef.buildOptions.includes(item.d)) {
      continue;
    }

    const targetDef = reg.get(item.d);
    if (targetDef?.isFactory && !firstFactoryDef) {
      firstFactoryDef = item.d;
    }

    const actorKey = JSON.stringify(actor);
    let list = rawStepsByActor.get(actorKey);
    if (!list) {
      list = [];
      rawStepsByActor.set(actorKey, list);
    }

    list.push({
      actor,
      unitId: item.d,
      f: item.f,
      targetTime: Number((item.f / 30).toFixed(1))
    });
  }

  // 4. Group consecutive events with same actor and unitId within 20s into one step
  const groupedSteps: GroupedStep[] = [];

  for (const [, actorSteps] of rawStepsByActor) {
    const first = actorSteps[0];
    if (!first) continue;

    let current: GroupedStep = {
      actor: first.actor,
      unitId: first.unitId,
      count: 1,
      targetTime: first.targetTime,
      firstFrame: first.f
    };

    let prevTime = first.targetTime;

    for (let i = 1; i < actorSteps.length; i++) {
      const next = actorSteps[i];
      if (!next) continue;
      const dt = next.targetTime - prevTime;

      if (next.unitId === current.unitId && dt <= 20 && current.count < 50) {
        current.count += 1;
        prevTime = next.targetTime;
      } else {
        groupedSteps.push(current);
        current = {
          actor: next.actor,
          unitId: next.unitId,
          count: 1,
          targetTime: next.targetTime,
          firstFrame: next.f
        };
        prevTime = next.targetTime;
      }
    }
    groupedSteps.push(current);
  }

  // Order grouped steps across actors by targetTime (and firstFrame as tie-breaker)
  groupedSteps.sort((a, b) => a.targetTime - b.targetTime || a.firstFrame - b.firstFrame);

  // 5. Cap at 60 steps. A builder the plan never built (resurrected by a necro bot, or given by an
  // ally) cannot be an actor: credit its work to the newest built instance of that unit, or skip it.
  const builtActorsCount = new Map<string, number>();
  const steps: BuildStep[] = [];

  for (const s of groupedSteps) {
    if (steps.length >= 60) break;

    let actor = s.actor;
    if (actor.kind === 'builder' || actor.kind === 'factory') {
      const available = builtActorsCount.get(actor.unitId) ?? 0;
      if (actor.index > available) {
        if (available > 0) {
          actor = { ...actor, index: available };
        } else {
          continue; // Actor not yet available in earlier steps
        }
      }
    }

    if (s.unitId) {
      builtActorsCount.set(s.unitId, (builtActorsCount.get(s.unitId) ?? 0) + s.count);
    }

    steps.push({
      id: `s${steps.length + 1}`,
      actor,
      action: 'build' as const,
      unitId: s.unitId,
      count: s.count,
      targetTime: s.targetTime
    });
  }

  const factionId = meta.factionId ?? detectedFactionId ?? 'armada';
  const opening = deriveOpening(firstFactoryDef);
  const energyStyle = deriveEnergyStyle(validCreated, reg);
  const modes = meta.modes ?? deriveModes(input.teams);

  const shortMap = meta.map
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const title =
    meta.title ??
    `${opening.charAt(0).toUpperCase() + opening.slice(1)} ${energyStyle} // ${shortMap}`.slice(0, 60);
  const id = meta.id ?? `plan-${meta.player.toLowerCase()}-${shortMap}-${opening}`;

  return {
    schemaVersion: 1,
    id,
    title,
    factionId,
    gameVersion: meta.gameVersion ?? reg.gameVersion,
    modes,
    role: meta.role ?? 'any',
    skill: meta.skill ?? 'intermediate',
    opening,
    energyStyle,
    source: meta.source,
    steps,
    notes: meta.notes ?? 'Reclaim actions are not recorded in replays.'
  };
}
