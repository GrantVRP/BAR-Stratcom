import { describe, it, expect } from 'vitest';
import type { LiveSnapshot } from '../schemas/live';
import type { Registry } from '../registry';
import {
  detectEStallSoon,
  detectEStalling,
  detectMStallSoon,
  detectMStalling,
  detectMFloat,
  detectEFloat
} from './alerts';
import { BEGINNER_PROFILE, INTERMEDIATE_PROFILE, ADVANCED_PROFILE } from './profiles';

function makeSnapshot(overrides: Partial<LiveSnapshot> = {}): LiveSnapshot {
  return {
    frame: 300,
    gameSeconds: 10,
    me: { teamId: 0, allyTeamId: 0, factionId: 'armada', startUnitId: null, playerName: 'Player' },
    wind: { current: 10 },
    res: {
      metal: { current: 500, storage: 1000, pull: 5, income: 10, expense: 5, share: 0, sent: 0, received: 0 },
      energy: {
        current: 500,
        storage: 1000,
        pull: 10,
        income: 20,
        expense: 10,
        share: 0,
        sent: 0,
        received: 0
      }
    },
    counts: {},
    builders: { total: 1, idle: 0 },
    factories: { total: 1, idle: 0 },
    commander: { alive: true, idle: false },
    bp: { total: 300, active: 300 },
    enemies: {},
    ...overrides
  };
}

const mockRegistry = {} as Registry;

describe('Coach Alert Detectors: Resources', () => {
  it('detects E_STALL_SOON across wording styles', () => {
    const now = makeSnapshot({
      res: {
        metal: {
          current: 500,
          storage: 1000,
          pull: 5,
          income: 10,
          expense: 5,
          share: 0,
          sent: 0,
          received: 0
        },
        energy: {
          current: 40,
          storage: 1000,
          pull: 30,
          income: 20,
          expense: 20,
          share: 0,
          sent: 0,
          received: 0
        }
      }
    });

    const beg = detectEStallSoon({
      now,
      history: [],
      profile: BEGINNER_PROFILE,
      registry: mockRegistry,
      clock: 10
    });
    expect(beg?.text).toBe('BUILD ENERGY NOW');

    const intAlert = detectEStallSoon({
      now,
      history: [],
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 10
    });
    expect(intAlert?.text).toBe('ENERGY EMPTY IN 4s');

    const adv = detectEStallSoon({
      now,
      history: [],
      profile: ADVANCED_PROFILE,
      registry: mockRegistry,
      clock: 10
    });
    expect(adv?.text).toBe('E-STALL 4s');
  });

  it('detects E_STALLING only when sustained for 2s', () => {
    const stallingRes = {
      metal: { current: 500, storage: 1000, pull: 5, income: 10, expense: 5, share: 0, sent: 0, received: 0 },
      energy: { current: 5, storage: 1000, pull: 25, income: 10, expense: 10, share: 0, sent: 0, received: 0 }
    };
    const now = makeSnapshot({ gameSeconds: 20, res: stallingRes });

    const shortHistory = [makeSnapshot({ gameSeconds: 19, res: stallingRes })];
    expect(
      detectEStalling({
        now,
        history: shortHistory,
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 20
      })
    ).toBeNull();

    const fullHistory = [
      makeSnapshot({ gameSeconds: 18, res: stallingRes }),
      makeSnapshot({ gameSeconds: 19, res: stallingRes })
    ];
    const alert = detectEStalling({
      now,
      history: fullHistory,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 20
    });
    expect(alert).toMatchObject({ id: 'E_STALLING', severity: 'danger', text: 'ENERGY STALL' });
  });

  it('detects M_STALL_SOON when enabled and suppresses in beginner profile', () => {
    const stallingMetal = makeSnapshot({
      res: {
        metal: {
          current: 30,
          storage: 1000,
          pull: 20,
          income: 10,
          expense: 10,
          share: 0,
          sent: 0,
          received: 0
        },
        energy: {
          current: 500,
          storage: 1000,
          pull: 10,
          income: 20,
          expense: 10,
          share: 0,
          sent: 0,
          received: 0
        }
      }
    });

    // Suppressed in beginner and intermediate profiles (advanced-only in BAR)
    expect(
      detectMStallSoon({
        now: stallingMetal,
        history: [],
        profile: BEGINNER_PROFILE,
        registry: mockRegistry,
        clock: 10
      })
    ).toBeNull();

    expect(
      detectMStallSoon({
        now: stallingMetal,
        history: [],
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 10
      })
    ).toBeNull();

    const alert = detectMStallSoon({
      now: stallingMetal,
      history: [],
      profile: ADVANCED_PROFILE,
      registry: mockRegistry,
      clock: 10
    });
    expect(alert?.text).toBe('METAL EMPTY IN 3s');
  });

  it('detects M_STALLING when sustained', () => {
    const stallingMetal = {
      metal: { current: 2, storage: 1000, pull: 30, income: 10, expense: 10, share: 0, sent: 0, received: 0 },
      energy: {
        current: 500,
        storage: 1000,
        pull: 10,
        income: 20,
        expense: 10,
        share: 0,
        sent: 0,
        received: 0
      }
    };
    const now = makeSnapshot({ gameSeconds: 30, res: stallingMetal });
    const history = [
      makeSnapshot({ gameSeconds: 22, res: stallingMetal }),
      makeSnapshot({ gameSeconds: 25, res: stallingMetal })
    ];

    const alert = detectMStalling({
      now,
      history,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 30
    });
    expect(alert?.text).toBe('METAL STALL // TOO MUCH BP');
  });

  it('detects M_FLOAT when metal >= 90% storage sustained and clock >= 60s', () => {
    const floatRes = {
      metal: { current: 950, storage: 1000, pull: 5, income: 10, expense: 5, share: 0, sent: 0, received: 0 },
      energy: {
        current: 500,
        storage: 1000,
        pull: 10,
        income: 20,
        expense: 10,
        share: 0,
        sent: 0,
        received: 0
      }
    };
    // Opening grace: suppressed before 60s
    const earlyNow = makeSnapshot({ gameSeconds: 50, res: floatRes });
    expect(
      detectMFloat({
        now: earlyNow,
        history: [makeSnapshot({ gameSeconds: 40, res: floatRes })],
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 50
      })
    ).toBeNull();

    const now = makeSnapshot({ gameSeconds: 70, res: floatRes });
    const history = [
      makeSnapshot({ gameSeconds: 60, res: floatRes }),
      makeSnapshot({ gameSeconds: 65, res: floatRes })
    ];

    const alert = detectMFloat({
      now,
      history,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 70
    });
    expect(alert?.text).toBe('METAL FULL // SPEND IT');
  });

  it('detects E_FLOAT only after 240s and when enabled', () => {
    const floatRes = {
      metal: { current: 500, storage: 1000, pull: 5, income: 10, expense: 5, share: 0, sent: 0, received: 0 },
      energy: {
        current: 980,
        storage: 1000,
        pull: 10,
        income: 20,
        expense: 10,
        share: 0,
        sent: 0,
        received: 0
      }
    };

    const early = makeSnapshot({ gameSeconds: 200, res: floatRes });
    expect(
      detectEFloat({
        now: early,
        history: [],
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 200
      })
    ).toBeNull();

    const late = makeSnapshot({ gameSeconds: 260, res: floatRes });
    const history = [makeSnapshot({ gameSeconds: 240, res: floatRes })];
    expect(
      detectEFloat({ now: late, history, profile: BEGINNER_PROFILE, registry: mockRegistry, clock: 260 })
    ).toBeNull();

    const alert = detectEFloat({
      now: late,
      history,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 260
    });
    expect(alert?.text).toBe('ENERGY FULL // ADD BP/CONV');
  });
});
