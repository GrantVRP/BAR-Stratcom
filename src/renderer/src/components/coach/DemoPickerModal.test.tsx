// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoPickerModal } from './DemoPickerModal';
import type { DemoInfo } from '../../../../shared/ipc';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DemoPickerModal (T06.12)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const sampleDemos: DemoInfo[] = [
    {
      id: '2026-10-01-cortex-1v1-vs-ai-barr',
      title: 'Cortex on BarR 1.1',
      description: '1v1 vs AI • 33:45',
      durationSec: 2025
    },
    {
      id: '2026-10-02-cortex-1v1-vs-ai-altair',
      title: 'Cortex on Altair Crossing V4.1',
      description: '1v1 vs AI • 37:00',
      durationSec: 2220
    }
  ];

  it('renders nothing when isOpen is false', () => {
    act(() => {
      root.render(
        <DemoPickerModal
          isOpen={false}
          demos={sampleDemos}
          onSelectDemo={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-testid="demo-picker-modal"]')).toBeNull();
  });

  it('renders modal and pre-selects the most recent fixture', () => {
    act(() => {
      root.render(
        <DemoPickerModal
          isOpen={true}
          demos={sampleDemos}
          onSelectDemo={vi.fn()}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-testid="demo-picker-modal"]')).not.toBeNull();
    expect(container.textContent).toContain('CHOOSE DEMO FIXTURE');
    expect(container.textContent).toContain('★ MOST RECENT');
  });

  it('triggers onSelectDemo with selected fixture when start button is clicked', async () => {
    const onSelect = vi.fn();
    act(() => {
      root.render(
        <DemoPickerModal
          isOpen={true}
          demos={sampleDemos}
          onSelectDemo={onSelect}
          onClose={vi.fn()}
        />
      );
    });

    const startBtn = container.querySelector(
      '[data-testid="demo-picker-start-btn"]'
    ) as HTMLButtonElement;
    expect(startBtn).not.toBeNull();

    await act(async () => {
      startBtn.click();
    });

    // Most recent is the 2026-10-02 fixture
    expect(onSelect).toHaveBeenCalledWith('2026-10-02-cortex-1v1-vs-ai-altair');
  });
});
