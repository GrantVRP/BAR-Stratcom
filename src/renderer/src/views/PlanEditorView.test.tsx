// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlanEditorView } from './PlanEditorView';
import { useSnapshot, usePlans } from '../stores';
import testSnapshot from '../../../core/registry/__test__/test-snapshot.json';
import type { UnitSnapshot, BuildPlan } from '../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const validPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'test-edit-plan',
  title: 'My Custom Rush',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason test-fixture',
  modes: ['1v1'],
  role: 'front',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'manual', createdAt: '2026-10-01T00:00:00Z' },
  steps: [
    {
      id: 'step-1',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armsolar',
      count: 1
    }
  ]
};

describe('PlanEditorView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useSnapshot.setState({ snapshot: testSnapshot as unknown as UnitSnapshot });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders plan editor with metadata and step rows', () => {
    act(() => {
      root.render(
        <PlanEditorView
          initialPlan={validPlan}
          onBack={vi.fn()}
        />
      );
    });

    const titleInput = container.querySelector<HTMLInputElement>('input[data-testid="input-plan-title"]');
    expect(titleInput?.value).toBe('My Custom Rush');

    const stepRows = container.querySelectorAll('[data-testid^="editor-step-row-"]');
    expect(stepRows.length).toBe(1);

    const saveBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-save-plan"]');
    expect(saveBtn?.disabled).toBe(false);
  });

  it('disables save button when title is cleared', () => {
    act(() => {
      root.render(
        <PlanEditorView
          initialPlan={validPlan}
          onBack={vi.fn()}
        />
      );
    });

    const titleInput = container.querySelector<HTMLInputElement>('input[data-testid="input-plan-title"]');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(titleInput, '');
      titleInput!.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const saveBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-save-plan"]');
    expect(saveBtn?.disabled).toBe(true);
  });

  it('allows deleting a step and shows empty state', () => {
    act(() => {
      root.render(
        <PlanEditorView
          initialPlan={validPlan}
          onBack={vi.fn()}
        />
      );
    });

    const deleteBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-delete-step-0"]');
    expect(deleteBtn).not.toBeNull();

    act(() => {
      deleteBtn?.click();
    });

    const stepRows = container.querySelectorAll('[data-testid^="editor-step-row-"]');
    expect(stepRows.length).toBe(0);
    expect(container.textContent).toContain('No steps yet.');
  });

  it('saves plan when clicking save button', async () => {
    const saveSpy = vi.spyOn(usePlans.getState(), 'savePlan').mockResolvedValue(validPlan);
    const handleSaved = vi.fn();

    act(() => {
      root.render(
        <PlanEditorView
          initialPlan={validPlan}
          onBack={vi.fn()}
          onSaved={handleSaved}
        />
      );
    });

    const saveBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-save-plan"]');
    await act(async () => {
      saveBtn?.click();
    });

    expect(saveSpy).toHaveBeenCalled();
    expect(handleSaved).toHaveBeenCalledWith(validPlan);
  });
});
