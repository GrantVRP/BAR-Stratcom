// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SharePlanDialog } from './SharePlanDialog';
import type { BuildPlan } from '../../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const samplePlan: BuildPlan = {
  schemaVersion: 1,
  id: 'test-plan-1',
  title: 'Test Rush',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason test',
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

describe('SharePlanDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders share code starting with BSC1.', () => {
    act(() => {
      root.render(<SharePlanDialog plan={samplePlan} isOpen={true} onClose={vi.fn()} />);
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-testid="textarea-share-code"]');
    expect(textarea).not.toBeNull();
    expect(textarea?.value.startsWith('BSC1.')).toBe(true);
  });

  it('copies share code to clipboard', async () => {
    act(() => {
      root.render(<SharePlanDialog plan={samplePlan} isOpen={true} onClose={vi.fn()} />);
    });

    const copyBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-copy-share-code"]');
    expect(copyBtn).not.toBeNull();

    await act(async () => {
      copyBtn?.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('BSC1.'));
  });

  it('switches to discord text tab and copies discord text', async () => {
    act(() => {
      root.render(<SharePlanDialog plan={samplePlan} isOpen={true} onClose={vi.fn()} />);
    });

    const buttons = container.querySelectorAll('button');
    const discordTab = Array.from(buttons).find((b) => b.textContent?.includes('DISCORD TEXT'));
    expect(discordTab).toBeDefined();

    act(() => {
      discordTab?.click();
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[data-testid="textarea-discord-text"]');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('Test Rush');

    const copyDiscordBtn = container.querySelector<HTMLButtonElement>('button[data-testid="btn-copy-discord-text"]');
    await act(async () => {
      copyDiscordBtn?.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Test Rush'));
  });
});
