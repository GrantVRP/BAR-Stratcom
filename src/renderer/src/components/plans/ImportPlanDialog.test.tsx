// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportPlanDialog } from './ImportPlanDialog';
import { setIpcClientOverride } from '../../lib/ipc-client';
import type { BuildPlan } from '../../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const importedPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'imported-plan-1',
  title: 'Imported Plan',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason',
  modes: ['1v1'],
  role: 'front',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'manual', createdAt: '2026-10-01T00:00:00Z' },
  steps: []
};

describe('ImportPlanDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    setIpcClientOverride(null);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    setIpcClientOverride(null);
  });

  it('shows error when submitting empty input', async () => {
    act(() => {
      root.render(<ImportPlanDialog isOpen={true} onClose={vi.fn()} />);
    });

    const submitBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-submit-import"]');
    expect(submitBtn?.disabled).toBe(true);
  });

  it('submits code via IPC when share code is provided', async () => {
    const invokeMock = vi.fn().mockResolvedValue({
      ok: true,
      data: importedPlan
    });
    setIpcClientOverride({
      invoke: invokeMock,
      on: vi.fn().mockReturnValue(() => {}),
      isAvailable: vi.fn().mockReturnValue(true)
    });

    const handleImported = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <ImportPlanDialog
          isOpen={true}
          onClose={handleClose}
          onImported={handleImported}
        />
      );
    });

    const input = container.querySelector<HTMLTextAreaElement>('textarea[data-testid="input-import-code"]');
    expect(input).not.toBeNull();

    act(() => {
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      descriptor?.set?.call(input, 'BSC1.fakecode.12345678');
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      input!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const submitBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-submit-import"]');
    await act(async () => {
      submitBtn?.click();
    });

    expect(invokeMock).toHaveBeenCalledWith('plans:import', { shareCode: 'BSC1.fakecode.12345678' });
    expect(handleImported).toHaveBeenCalledWith(importedPlan);
    expect(handleClose).toHaveBeenCalled();
  });
});
