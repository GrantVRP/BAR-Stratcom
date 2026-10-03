// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimGraph } from './SimGraph';
import type { ChartSeries } from '../../../../core/sim';
import type { BuildPlan, MapRecord, UnitSnapshot } from '../../../../core/schemas';
import { useSnapshot } from '../../stores';
import testSnapshot from '../../../../core/registry/__test__/test-snapshot.json';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createMockSample(t: number, metalCurrent = 500, energyCurrent = 1000) {
  return {
    t,
    metal: { current: metalCurrent, storage: 1000, income: 15, spend: 10 },
    energy: { current: energyCurrent, storage: 2000, income: 50, spend: 30 },
    bpTotal: 100,
    bpActive: 100,
    stallMetal: t >= 60 && t < 120,
    stallEnergy: t >= 150 && t < 210
  };
}

const mockSeries: ChartSeries = {
  points: [
    createMockSample(0, 500, 1000),
    createMockSample(60, 0, 800),
    createMockSample(120, 200, 700),
    createMockSample(150, 300, 0),
    createMockSample(210, 400, 300),
    createMockSample(240, 1000, 1500),
    createMockSample(270, 1000, 1800),
    createMockSample(300, 800, 1200)
  ],
  intervals: {
    metalStall: [{ start: 60, end: 120 }],
    energyStall: [{ start: 150, end: 210 }],
    metalFloat: [{ start: 240, end: 270 }],
    energyFloat: []
  },
  totals: {
    metalStallSec: 60,
    energyStallSec: 60,
    idleBpSec: 0
  },
  flags: ['windUnknown', 'mexYieldEstimated']
};

describe('SimGraph', () => {
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

  it('renders stall intervals at exact expected x and width', () => {
    act(() => {
      root.render(<SimGraph chartSeries={mockSeries} />);
    });

    // viewWidth=640, padLeft=45, padRight=15 -> graphWidth=580
    // maxT = 300
    // metalStall: start=60, end=120
    // expected x = 45 + (60 / 300) * 580 = 45 + 116 = 161
    // expected width = (120 - 60)/300 * 580 = 116
    // energyStall: start=150, end=210
    // expected x = 45 + (150 / 300) * 580 = 45 + 290 = 335
    // expected width = (210 - 150)/300 * 580 = 116
    const stallRects = container.querySelectorAll<SVGRectElement>('rect[data-testid="stall-rect"]');
    expect(stallRects.length).toBe(2);

    expect(Number(stallRects[0]?.getAttribute('x'))).toBeCloseTo(161, 0);
    expect(Number(stallRects[0]?.getAttribute('width'))).toBeCloseTo(116, 0);

    expect(Number(stallRects[1]?.getAttribute('x'))).toBeCloseTo(335, 0);
    expect(Number(stallRects[1]?.getAttribute('width'))).toBeCloseTo(116, 0);
  });

  it('renders float intervals at exact expected x and width', () => {
    act(() => {
      root.render(<SimGraph chartSeries={mockSeries} />);
    });

    // metalFloat: start=240, end=270
    // expected x = 45 + (240 / 300) * 580 = 45 + 464 = 509
    // expected width = (270 - 240)/300 * 580 = 58
    const floatRects = container.querySelectorAll<SVGRectElement>('rect[data-testid="float-rect"]');
    expect(floatRects.length).toBe(1);

    expect(Number(floatRects[0]?.getAttribute('x'))).toBeCloseTo(509, 0);
    expect(Number(floatRects[0]?.getAttribute('width'))).toBeCloseTo(58, 0);
  });

  it('renders SIMULATED badge and sim flags', () => {
    act(() => {
      root.render(<SimGraph chartSeries={mockSeries} />);
    });

    const badge = container.querySelector('[data-testid="provenance-SIMULATED"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('SIMULATED');

    const windFlag = container.querySelector('[data-testid="sim-flag-windUnknown"]');
    expect(windFlag).not.toBeNull();
    expect(windFlag?.textContent).toContain('WIND UNKNOWN');

    const mexFlag = container.querySelector('[data-testid="sim-flag-mexYieldEstimated"]');
    expect(mexFlag).not.toBeNull();
    expect(mexFlag?.textContent).toContain('ESTIMATED MEX');
  });

  it('renders startEstimated and horizonReached human labels', () => {
    const flagSeries: ChartSeries = {
      ...mockSeries,
      flags: ['startEstimated', 'horizonReached']
    };
    act(() => {
      root.render(<SimGraph chartSeries={flagSeries} />);
    });

    const startFlag = container.querySelector('[data-testid="sim-flag-startEstimated"]');
    expect(startFlag?.textContent).toContain('ESTIMATED START');

    const horizonFlag = container.querySelector('[data-testid="sim-flag-horizonReached"]');
    expect(horizonFlag?.textContent).toContain('HORIZON REACHED');
  });

  it('allows switching between STORED and FLOW metric modes', () => {
    act(() => {
      root.render(<SimGraph chartSeries={mockSeries} />);
    });

    const buttons = container.querySelectorAll('button');
    const flowButton = Array.from(buttons).find((b) => b.textContent?.includes('FLOW'));
    expect(flowButton).toBeDefined();

    act(() => {
      flowButton?.click();
    });

    expect(flowButton?.className).toContain('text-[#449bed]');

    const storedButton = Array.from(buttons).find((b) => b.textContent?.includes('STORED'));
    expect(storedButton).toBeDefined();

    act(() => {
      storedButton?.click();
    });

    expect(storedButton?.className).toContain('text-[#449bed]');
  });

  it('displays scrubber and readout when scrubbing over svg', () => {
    act(() => {
      root.render(<SimGraph chartSeries={mockSeries} />);
    });

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    // Mock getBoundingClientRect
    if (svg) {
      svg.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 640,
          height: 160,
          right: 640,
          bottom: 160,
          x: 0,
          y: 0,
          toJSON: () => {}
        }) as DOMRect;
    }

    // Move to x = 161 (which corresponds to t = 60s)
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 161,
        bubbles: true
      });
      svg?.dispatchEvent(mouseMoveEvent);
    });

    const scrubberLine = container.querySelector('[data-testid="scrubber-line"]');
    expect(scrubberLine).not.toBeNull();
    expect(Number(scrubberLine?.getAttribute('x1'))).toBeCloseTo(161, 0);

    const readout = container.querySelector('[data-testid="scrubber-readout"]');
    expect(readout).not.toBeNull();
    expect(readout?.textContent).toContain('T+1:00');
    expect(readout?.textContent).toContain('STALL');

    // Move out
    act(() => {
      svg?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
      svg?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      svg?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="scrubber-line"]')).toBeNull();
    expect(container.querySelector('[data-testid="scrubber-readout"]')).toBeNull();
  });

  it('renders fallback when series is null', () => {
    act(() => {
      root.render(<SimGraph chartSeries={null} />);
    });

    expect(container.textContent).toContain('SIMULATION DATA UNAVAILABLE');
  });

  it('simulates from plan and mapRecord when snapshot is present in store', () => {
    useSnapshot.setState({ snapshot: testSnapshot as unknown as UnitSnapshot });

    const minimalPlan: BuildPlan = {
      id: 'test-plan',
      schemaVersion: 1,
      title: 'Test Plan',
      factionId: 'armada',
      gameVersion: 'Beyond All Reason test-fixture',
      modes: ['1v1'],
      role: 'front',
      opening: 'bot',
      energyStyle: 'wind',
      skill: 'beginner',
      source: { kind: 'manual', createdAt: '2026-10-01T00:00:00.000Z' },
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

    const minimalMap: MapRecord = {
      fileName: 'test_map',
      scriptName: 'Test Map',
      name: 'Test Map',
      author: 'Test',
      sizeX: 16,
      sizeZ: 16,
      wind: { min: 5, max: 15 },
      tidalStrength: 0,
      maxMetal: 1.0,
      extractorRadius: 80,
      gravity: 120,
      startPositions: [],
      hasWater: false,
      popularity: null,
      mexYield: null
    };

    act(() => {
      root.render(<SimGraph plan={minimalPlan} mapRecord={minimalMap} />);
    });

    const simGraph = container.querySelector('[data-testid="sim-graph"]');
    expect(simGraph).not.toBeNull();
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
});
