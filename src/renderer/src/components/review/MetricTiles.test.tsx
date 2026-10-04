// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricTiles } from './MetricTiles';
import type { SessionReportMetrics } from '../../../../core/schemas/report';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sampleMetrics: SessionReportMetrics = {
  durationSec: 500,
  energyStallSec: 12.5,
  metalStallSec: 4.2,
  metalFloatSec: 22.0,
  energyFloatSec: 0,
  idleFactorySec: 3.5,
  idleBuilderSec: 15.0,
  idleCommanderSec: 6.0,
  bpUtilisation: 0.82,
  timeToFirstFactory: 38,
  timeToT2: null,
  incomeAt: { '180': null, '300': null, '480': null, '600': null }
};

describe('MetricTiles (06 §4.6, T07.4)', () => {
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

  it('renders all 7 metric tiles with numeric values, labels and one MEASURED badge for the group', async () => {
    await act(async () => {
      root?.render(<MetricTiles metrics={sampleMetrics} />);
    });

    const energyStall = container?.querySelector('[data-testid="metric-tile-energy-stall"]');
    expect(energyStall).not.toBeNull();
    expect(energyStall?.textContent).toContain('12.5s');
    expect(energyStall?.textContent).toContain('ENERGY STALL');
    // one provenance badge for the group, not one per tile (T06.16)
    expect(container?.querySelectorAll('[data-testid="provenance-MEASURED"]').length).toBe(1);

    const metalStall = container?.querySelector('[data-testid="metric-tile-metal-stall"]');
    expect(metalStall).not.toBeNull();
    expect(metalStall?.textContent).toContain('4.2s');

    const metalFloat = container?.querySelector('[data-testid="metric-tile-metal-float"]');
    expect(metalFloat).not.toBeNull();
    expect(metalFloat?.textContent).toContain('22.0s');

    const idleFactory = container?.querySelector('[data-testid="metric-tile-idle-factory"]');
    expect(idleFactory).not.toBeNull();
    expect(idleFactory?.textContent).toContain('3.5s');

    const idleBuilders = container?.querySelector('[data-testid="metric-tile-idle-builders"]');
    expect(idleBuilders).not.toBeNull();
    expect(idleBuilders?.textContent).toContain('15.0s');

    const idleCommander = container?.querySelector('[data-testid="metric-tile-idle-commander"]');
    expect(idleCommander).not.toBeNull();
    expect(idleCommander?.textContent).toContain('6.0s');

    const bpUtil = container?.querySelector('[data-testid="metric-tile-bp-utilisation"]');
    expect(bpUtil).not.toBeNull();
    expect(bpUtil?.textContent).toContain('82%');
  });
});
