import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSettings, useLive, usePlans, useCoach, useSessions } from './index';
import { setIpcClientOverride } from '../lib/ipc-client';
import type { BuildPlan, Settings } from '../../../core/schemas';
import type { HealthState } from '../../../shared/ipc';

describe('Zustand stores', () => {
  beforeEach(() => {
    useSettings.getState().reset();
    useLive.getState().reset();
    usePlans.getState().reset();
    useCoach.getState().reset();
    useSessions.getState().reset();
    setIpcClientOverride(null);
  });

  describe('useSettings', () => {
    it('initializes with null settings', () => {
      const state = useSettings.getState();
      expect(state.settings).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('loads settings via IPC and updates state', async () => {
      const mockSettings: Partial<Settings> = {
        profile: 'intermediate',
        activePlanId: 'plan-1'
      };

      setIpcClientOverride({
        invoke: vi.fn().mockResolvedValue({
          ok: true,
          data: mockSettings
        }),
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      await useSettings.getState().load();
      expect(useSettings.getState().settings).toEqual(mockSettings);
      expect(useSettings.getState().loading).toBe(false);
    });

    it('updates partial settings via IPC', async () => {
      const initialSettings = { profile: 'intermediate' } as unknown as Settings;
      const updatedSettings = { profile: 'advanced' } as unknown as Settings;

      useSettings.getState().setSettings(initialSettings);

      setIpcClientOverride({
        invoke: vi.fn().mockResolvedValue({
          ok: true,
          data: updatedSettings
        }),
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      const success = await useSettings.getState().update({ profile: 'advanced' });
      expect(success).toBe(true);
      expect(useSettings.getState().settings).toEqual(updatedSettings);
    });
  });

  describe('useLive', () => {
    it('initializes with default no-bar health status', () => {
      const state = useLive.getState();
      expect(state.health.status).toBe('no-bar');
      expect(state.snapshot).toBeNull();
    });

    it('updates health and snapshot via actions', () => {
      const newHealth: HealthState = {
        status: 'live',
        message: 'Match active',
        lastHeartbeat: 123456
      };
      useLive.getState().setHealth(newHealth);
      expect(useLive.getState().health).toEqual(newHealth);
    });

    it('subscribes to live:health and live:state IPC events', () => {
      let healthCb: ((data: unknown) => void) | undefined;
      let stateCb: ((data: unknown) => void) | undefined;
      const unsub = vi.fn();

      setIpcClientOverride({
        invoke: vi.fn().mockResolvedValue({ ok: true, data: {} }),
        on: vi.fn().mockImplementation((event: string, cb: (data: unknown) => void) => {
          if (event === 'live:health') healthCb = cb;
          if (event === 'live:state') stateCb = cb;
          return unsub;
        }),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      const cleanup = useLive.getState().subscribe();
      expect(healthCb).toBeDefined();
      expect(stateCb).toBeDefined();

      healthCb?.({ status: 'pregame', message: 'In lobby', lastHeartbeat: null });
      expect(useLive.getState().health.status).toBe('pregame');

      cleanup();
      expect(unsub).toHaveBeenCalledTimes(2);
    });
  });

  describe('usePlans', () => {
    const dummyPlan: BuildPlan = {
      id: 'plan-1',
      title: 'Armada Fast Eco',
      factionId: 'armada',
      modes: ['1v1'],
      steps: []
    } as unknown as BuildPlan;

    it('manages plans and active plan ID', async () => {
      setIpcClientOverride({
        invoke: vi.fn().mockResolvedValue({
          ok: true,
          data: [dummyPlan]
        }),
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      await usePlans.getState().loadPlans();
      expect(usePlans.getState().plans).toHaveLength(1);
      expect(usePlans.getState().getActivePlan()).toBeNull();

      usePlans.getState().setActivePlanId('plan-1');
      expect(usePlans.getState().getActivePlan()).toEqual(dummyPlan);
    });

    it('saves and deletes plans', async () => {
      setIpcClientOverride({
        invoke: vi.fn().mockImplementation(async (ch: string) => {
          if (ch === 'plans:save') return { ok: true, data: dummyPlan };
          if (ch === 'plans:delete') return { ok: true, data: { ok: true } };
          return { ok: false, code: 'UNKNOWN', message: '' };
        }),
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      await usePlans.getState().savePlan(dummyPlan);
      expect(usePlans.getState().plans).toHaveLength(1);

      usePlans.getState().setActivePlanId('plan-1');
      await usePlans.getState().deletePlan('plan-1');
      expect(usePlans.getState().plans).toHaveLength(0);
      expect(usePlans.getState().activePlanId).toBeNull();
    });
  });

  describe('useCoach', () => {
    it('starts and stops coaching mode', async () => {
      setIpcClientOverride({
        invoke: vi.fn().mockImplementation(async (ch: string) => {
          if (ch === 'coach:start') return { ok: true, data: { ok: true } };
          if (ch === 'coach:stop') return { ok: true, data: { ok: true } };
          return { ok: false, code: 'UNKNOWN', message: '' };
        }),
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      const started = await useCoach.getState().start({ mode: 'live', planId: 'p1' });
      expect(started).toBe(true);
      expect(useCoach.getState().isRunning).toBe(true);
      expect(useCoach.getState().mode).toBe('live');

      const stopped = await useCoach.getState().stop();
      expect(stopped).toBe(true);
      expect(useCoach.getState().isRunning).toBe(false);
      expect(useCoach.getState().mode).toBe('off');
    });

    it('dispatches manual action and markDone', async () => {
      const mockInvoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
      setIpcClientOverride({
        invoke: mockInvoke,
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      await useCoach.getState().manualAction('start');
      expect(mockInvoke).toHaveBeenCalledWith('coach:manual', { action: 'start' });

      await useCoach.getState().markDone('step-1');
      expect(mockInvoke).toHaveBeenCalledWith('coach:markDone', { stepId: 'step-1' });
    });
  });

  describe('useSessions', () => {
    it('initializes with empty sessions and null latestSession', () => {
      const state = useSessions.getState();
      expect(state.sessions).toEqual([]);
      expect(state.latestSession).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('loads sessions and fetches latest session with report', async () => {
      const mockSummaries = [
        {
          sessionId: 'sess-1',
          startedAt: '2026-10-01T00:00:00.000Z',
          durationSec: 100,
          mapScriptName: 'Map',
          mode: 'player' as const,
          factionId: 'cortex',
          playerName: 'Player',
          source: 'live' as const,
          hasReport: true
        }
      ];

      const mockDetail = {
        meta: { sessionId: 'sess-1' },
        report: { sessionId: 'sess-1', grade: 'A' },
        hasState: true,
        hasEvents: true
      };

      setIpcClientOverride({
        invoke: vi.fn().mockImplementation(async (ch: string, req?: unknown) => {
          const r = req as { sessionId?: string } | undefined;
          if (ch === 'sessions:list') return { ok: true, data: mockSummaries };
          if (ch === 'sessions:get' && r?.sessionId === 'sess-1') return { ok: true, data: mockDetail };
          return { ok: false, code: 'UNKNOWN', message: '' };
        }),
        on: vi.fn().mockReturnValue(() => {}),
        isAvailable: vi.fn().mockReturnValue(true)
      });

      await useSessions.getState().load();
      expect(useSessions.getState().sessions).toEqual(mockSummaries);
      expect(useSessions.getState().latestSession).toEqual(mockDetail);
    });
  });
});

