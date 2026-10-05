import type { AiProvider, DraftRequest } from '../types';

const COM = { kind: 'commander' };
const LAB = { kind: 'factory', unitId: 'armlab', index: 1 };
const CK = { kind: 'builder', unitId: 'armck', index: 1 };

/** A valid armada bot opening in the AiPlanDraft shape (unit ids from the snapshot). */
export function validDraft(): Record<string, unknown> & { steps: Array<Record<string, unknown>> } {
  return {
    title: 'Pawn opening',
    factionId: 'armada',
    modes: ['1v1'],
    role: 'front',
    skill: 'beginner',
    opening: 'bot',
    energyStyle: 'wind',
    steps: [
      { actor: COM, action: 'build', unitId: 'armmex', count: 2, targetTime: 0 },
      { actor: COM, action: 'build', unitId: 'armwin', count: 2 },
      { actor: COM, action: 'build', unitId: 'armlab', count: 1 },
      { actor: LAB, action: 'build', unitId: 'armck', count: 1 },
      { actor: LAB, action: 'build', unitId: 'armpw', count: 2 },
      { actor: COM, action: 'build', unitId: 'armmex', count: 1 },
      { actor: COM, action: 'build', unitId: 'armwin', count: 2 },
      { actor: CK, action: 'build', unitId: 'armmex', count: 2 },
      { id: 'pw-wave', actor: LAB, action: 'build', unitId: 'armpw', count: 3 },
      { actor: CK, action: 'build', unitId: 'armsolar', count: 1 },
      { actor: COM, action: 'assist', assistStepId: 'pw-wave', count: 1 }
    ]
  };
}

export type Answer = unknown | ((signal: AbortSignal) => Promise<unknown>);

/** A provider that plays back scripted answers, one per call. */
export function scripted(answers: Answer[]): AiProvider & { calls: DraftRequest[] } {
  const calls: DraftRequest[] = [];
  return {
    id: 'anthropic',
    needsKey: true,
    calls,
    listModels: async () => [],
    draft: async (req, signal) => {
      calls.push(req);
      const next = answers[calls.length - 1];
      return typeof next === 'function' ? (next as (s: AbortSignal) => Promise<unknown>)(signal) : structuredClone(next);
    }
  };
}
