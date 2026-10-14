import type { BuildPlan, PlanIssue, PlanValidationResult } from '../schemas';
import type { Registry } from '../registry';

export type { IssueCode, PlanIssue, PlanValidationResult } from '../schemas/validation';

/**
 * Validates a BuildPlan against the unit registry.
 * Returns errors (which block coaching/simulation) and warnings.
 */
export function validatePlan(plan: BuildPlan, registry: Registry): PlanValidationResult {
  const errors: PlanIssue[] = [];
  const warnings: PlanIssue[] = [];

  // 1. Faction validation
  let commander = undefined;
  try {
    commander = registry.commanderOf(plan.factionId);
  } catch {
    errors.push({
      code: 'E_WRONG_FACTION',
      message: `Unknown or disabled faction: ${plan.factionId}`
    });
  }

  // 2. Version check
  if (plan.gameVersion && registry.gameVersion && plan.gameVersion !== registry.gameVersion) {
    warnings.push({
      code: 'W_STALE_VERSION',
      message: `Plan version "${plan.gameVersion}" differs from active game version "${registry.gameVersion}"`
    });
  }

  // 3. Step validation and actor availability tracking
  const builtActors = new Map<string, number>();
  const lastTargetTimeByActor = new Map<string, number>();

  for (const step of plan.steps) {
    // Actor key for sequencing
    let actorKey = 'commander';
    if (step.actor.kind === 'factory') {
      actorKey = `factory:${step.actor.unitId}:${step.actor.index}`;
    } else if (step.actor.kind === 'builder') {
      actorKey = `builder:${step.actor.unitId}:${step.actor.index}`;
    }

    // Check actor availability
    if (step.actor.kind === 'factory' || step.actor.kind === 'builder') {
      const actorDef = registry.get(step.actor.unitId);
      if (!actorDef) {
        errors.push({
          code: 'E_UNKNOWN_UNIT',
          stepId: step.id,
          message: `Unknown actor unitDef: ${step.actor.unitId}`
        });
      }

      const availableCount = builtActors.get(step.actor.unitId) ?? 0;
      if (step.actor.index > availableCount) {
        errors.push({
          code: 'E_ACTOR_NOT_AVAILABLE',
          stepId: step.id,
          message: `Actor ${step.actor.kind} "${step.actor.unitId}" #${step.actor.index} is not available (only ${availableCount} built in earlier steps)`
        });
      }
    }

    // Check count
    if (step.count < 1 || step.count > 50) {
      errors.push({
        code: 'E_BAD_COUNT',
        stepId: step.id,
        message: `Step count must be between 1 and 50, got ${step.count}`
      });
    }

    // Action-specific validation
    if (step.action === 'build') {
      if (!step.unitId) {
        errors.push({
          code: 'E_MISSING_FIELD',
          stepId: step.id,
          message: 'unitId is required when action is "build"'
        });
      } else {
        const unit = registry.get(step.unitId);
        if (!unit) {
          errors.push({
            code: 'E_UNKNOWN_UNIT',
            stepId: step.id,
            message: `Unknown unit: ${step.unitId}`
          });
        } else {
          // Check faction compatibility
          if (unit.factionId && unit.factionId !== plan.factionId) {
            errors.push({
              code: 'E_WRONG_FACTION',
              stepId: step.id,
              message: `Unit ${unit.id} belongs to ${unit.factionId}, not plan faction ${plan.factionId}`
            });
          }

          // Check buildability
          let canBuild = false;
          if (step.actor.kind === 'commander') {
            canBuild = commander ? registry.canBuild(commander.id, step.unitId) : false;
          } else {
            canBuild = registry.canBuild(step.actor.unitId, step.unitId);
          }

          if (!canBuild) {
            errors.push({
              code: 'E_NOT_BUILDABLE',
              stepId: step.id,
              message: `Actor cannot build unit: ${step.unitId}`
            });
          }

          // Track newly built factories and mobile builders
          if (unit.isFactory || (unit.isBuilder && unit.canMove)) {
            const current = builtActors.get(unit.id) ?? 0;
            builtActors.set(unit.id, current + step.count);
          }
        }
      }
    } else if (step.action === 'assist') {
      if (!step.assistStepId) {
        errors.push({
          code: 'E_MISSING_FIELD',
          stepId: step.id,
          message: 'assistStepId is required when action is "assist"'
        });
      }
    } else if (step.action === 'reclaim') {
      if (!step.reclaim) {
        errors.push({
          code: 'E_MISSING_FIELD',
          stepId: step.id,
          message: 'reclaim payload is required when action is "reclaim"'
        });
      }
    }

    // Time order warning per actor
    if (step.targetTime !== undefined) {
      const prevTime = lastTargetTimeByActor.get(actorKey);
      if (prevTime !== undefined && step.targetTime < prevTime) {
        warnings.push({
          code: 'W_TIME_ORDER',
          stepId: step.id,
          message: `Step targetTime ${step.targetTime}s decreases from previous ${prevTime}s for actor ${actorKey}`
        });
      }
      lastTargetTimeByActor.set(actorKey, step.targetTime);
    }
  }

  return { errors, warnings };
}
