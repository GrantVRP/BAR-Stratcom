// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StepAdherenceChart } from './StepAdherenceChart';
import type { SessionReportStep } from '../../../../core/schemas/report';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sampleSteps: SessionReportStep[] = [
  { stepId: 'step-1', plannedFinish: 35, actualFinish: 33, deltaSec: -2 },
  { stepId: 'step-2', plannedFinish: 60, actualFinish: 72, deltaSec: 12 },
  { stepId: 'step-3', plannedFinish: 90, actualFinish: null, deltaSec: null }
];

describe('StepAdherenceChart (06 §4.6, T07.4)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders step rows with delta badges, times, and adherence summary', async () => {
    await act(async () => {
      root?.render(<StepAdherenceChart steps={sampleSteps} />);
    });

    const chart = container?.querySelector('[data-testid="step-adherence-chart"]');
    expect(chart).not.toBeNull();
    expect(chart?.textContent).toContain('STEP ADHERENCE TIMELINE');
    expect(chart?.textContent).toContain('COMPLETED: 2/3');

    // Row 0: On-time (-2s)
    const row0 = container?.querySelector('[data-testid="adherence-row-0"]');
    expect(row0?.textContent).toContain('-2s');

    // Row 1: Late (+12s)
    const row1 = container?.querySelector('[data-testid="adherence-row-1"]');
    expect(row1?.textContent).toContain('+12s');

    // Row 2: Missed
    const row2 = container?.querySelector('[data-testid="adherence-row-2"]');
    expect(row2?.textContent).toContain('SKIP');
  });

  it('handles empty step list gracefully', async () => {
    await act(async () => {
      root?.render(<StepAdherenceChart steps={[]} />);
    });

    const chart = container?.querySelector('[data-testid="step-adherence-chart"]');
    expect(chart?.textContent).toContain('NO PLAN STEPS TO EVALUATE');
  });
});
