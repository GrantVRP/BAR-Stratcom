// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BenchmarkFile, SessionMeta } from '../../../../core/schemas';
import cortex1v1 from '../../../../../data/benchmarks/cortex-1v1.json';
import { BenchmarkChart, playerMetalIncome } from './BenchmarkChart';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const invoke = vi.fn();
vi.mock('../../lib/ipc-client', () => ({ ipcClient: { invoke: (...args: unknown[]) => invoke(...args) } }));

const meta: SessionMeta = {
  schemaVersion: 1,
  sessionId: 'sess-1',
  mode: 'player',
  gameVersion: 'test-31479-433a460',
  engineVersion: '2026.07.04',
  mapScriptName: 'Isidis crack 1.1',
  durationSec: 600,
  startedAt: '2026-10-04T12:00:00.000Z',
  teams: [
    { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isMe: true },
    { teamId: 1, allyTeamId: 1, playerName: 'Opponent', factionId: 'armada', isMe: false }
  ],
  start: null,
  source: 'live',
  anonymized: false
};

// Player-mode state docs as recorded by the widget (income under res.metal).
const states = Array.from({ length: 121 }, (_, i) => ({
  gameSeconds: i * 5,
  frame: i * 150,
  res: { metal: { income: i * 0.2 }, energy: { income: i * 2 } }
}));

describe('BenchmarkChart (T08.4)', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    invoke.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('asks for the benchmark of my faction + mode and draws the pro band with my line', async () => {
    invoke.mockResolvedValue({ ok: true, data: cortex1v1 as BenchmarkFile });
    await act(async () =>
      root.render(<BenchmarkChart meta={meta} states={states} benchmark={{ percentileMetalAt300: 25, percentileMetalAt600: 63 }} />)
    );
    expect(invoke).toHaveBeenCalledWith('benchmarks:get', { factionId: 'cortex', mode: '1v1' });
    expect(container.querySelector('[data-testid="benchmark-band"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="benchmark-you"]')).not.toBeNull();
    expect(container.textContent).toContain(`${cortex1v1.sampleCount} PRO`);
    expect(container.querySelector('[data-testid="benchmark-early-data"]')).toBeNull();
  });

  it('shows report percentiles as p0–p100 (they are already 0–100, not fractions)', async () => {
    invoke.mockResolvedValue({ ok: true, data: cortex1v1 as BenchmarkFile });
    await act(async () =>
      root.render(<BenchmarkChart meta={meta} states={states} benchmark={{ percentileMetalAt300: 25, percentileMetalAt600: 63 }} />)
    );
    expect(container.textContent).toContain('p25');
    expect(container.textContent).toContain('p63');
    expect(container.textContent).not.toContain('p2500');
  });

  it('labels a benchmark with fewer than 5 samples "early data"', async () => {
    invoke.mockResolvedValue({ ok: true, data: { ...(cortex1v1 as BenchmarkFile), sampleCount: 3 } });
    await act(async () => root.render(<BenchmarkChart meta={meta} states={states} />));
    expect(container.querySelector('[data-testid="benchmark-early-data"]')?.textContent).toBe('EARLY DATA');
  });

  it('explains when there is no benchmark, or no own team to compare', async () => {
    invoke.mockResolvedValue({ ok: true, data: null });
    await act(async () => root.render(<BenchmarkChart meta={meta} states={states} />));
    expect(container.textContent).toContain('No pro data for cortex 1v1 yet.');

    invoke.mockClear();
    const spectator = { ...meta, mode: 'replay' as const, teams: meta.teams.map((t) => ({ ...t, isMe: false })) };
    await act(async () => root.render(<BenchmarkChart meta={spectator} states={states} />));
    expect(invoke).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Only for your own games.');
  });

  it('reads my metal income every 5 s from player state docs, and nothing from spectator docs', () => {
    expect(playerMetalIncome(states).slice(0, 3)).toEqual([
      { t: 0, v: 0 },
      { t: 5, v: 0.2 },
      { t: 10, v: 0.4 }
    ]);
    expect(playerMetalIncome([{ gameSeconds: 5, res: null }])).toEqual([]);
    expect(playerMetalIncome(null)).toEqual([]);
  });
});
