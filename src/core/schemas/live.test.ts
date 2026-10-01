import { describe, expect, it } from 'vitest';
import { LiveMeSchema, LiveSnapshotSchema, ResSchema, TeamStateSchema } from './live';

describe('live schemas', () => {
  const validRes = {
    current: 100,
    storage: 1000,
    pull: 10,
    income: 15,
    expense: 10,
    share: 0,
    sent: 0,
    received: 0
  };

  const validMe = {
    teamId: 0,
    allyTeamId: 0,
    factionId: 'arm',
    startUnitId: 'armcom',
    playerName: 'CommanderPlayer'
  };

  const validTeamState = {
    teamId: 1,
    allyTeamId: 1,
    playerName: 'EnemyPlayer',
    factionId: 'cor',
    res: {
      metal: validRes,
      energy: validRes
    },
    counts: {
      corcom: { alive: 1, building: 0 }
    },
    bp: { total: 300, active: 100 }
  };

  const validSnapshot = {
    frame: 1800,
    gameSeconds: 60,
    me: validMe,
    wind: { current: 12.5 },
    res: {
      metal: validRes,
      energy: validRes
    },
    counts: {
      armcom: { alive: 1, building: 0 },
      armsolar: { alive: 2, building: 0 }
    },
    builders: { total: 1, idle: 0 },
    factories: { total: 0, idle: 0 },
    commander: { alive: true, idle: false },
    bp: { total: 300, active: 300 },
    enemies: { corcom: 1 },
    teams: [validTeamState]
  };

  describe('ResSchema', () => {
    it('accepts valid Res', () => {
      expect(ResSchema.parse(validRes)).toEqual(validRes);
    });

    it('rejects invalid Res', () => {
      expect(ResSchema.safeParse({ ...validRes, current: 'full' }).success).toBe(false);
      expect(ResSchema.safeParse({ ...validRes, extra: 1 }).success).toBe(false);
    });
  });

  describe('TeamStateSchema', () => {
    it('accepts valid TeamState and nullable factionId', () => {
      expect(TeamStateSchema.parse(validTeamState)).toEqual(validTeamState);
      const withNullFaction = { ...validTeamState, factionId: null };
      expect(TeamStateSchema.parse(withNullFaction).factionId).toBeNull();
    });

    it('rejects invalid TeamState', () => {
      expect(TeamStateSchema.safeParse({ ...validTeamState, teamId: 'not-int' }).success).toBe(false);
      expect(TeamStateSchema.safeParse({ ...validTeamState, bp: 300 }).success).toBe(false);
    });
  });

  describe('LiveMeSchema', () => {
    it('accepts valid LiveMe and nullables', () => {
      expect(LiveMeSchema.parse(validMe)).toEqual(validMe);
      const withNulls = { ...validMe, factionId: null, startUnitId: null };
      expect(LiveMeSchema.parse(withNulls)).toEqual(withNulls);
    });

    it('rejects invalid LiveMe', () => {
      expect(LiveMeSchema.safeParse({ ...validMe, teamId: 't0' }).success).toBe(false);
    });
  });

  describe('LiveSnapshotSchema', () => {
    it('accepts valid LiveSnapshot', () => {
      expect(LiveSnapshotSchema.parse(validSnapshot)).toEqual(validSnapshot);
    });

    it('accepts spectator/replay mode with null me/res and optional teams', () => {
      const specSnapshot = {
        ...validSnapshot,
        me: null,
        res: null,
        teams: undefined
      };
      expect(LiveSnapshotSchema.parse(specSnapshot)).toEqual(specSnapshot);
    });

    it('rejects invalid snapshot', () => {
      expect(LiveSnapshotSchema.safeParse({ ...validSnapshot, frame: 1.5 }).success).toBe(false);
      expect(LiveSnapshotSchema.safeParse({ ...validSnapshot, commander: { alive: true } }).success).toBe(
        false
      );
      expect(LiveSnapshotSchema.safeParse({ ...validSnapshot, extra: 'forbidden' }).success).toBe(false);
    });
  });
});
