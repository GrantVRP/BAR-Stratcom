import { describe, expect, it } from 'vitest';
import { avgWindFor } from '../../core/maps';
import { BuildPlanSchema } from '../../core/schemas';
import { getMap, loadAvgWindTable, loadMaps } from '../maps/loader';
import { loadRegistry } from '../registry/loader';
import { draftPlan, repairPrompt, type DraftInput, type DraftProgress } from './draft';
import { scripted, validDraft } from './__test__/fakes';
import { AiError, type AiProvider } from './types';

const COM = { kind: 'commander' };
const registry = loadRegistry();

function input(provider: AiProvider, extra: Partial<DraftInput> = {}): DraftInput {
  return {
    provider,
    model: 'claude-opus-5-5',
    registry,
    intent: { factionId: 'armada', mode: '1v1', role: 'front', opening: 'bot', skill: 'beginner' },
    map: null,
    avgWind: null,
    library: [],
    createdAt: '2026-10-05T12:00:00.000Z',
    timeoutMs: 5_000,
    ...extra
  };
}

describe('AI drafting pipeline (T08.7, 04 §6.1)', () => {
  it('accepts a valid first answer: our step ids, ai-draft source, simulated', async () => {
    const map = loadMaps().find((m) => avgWindFor(m, loadAvgWindTable()) !== null)!;
    const provider = scripted([validDraft()]);
    const progress: DraftProgress[] = [];
    const result = await draftPlan(
      input(provider, { map, avgWind: avgWindFor(map, loadAvgWindTable()), onProgress: (p) => progress.push(p) })
    );

    expect(result.rounds).toBe(1);
    expect(result.report.errors).toEqual([]);
    expect(result.plan).not.toBeNull();
    const plan = BuildPlanSchema.parse(result.plan);
    expect(plan.steps.map((s) => s.id)).toEqual(plan.steps.map((_, i) => `s${i + 1}`));
    // the model's own id for the assisted step is mapped to ours
    expect(plan.steps[10]).toMatchObject({ action: 'assist', assistStepId: 's9' });
    expect(plan.source).toEqual({ kind: 'ai-draft', provider: 'anthropic', model: 'claude-opus-5-5', createdAt: '2026-10-05T12:00:00.000Z', repairRounds: 0 });
    expect(plan.gameVersion).toBe(registry.gameVersion);
    expect(result.report.sim).not.toBeNull();
    expect(result.report.sim!.flags).not.toContain('windUnknown');
    expect(progress).toEqual([
      { round: 1, phase: 'draft' },
      { round: 1, phase: 'simulate' }
    ]);
    expect(provider.calls[0]!.system).toContain('Hard rules');
    expect(provider.calls[0]!.user).toContain(`name: ${map.name}`);
  });

  it('repairs an unknown unitId, listing the step id and code', async () => {
    const bad = validDraft();
    bad.steps[4]!.unitId = 'armnotaunit';
    const provider = scripted([bad, validDraft()]);
    const result = await draftPlan(input(provider));

    expect(result.rounds).toBe(2);
    expect(result.report.errors).toEqual([]);
    expect(result.plan!.source).toMatchObject({ kind: 'ai-draft', repairRounds: 1 });
    const repair = provider.calls[1]!.user;
    expect(repair.startsWith(provider.calls[0]!.user)).toBe(true);
    expect(repair).toContain('YOUR PREVIOUS ANSWER');
    expect(repair).toContain('armnotaunit');
    expect(repair).toMatch(/step s5 .*E_UNKNOWN_UNIT/);
    expect(repair.trim().endsWith('Return the full corrected JSON.')).toBe(true);
  });

  it('repairs malformed JSON and answers that miss the contract', async () => {
    const provider = scripted(['Sure! Here is the plan: {"title": "Pawn', { ...validDraft(), steps: 'none' }, validDraft()]);
    const result = await draftPlan(input(provider));
    expect(result.rounds).toBe(3);
    expect(result.report.errors).toEqual([]);
    expect(provider.calls[1]!.user).toContain('E_SCHEMA: The answer is not valid JSON');
    expect(provider.calls[1]!.user).toContain('Sure! Here is the plan');
    expect(provider.calls[2]!.user).toMatch(/E_SCHEMA: steps: /);
  });

  it('stops after two failed repairs with the errors kept (not activatable, not simulated)', async () => {
    const bad = validDraft();
    bad.steps[2]!.actor = { kind: 'factory', unitId: 'armlab', index: 2 };
    const provider = scripted([bad, bad, bad, validDraft()]);
    const progress: DraftProgress[] = [];
    const result = await draftPlan(input(provider, { onProgress: (p) => progress.push(p) }));

    expect(provider.calls).toHaveLength(3);
    expect(result.rounds).toBe(3);
    expect(result.plan).not.toBeNull();
    expect(result.report.errors.map((e) => e.code)).toContain('E_ACTOR_NOT_AVAILABLE');
    expect(result.report.sim).toBeNull();
    expect(progress.map((p) => p.phase)).toEqual(['draft', 'repair', 'repair']);

    const never = scripted(['no', 'still no', 'never']);
    const empty = await draftPlan(input(never));
    expect(empty.plan).toBeNull();
    expect(empty.report.errors[0]!.code).toBe('E_SCHEMA');
  });

  it('enforces the hard rules the schema does not: faction, 10–40 steps, targetTime ≤ 600, no reclaim', async () => {
    const short = { ...validDraft(), factionId: 'cortex' };
    short.steps = short.steps.slice(0, 5);
    short.steps[1] = { ...short.steps[1], targetTime: 900 };
    short.steps[3] = { actor: COM, action: 'reclaim', count: 1, reclaim: { metal: 50, energy: 0, durationSec: 10 } };
    const provider = scripted([short, validDraft()]);
    await draftPlan(input(provider));
    const repair = provider.calls[1]!.user;
    expect(repair).toContain('E_WRONG_FACTION: factionId must be "armada"');
    expect(repair).toContain('Write 10 to 40 steps, got 5');
    expect(repair).toMatch(/step s2 .*targetTime must be at most 600/);
    expect(repair).toMatch(/step s4 .*reclaim/);
  });

  it('surfaces a refusal as AiError REFUSED', async () => {
    const provider = scripted([
      async () => {
        throw new AiError('REFUSED');
      }
    ]);
    await expect(draftPlan(input(provider))).rejects.toMatchObject({ code: 'REFUSED' });
  });

  it('cancels mid-flight even when the provider ignores the signal', async () => {
    const controller = new AbortController();
    let started!: () => void;
    const inFlight = new Promise<void>((resolve) => (started = resolve));
    const provider = scripted([
      () => {
        started();
        return new Promise(() => undefined);
      }
    ]);
    const pending = draftPlan(input(provider, { signal: controller.signal }));
    await inFlight;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(provider.calls).toHaveLength(1);

    controller.abort();
    await expect(draftPlan(input(scripted([validDraft()]), { signal: controller.signal }))).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('times out a provider that never answers, and maps unknown provider errors', async () => {
    const slow = scripted([() => new Promise(() => undefined)]);
    await expect(draftPlan(input(slow, { timeoutMs: 20 }))).rejects.toMatchObject({ code: 'TIMEOUT' });
    const broken = scripted([
      async () => {
        throw new Error('socket hang up');
      }
    ]);
    await expect(draftPlan(input(broken))).rejects.toMatchObject({ code: 'PROVIDER' });
  });

  it('builds the repair prompt from a text answer and caps the listed problems', () => {
    const errors = Array.from({ length: 30 }, (_, i) => ({ code: 'E_BAD_COUNT' as const, stepId: `s${i + 1}`, message: 'bad' }));
    const text = repairPrompt('CONTEXT', 'not json', errors);
    expect(text).toContain('not json');
    expect(text).toContain('step s1 (steps[0]) E_BAD_COUNT: bad');
    expect(text).toContain('- and 5 more');
    expect(getMap('no-such-map')).toBeNull();
  });
});
