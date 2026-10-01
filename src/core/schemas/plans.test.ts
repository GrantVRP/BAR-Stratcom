import { describe, expect, it } from 'vitest';
import {
  ActorCommanderSchema,
  ActorFactorySchema,
  ActorBuilderSchema,
  ActorSchema,
  AiBuildStepSchema,
  AiPlanDraftSchema,
  BuildPlanSchema,
  BuildStepSchema,
  PlanSourceSchema
} from './plans';

describe('plans schemas', () => {
  const commanderActor = { kind: 'commander' as const };
  const factoryActor = { kind: 'factory' as const, unitId: 'armlab', index: 1 };
  const builderActor = { kind: 'builder' as const, unitId: 'armck', index: 1 };

  const validStep = {
    id: 'step-1',
    actor: commanderActor,
    action: 'build' as const,
    unitId: 'armsolar',
    count: 1,
    targetTime: 15,
    text: 'Build first solar'
  };

  const validCuratedSource = {
    kind: 'curated' as const,
    replayId: 'rep123',
    player: 'ProPlayer',
    playerRating: 35.5,
    map: 'supreme_isthmus_v2.1',
    playedAt: '2026-09-01T12:00:00Z',
    gameVersion: '105.1.1-2550',
    reviewedBy: 'Owner',
    reviewedAt: '2026-09-02T12:00:00Z'
  };

  const validPlan = {
    schemaVersion: 1,
    id: 'armada-1v1-bot-rocketeer-01',
    title: 'Rocketeer Rush',
    description: 'Fast aggression with bots',
    factionId: 'arm',
    gameVersion: '105.1.1-2550',
    modes: ['1v1' as const],
    role: 'front' as const,
    skill: 'beginner' as const,
    opening: 'bot' as const,
    energyStyle: 'solar' as const,
    mapFit: {
      windMin: 0,
      windMax: 10
    },
    source: validCuratedSource,
    steps: [validStep],
    notes: 'Keep energy positive',
    tags: ['rush', 'beginner-friendly']
  };

  describe('ActorSchema', () => {
    it('accepts valid actors', () => {
      expect(ActorCommanderSchema.parse(commanderActor)).toEqual(commanderActor);
      expect(ActorFactorySchema.parse(factoryActor)).toEqual(factoryActor);
      expect(ActorBuilderSchema.parse(builderActor)).toEqual(builderActor);
      expect(ActorSchema.parse(commanderActor)).toEqual(commanderActor);
      expect(ActorSchema.parse(factoryActor)).toEqual(factoryActor);
      expect(ActorSchema.parse(builderActor)).toEqual(builderActor);
    });

    it('rejects invalid actors', () => {
      expect(ActorSchema.safeParse({ kind: 'other' }).success).toBe(false);
      expect(ActorSchema.safeParse({ kind: 'factory', unitId: 'armlab', index: 0 }).success).toBe(false);
      expect(ActorSchema.safeParse({ kind: 'builder', index: 1 }).success).toBe(false);
    });
  });

  describe('BuildStepSchema and AiBuildStepSchema', () => {
    it('accepts valid build step', () => {
      expect(BuildStepSchema.parse(validStep)).toEqual(validStep);
    });

    it('accepts valid non-build steps without unitId', () => {
      const reclaimStep = {
        id: 'step-2',
        actor: commanderActor,
        action: 'reclaim' as const,
        count: 1,
        reclaim: { metal: 100, energy: 0, durationSec: 5 }
      };
      expect(BuildStepSchema.parse(reclaimStep)).toEqual(reclaimStep);

      const noteStep = {
        id: 'step-3',
        actor: commanderActor,
        action: 'note' as const,
        count: 1,
        text: 'Watch for scout'
      };
      expect(BuildStepSchema.parse(noteStep)).toEqual(noteStep);

      const assistStep = {
        id: 'step-4',
        actor: commanderActor,
        action: 'assist' as const,
        count: 1,
        assistStepId: 'step-1'
      };
      expect(BuildStepSchema.parse(assistStep)).toEqual(assistStep);
    });

    it('rejects build step when action is "build" but unitId is missing', () => {
      const invalidBuild = {
        id: 'step-err',
        actor: commanderActor,
        action: 'build',
        count: 1
      };
      const res = BuildStepSchema.safeParse(invalidBuild);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((issue) => issue.path.includes('unitId'))).toBe(true);
      }
    });

    it('rejects count out of 1..50 bounds', () => {
      expect(BuildStepSchema.safeParse({ ...validStep, count: 0 }).success).toBe(false);
      expect(BuildStepSchema.safeParse({ ...validStep, count: 51 }).success).toBe(false);
    });

    it('rejects text over 80 chars', () => {
      expect(
        BuildStepSchema.safeParse({
          ...validStep,
          text: 'a'.repeat(81)
        }).success
      ).toBe(false);
    });

    it('AiBuildStepSchema allows optional id and validates unitId for build', () => {
      const aiStepWithoutId = {
        actor: commanderActor,
        action: 'build' as const,
        unitId: 'armsolar',
        count: 1
      };
      expect(AiBuildStepSchema.parse(aiStepWithoutId)).toEqual(aiStepWithoutId);

      const aiInvalidBuild = {
        actor: commanderActor,
        action: 'build',
        count: 1
      };
      expect(AiBuildStepSchema.safeParse(aiInvalidBuild).success).toBe(false);
    });
  });

  describe('PlanSourceSchema', () => {
    it('accepts each kind of source', () => {
      const sources = [
        validCuratedSource,
        {
          kind: 'replay-capture' as const,
          sessionId: 's1',
          player: 'P1',
          map: 'isthmus',
          capturedAt: '2026-09-01'
        },
        {
          kind: 'own-game' as const,
          sessionId: 's2',
          map: 'isthmus',
          capturedAt: '2026-09-01'
        },
        {
          kind: 'adapted' as const,
          fromPlanId: 'p1',
          transforms: ['wind-to-solar'],
          createdAt: '2026-09-01'
        },
        {
          kind: 'ai-draft' as const,
          provider: 'anthropic',
          model: 'claude-3-7-sonnet',
          createdAt: '2026-09-01',
          repairRounds: 0
        },
        {
          kind: 'manual' as const,
          createdAt: '2026-09-01'
        }
      ];

      for (const src of sources) {
        expect(PlanSourceSchema.parse(src)).toEqual(src);
      }
    });

    it('rejects invalid source kind or missing fields', () => {
      expect(PlanSourceSchema.safeParse({ kind: 'unknown' }).success).toBe(false);
      expect(PlanSourceSchema.safeParse({ kind: 'manual' /* missing createdAt */ }).success).toBe(false);
    });
  });

  describe('BuildPlanSchema and AiPlanDraftSchema', () => {
    it('accepts valid plan', () => {
      expect(BuildPlanSchema.parse(validPlan)).toEqual(validPlan);
    });

    it('rejects plan title over 60 chars', () => {
      expect(BuildPlanSchema.safeParse({ ...validPlan, title: 'a'.repeat(61) }).success).toBe(false);
    });

    it('rejects plan description over 400 chars', () => {
      expect(BuildPlanSchema.safeParse({ ...validPlan, description: 'a'.repeat(401) }).success).toBe(false);
    });

    it('rejects plan with empty steps or > 120 steps', () => {
      expect(BuildPlanSchema.safeParse({ ...validPlan, steps: [] }).success).toBe(false);
      const manySteps = Array.from({ length: 121 }, (_, i) => ({ ...validStep, id: `step-${i}` }));
      expect(BuildPlanSchema.safeParse({ ...validPlan, steps: manySteps }).success).toBe(false);
    });

    it('accepts valid AiPlanDraftSchema', () => {
      const draft = {
        title: 'Draft Plan',
        factionId: 'arm',
        modes: ['1v1' as const],
        role: 'front' as const,
        skill: 'beginner' as const,
        opening: 'bot' as const,
        energyStyle: 'solar' as const,
        steps: [
          {
            actor: commanderActor,
            action: 'build' as const,
            unitId: 'armsolar',
            count: 1
          }
        ]
      };
      expect(AiPlanDraftSchema.parse(draft)).toEqual(draft);
    });
  });
});
