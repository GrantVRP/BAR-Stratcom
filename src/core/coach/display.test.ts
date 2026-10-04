import { describe, it, expect } from 'vitest';
import type { BuildPlan } from '../schemas/plans';
import type { CoachStep, Alert } from '../schemas/coach';
import type { Registry } from '../registry';
import { buildCoachHud, formatTimeMinutesSeconds, truncateTo36 } from './display';

describe('Coach Engine: HUD Display Model', () => {
  it('formats time as m:ss correctly', () => {
    expect(formatTimeMinutesSeconds(0)).toBe('0:00');
    expect(formatTimeMinutesSeconds(8)).toBe('0:08');
    expect(formatTimeMinutesSeconds(65)).toBe('1:05');
    expect(formatTimeMinutesSeconds(360)).toBe('6:00');
    expect(formatTimeMinutesSeconds(3605)).toBe('60:05');
  });

  it('truncates strings over 36 characters with ellipsis', () => {
    const short = 'SHORT LINE';
    expect(truncateTo36(short)).toBe('SHORT LINE');

    const exact36 = 'A'.repeat(36);
    expect(truncateTo36(exact36)).toBe(exact36);
    expect(truncateTo36(exact36).length).toBe(36);

    const long50 = 'A'.repeat(50);
    const truncated = truncateTo36(long50);
    expect(truncated.length).toBe(36);
    expect(truncated.endsWith('…')).toBe(true);
  });

  it('property test: guarantees every HUD line <= 36 characters for any name length', () => {
    // Generate name lengths from 1 to 80 chars
    for (let len = 1; len <= 80; len++) {
      const name = 'X'.repeat(len);
      const mockRegistry = {
        get: () => ({ id: 'u1', name })
      } as unknown as Registry;

      const plan: BuildPlan = {
        schemaVersion: 1,
        id: 'p1',
        title: 'T'.repeat(len),
        factionId: 'armada',
        gameVersion: '1.0.0',
        modes: ['1v1'],
        role: 'any',
        skill: 'beginner',
        opening: 'bot',
        energyStyle: 'solar',
        source: { kind: 'manual', createdAt: '2026-10-02' },
        steps: [
          {
            id: 's0',
            actor: { kind: 'commander' },
            action: 'build',
            unitId: 'u1',
            count: 2,
            targetTime: 20
          }
        ]
      };

      const steps: CoachStep[] = [
        {
          stepId: 's0',
          status: 'current',
          plannedStart: 10,
          plannedFinish: 30,
          actualFinish: null
        }
      ];

      const alerts: Alert[] = [
        {
          id: 'E_STALLING',
          severity: 'danger',
          text: 'E'.repeat(len),
          since: 10,
          dedupeKey: 'E_STALLING'
        },
        {
          id: 'IDLE_FACTORY',
          severity: 'warn',
          text: 'F'.repeat(len),
          since: 10,
          dedupeKey: 'IDLE_FACTORY'
        }
      ];

      const hud = buildCoachHud({
        plan,
        steps,
        currentStepIndex: 0,
        aheadBehindSec: -25,
        activeAlerts: alerts,
        registry: mockRegistry,
        clock: 15
      });

      expect(hud.lines.length).toBeLessThanOrEqual(4);
      for (const line of hud.lines) {
        expect(line.text.length).toBeLessThanOrEqual(36);
      }
      expect(hud.title.length).toBeLessThanOrEqual(36);
    }
  });

  it('builds HUD display matching 04 §3.4 format', () => {
    const plan: BuildPlan = {
      schemaVersion: 1,
      id: 'p1',
      title: 'Rocketeer 1v1',
      factionId: 'armada',
      gameVersion: '1.0.0',
      modes: ['1v1'],
      role: 'any',
      skill: 'intermediate',
      opening: 'bot',
      energyStyle: 'solar',
      source: { kind: 'manual', createdAt: '2026-10-02' },
      steps: [
        {
          id: 's0',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armmex',
          count: 2,
          targetTime: 20
        },
        {
          id: 's1',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armsolar',
          count: 1,
          targetTime: 40
        }
      ]
    };

    const mockRegistry = {
      get: (id: string) => {
        if (id === 'armmex') return { id: 'armmex', name: 'Metal Extractor' };
        if (id === 'armsolar') return { id: 'armsolar', name: 'Solar Collector' };
        return undefined;
      }
    } as unknown as Registry;

    const steps: CoachStep[] = [
      { stepId: 's0', status: 'done', plannedStart: 0, plannedFinish: 20, actualFinish: 17 },
      { stepId: 's1', status: 'current', plannedStart: 20, plannedFinish: 40, actualFinish: null }
    ];

    const alerts: Alert[] = [
      { id: 'E_STALL_SOON', severity: 'warn', text: 'ENERGY EMPTY IN 6s', since: 25, dedupeKey: '1' },
      { id: 'IDLE_FACTORY', severity: 'warn', text: 'FACTORY IDLE', since: 26, dedupeKey: '2' },
      { id: 'SCOUT_REMINDER', severity: 'info', text: 'GET RADAR / SCOUT', since: 20, dedupeKey: '3' }
    ];

    const hud = buildCoachHud({
      plan,
      steps,
      currentStepIndex: 1,
      aheadBehindSec: 3,
      activeAlerts: alerts,
      registry: mockRegistry,
      clock: 32
    });

    expect(hud.title).toBe('ARMADA // ROCKETEER 1V1');
    expect(hud.lines).toHaveLength(4);
    // Line 1: Next step
    expect(hud.lines[0]!.text).toContain('NEXT 1× Solar Collector');
    expect(hud.lines[0]!.text).toContain('in 0:08');
    expect(hud.lines[0]!.big).toBe(true);
    // Line 2: Plan pace
    expect(hud.lines[1]!.text).toBe('PLAN  +3s AHEAD');
    expect(hud.lines[1]!.tone).toBe('good');
    // Lines 3 & 4: Top 2 alerts
    expect(hud.lines[2]!.text).toBe('⚠ ENERGY EMPTY IN 6s');
    expect(hud.lines[3]!.text).toBe('⚠ FACTORY IDLE');
    // Progress
    expect(hud.progress).toEqual({ done: 1, total: 2 });
  });

  it('renders "Vehicle Plant" for corvp with the real snapshot registry, never raw corvp', async () => {
    const { createRegistry } = await import('../registry');
    const aliasesData = (await import('../../../data/aliases.json')).default;
    const factionsData = (await import('../../../data/factions.json')).default;
    const defaultSnapshotData = (await import('../../../data/snapshots/test-31479-433a460/units.json')).default;
    const { AliasesFileSchema, FactionsFileSchema, UnitSnapshotSchema } = await import('../schemas');

    const snapshot = UnitSnapshotSchema.parse(defaultSnapshotData);
    const factions = FactionsFileSchema.parse(factionsData);
    const aliases = AliasesFileSchema.parse(aliasesData);
    const realRegistry = createRegistry(snapshot, factions, aliases);

    const plan: BuildPlan = {
      schemaVersion: 1,
      id: 'p-corvp',
      title: 'Cortex Test',
      factionId: 'cortex',
      gameVersion: 'test-31479-433a460',
      modes: ['1v1'],
      role: 'any',
      skill: 'intermediate',
      opening: 'vehicle',
      energyStyle: 'wind',
      source: { kind: 'manual', createdAt: '2026-10-03' },
      steps: [
        {
          id: 's0',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'corvp',
          count: 1,
          targetTime: 85
        }
      ]
    };

    const steps: CoachStep[] = [
      { stepId: 's0', status: 'current', plannedStart: 0, plannedFinish: 85, actualFinish: null }
    ];

    const hud = buildCoachHud({
      plan,
      steps,
      currentStepIndex: 0,
      aheadBehindSec: 0,
      activeAlerts: [],
      registry: realRegistry,
      clock: 10
    });

    expect(hud.lines[0]!.text).toContain('Vehicle Plant');
    expect(hud.lines[0]!.text).not.toContain('corvp');
  });

  it('renders "Unknown unit" and never raw unitId when unit is missing from registry', () => {
    const emptyRegistry = {
      get: () => undefined
    } as unknown as Registry;

    const plan: BuildPlan = {
      schemaVersion: 1,
      id: 'p-missing',
      title: 'Missing Unit Plan',
      factionId: 'cortex',
      gameVersion: '1.0.0',
      modes: ['1v1'],
      role: 'any',
      skill: 'beginner',
      opening: 'bot',
      energyStyle: 'solar',
      source: { kind: 'manual', createdAt: '2026-10-03' },
      steps: [
        {
          id: 's0',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'cor_missing_xyz',
          count: 1,
          targetTime: 30
        }
      ]
    };

    const steps: CoachStep[] = [
      { stepId: 's0', status: 'current', plannedStart: 0, plannedFinish: 30, actualFinish: null }
    ];

    const hud = buildCoachHud({
      plan,
      steps,
      currentStepIndex: 0,
      aheadBehindSec: null,
      activeAlerts: [],
      registry: emptyRegistry,
      clock: 5
    });

    expect(hud.lines[0]!.text).toContain('Unknown unit');
    expect(hud.lines[0]!.text).not.toContain('cor_missing_xyz');
  });
});
