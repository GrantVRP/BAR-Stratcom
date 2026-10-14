// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BuildPlan } from '../../../../core/schemas';
import { setIpcClientOverride } from '../../lib/ipc-client';
import { useSnapshot } from '../../stores';
import { AiDraftDialog } from './AiDraftDialog';
import type { AiDraftResultData } from './AiDraftResult';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const plan: BuildPlan = {
  schemaVersion: 1,
  id: 'ai-armada-20261005120000',
  title: 'Test Draft',
  factionId: 'armada',
  gameVersion: 'test',
  modes: ['1v1'],
  role: 'front',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'ai-draft', provider: 'ollama', model: 'test-model', createdAt: '2026-10-05T12:00:00Z', repairRounds: 1 },
  steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 2 }]
};

const valid: AiDraftResultData = {
  plan,
  report: { errors: [], warnings: [], sim: { energyStallSec: 4.5, metalStallSec: 0, flags: ['windUnknown'] } },
  provider: 'ollama',
  model: 'test-model',
  rounds: 2
};

interface Fake {
  invoke: ReturnType<typeof vi.fn>;
  progress: (data: unknown) => void;
  resolveDraft: (res: unknown) => void;
}

function fakeIpc(): Fake {
  const fake: Fake = { invoke: vi.fn(), progress: () => undefined, resolveDraft: () => undefined };
  fake.invoke.mockImplementation((channel: string, req: unknown) => {
    if (channel === 'ai:draft') return new Promise((resolve) => (fake.resolveDraft = resolve));
    if (channel === 'plans:save') return Promise.resolve({ ok: true, data: req });
    if (channel === 'ai:cancel') return Promise.resolve({ ok: true, data: { cancelled: true } });
    return Promise.resolve({ ok: true, data: [] });
  });
  setIpcClientOverride({
    invoke: fake.invoke as never,
    on: ((event: string, cb: (data: unknown) => void) => {
      if (event === 'ai:progress') fake.progress = cb;
      return () => undefined;
    }) as never,
    isAvailable: () => true
  });
  return fake;
}

const byTestId = <T extends HTMLElement>(container: HTMLElement, id: string): T | null => container.querySelector<T>(`[data-testid="${id}"]`);

describe('AiDraftDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useSnapshot.setState({
      factions: [
        { id: 'armada', displayName: 'Armada', unitPrefix: 'arm', enabled: true, accent: '#449bed', commanderIds: ['armcom'] },
        { id: 'cortex', displayName: 'Cortex', unitPrefix: 'cor', enabled: true, accent: '#ff2244', commanderIds: ['corcom'] },
        { id: 'legion', displayName: 'Legion', unitPrefix: 'leg', enabled: false, accent: '#2ec4b6', commanderIds: ['legcom'] }
      ]
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setIpcClientOverride(null);
  });

  it('drafts with the chosen intent, shows progress, then saves the checked plan', async () => {
    const fake = fakeIpc();
    const onSaved = vi.fn();
    await act(async () => root.render(<AiDraftDialog onClose={vi.fn()} onSaved={onSaved} initial={{ factionId: 'cortex', opening: 'vehicle' }} />));

    const faction = byTestId<HTMLSelectElement>(container, 'ai-draft-factionId')!;
    expect([...faction.options].map((o) => o.value)).toEqual(['armada', 'cortex']);
    expect(faction.value).toBe('cortex');
    expect(byTestId<HTMLSelectElement>(container, 'ai-draft-opening')!.value).toBe('vehicle');

    const note = byTestId<HTMLTextAreaElement>(container, 'ai-draft-note')!;
    expect(note.maxLength).toBe(300);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(note, '  fast air  ');
      note.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => byTestId(container, 'ai-draft-start')!.click());
    expect(fake.invoke).toHaveBeenCalledWith('ai:draft', { factionId: 'cortex', mode: '1v1', role: 'any', opening: 'vehicle', skill: 'beginner', freeText: 'fast air' });
    expect(byTestId(container, 'ai-draft-running')!.textContent).toBe('DRAFTING…');
    await act(async () => fake.progress({ round: 2, phase: 'repair' }));
    expect(byTestId(container, 'ai-draft-running')!.textContent).toBe('FIXING PROBLEMS // ROUND 2 OF 3');

    await act(async () => fake.resolveDraft({ ok: true, data: valid }));
    const result = byTestId(container, 'ai-draft-result')!;
    expect(result.textContent).toContain('AI DRAFT');
    expect(result.textContent).toContain('ollama // test-model // 1 repair');
    expect(result.textContent).toContain('E-STALL 4.5s // M-STALL 0s');

    await act(async () => byTestId(container, 'ai-draft-save')!.click());
    expect(fake.invoke).toHaveBeenCalledWith('plans:save', plan);
    expect(onSaved).toHaveBeenCalledWith(plan);
  });

  it('cannot save a draft with errors, and explains an unusable answer', async () => {
    const fake = fakeIpc();
    await act(async () => root.render(<AiDraftDialog onClose={vi.fn()} onSaved={vi.fn()} />));
    expect(byTestId<HTMLSelectElement>(container, 'ai-draft-factionId')!.value).toBe('armada');

    await act(async () => byTestId(container, 'ai-draft-start')!.click());
    const errors = { errors: [{ code: 'E_UNKNOWN_UNIT' as const, stepId: 's1', message: 'Unknown unit: armxx' }], warnings: [], sim: null };
    await act(async () => fake.resolveDraft({ ok: true, data: { ...valid, report: errors, rounds: 3 } }));
    expect(byTestId<HTMLButtonElement>(container, 'ai-draft-save')!.disabled).toBe(true);
    expect(container.textContent).toContain('Unknown unit: armxx');

    await act(async () => byTestId(container, 'ai-draft-discard')!.click());
    await act(async () => byTestId(container, 'ai-draft-start')!.click());
    await act(async () => fake.resolveDraft({ ok: true, data: { ...valid, plan: null, report: errors } }));
    expect(byTestId(container, 'ai-draft-unusable')).not.toBeNull();

    await act(async () => byTestId(container, 'ai-draft-discard')!.click());
    await act(async () => byTestId(container, 'ai-draft-start')!.click());
    await act(async () => fake.resolveDraft({ ok: false, code: 'E_HANDLER_ERROR', message: 'Invalid key' }));
    expect(byTestId(container, 'ai-draft-error')!.textContent).toBe('Invalid key');
  });

  it('cancels a running draft and ignores its late answer', async () => {
    const fake = fakeIpc();
    await act(async () => root.render(<AiDraftDialog onClose={vi.fn()} onSaved={vi.fn()} />));
    await act(async () => byTestId(container, 'ai-draft-start')!.click());
    await act(async () => byTestId(container, 'ai-draft-cancel')!.click());
    expect(fake.invoke).toHaveBeenCalledWith('ai:cancel', undefined);
    expect(byTestId(container, 'ai-draft-form')).not.toBeNull();
    await act(async () => fake.resolveDraft({ ok: true, data: valid }));
    expect(byTestId(container, 'ai-draft-result')).toBeNull();
  });
});
