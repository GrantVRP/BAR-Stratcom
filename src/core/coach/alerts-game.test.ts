import { describe, it, expect } from 'vitest';
import type { LiveSnapshot } from '../schemas/live';
import type { BenchmarkFile } from '../schemas/benchmark';
import type { Registry } from '../registry';
import {
  ALERT_DETECTORS,
  detectIdleFactory,
  detectIdleBuilders,
  detectIdleCommander,
  detectBehindPlan,
  detectBenchmarkLow,
  detectScoutReminder,
  detectEnemyAirNoAa
} from './alerts';
import { BEGINNER_PROFILE, INTERMEDIATE_PROFILE } from './profiles';

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

const mockRegistry = {
  get: (id: string) => {
    if (id === 'armpeep') {
      return {
        id: 'armpeep',
        name: 'Finch',
        canFly: true,
        isBuilding: false,
        combat: { radarDistance: 0, maxWeaponRange: 0 }
      };
    }
    if (id === 'corvamp') {
      return {
        id: 'corvamp',
        name: 'Vamp',
        canFly: true,
        isBuilding: false,
        combat: { radarDistance: 0, maxWeaponRange: 500 }
      };
    }
    if (id === 'armjeth') {
      return {
        id: 'armjeth',
        name: 'Jethro',
        canFly: false,
        isBuilding: false,
        unitGroup: 'aa',
        combat: { radarDistance: 0, maxWeaponRange: 700 }
      };
    }
    return undefined;
  },
  classify: (id: string) => (id === 'armpeep' ? 'scout' : 'assault')
} as unknown as Registry;

describe('Coach Alert Detectors: Game & Units', () => {
  it('detects idle factories and builders', () => {
    const idleFac = makeSnapshot({ gameSeconds: 30, factories: { total: 2, idle: 2 } });
    const facHistory = [makeSnapshot({ gameSeconds: 25, factories: { total: 2, idle: 2 } })];
    const facAlert = detectIdleFactory({
      now: idleFac,
      history: facHistory,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 30
    });
    expect(facAlert?.text).toBe('2 FACTORIES IDLE');

    const idleBld = makeSnapshot({ gameSeconds: 30, builders: { total: 3, idle: 3 } });
    const bldHistory = [makeSnapshot({ gameSeconds: 25, builders: { total: 3, idle: 3 } })];
    const bldAlert = detectIdleBuilders({
      now: idleBld,
      history: bldHistory,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 30
    });
    expect(bldAlert?.text).toBe('3 CONSTRUCTOR(S) IDLE');
  });

  it('detects idle commander only before 600s', () => {
    const idleCom = makeSnapshot({ gameSeconds: 50, commander: { alive: true, idle: true } });
    const comHistory = [makeSnapshot({ gameSeconds: 46, commander: { alive: true, idle: true } })];
    const alert = detectIdleCommander({
      now: idleCom,
      history: comHistory,
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 50
    });
    expect(alert?.text).toBe('COMMANDER IDLE');

    const lateCom = makeSnapshot({ gameSeconds: 650, commander: { alive: true, idle: true } });
    expect(
      detectIdleCommander({
        now: lateCom,
        history: comHistory,
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 650
      })
    ).toBeNull();
  });

  it('detects BEHIND_PLAN escalating from info to warn', () => {
    const now = makeSnapshot();
    const infoAlert = detectBehindPlan({
      now,
      history: [],
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 50,
      aheadBehindSec: -16
    });
    expect(infoAlert).toMatchObject({ severity: 'info', text: 'BEHIND PLAN 16s' });

    const warnAlert = detectBehindPlan({
      now,
      history: [],
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 50,
      aheadBehindSec: -32
    });
    expect(warnAlert).toMatchObject({ severity: 'warn', text: 'BEHIND PLAN 32s' });
  });

  it('detects BENCHMARK_LOW at full minute >= 180s', () => {
    const benchmark: BenchmarkFile = {
      schemaVersion: 1,
      factionId: 'armada',
      mode: '1v1',
      gameVersions: ['1.0.0'],
      sampleCount: 10,
      sources: [{ sessionId: 's1', player: 'pro' }],
      series: [
        {
          t: 180,
          metalIncome: { p25: 15, p50: 20, p75: 25 },
          energyIncome: { p25: 50, p50: 70, p75: 90 },
          buildPower: { p25: 300, p50: 400, p75: 500 },
          armyMetal: { p25: 100, p50: 200, p75: 300 }
        }
      ]
    };

    const lowIncome = makeSnapshot({
      gameSeconds: 180,
      res: {
        metal: {
          current: 100,
          storage: 1000,
          pull: 5,
          income: 8,
          expense: 5,
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

    const alert = detectBenchmarkLow({
      now: lowIncome,
      history: [],
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 180,
      benchmark
    });
    expect(alert?.text).toBe('ECO BELOW PRO P25');

    // Beginner disables BENCHMARK_LOW
    expect(
      detectBenchmarkLow({
        now: lowIncome,
        history: [],
        profile: BEGINNER_PROFILE,
        registry: mockRegistry,
        clock: 180,
        benchmark
      })
    ).toBeNull();
  });

  it('detects SCOUT_REMINDER and ENEMY_AIR_NO_AA', () => {
    const noScout = makeSnapshot({ gameSeconds: 185, counts: {} });
    const scoutAlert = detectScoutReminder({
      now: noScout,
      history: [],
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 185
    });
    expect(scoutAlert?.text).toBe('GET RADAR / SCOUT');

    const withScout = makeSnapshot({ gameSeconds: 185, counts: { armpeep: { alive: 1, building: 0 } } });
    expect(
      detectScoutReminder({
        now: withScout,
        history: [],
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 185
      })
    ).toBeNull();

    const enemyAir = makeSnapshot({
      enemies: { corvamp: 1 },
      counts: {}
    });
    const airAlert = detectEnemyAirNoAa({
      now: enemyAir,
      history: [],
      profile: INTERMEDIATE_PROFILE,
      registry: mockRegistry,
      clock: 50
    });
    expect(airAlert?.text).toBe('ENEMY AIR // BUILD AA');

    const ownAa = makeSnapshot({
      enemies: { corvamp: 1 },
      counts: { armjeth: { alive: 1, building: 0 } }
    });
    expect(
      detectEnemyAirNoAa({
        now: ownAa,
        history: [],
        profile: INTERMEDIATE_PROFILE,
        registry: mockRegistry,
        clock: 50
      })
    ).toBeNull();
  });

  it('has a detector mapped for every alert ID in ALL_ALERT_IDS', () => {
    const ids = Object.keys(ALERT_DETECTORS);
    expect(ids).toHaveLength(13);
  });
});
