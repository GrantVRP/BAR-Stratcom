import snapshotData from '../../src/core/registry/__test__/test-snapshot.json';
import { UnitSnapshotSchema, type UnitDefRecord } from '../../src/core/schemas';

const testSnapshot = UnitSnapshotSchema.parse(snapshotData);

export interface ScenarioUnit {
  id: number;
  defId: number;
  unitDefName: string;
  teamId: number;
  health: number;
  maxHealth: number;
  isBuilding: boolean;
  isBeingBuilt: boolean;
  buildProgress: number;
  currentBuildPower: number;
  position: { x: number; y: number; z: number };
  commandCount?: number;
  isUnitBuilding?: boolean;
  factoryCommands?: unknown[];
  /** What the local player knows of an enemy unit (default 'los'): in LOS, a radar blip of unknown
   *  type, a radar blip whose type was seen, or nothing (engine-facts.md). */
  sensor?: 'los' | 'radar' | 'radar-typed' | 'hidden';
}

export interface ScenarioTeam {
  teamId: number;
  allyTeamId: number;
  playerName: string;
  factionId: string;
  isAI: boolean;
  isMe: boolean;
  metal: number;
  energy: number;
  metalStorage: number;
  energyStorage: number;
  metalIncome: number;
  energyIncome: number;
  startUnit?: string | number | null;
  aiName?: string;
  /** Spring.GetTeamStartPosition (answered for allied teams only). */
  startPos?: { x: number; y: number; z: number };
}

export interface ScenarioOptions {
  gameVersion?: string;
  engineVersion?: string;
  mapName?: string;
  windMin?: number;
  windMax?: number;
  tidal?: number;
  startFrame?: number;
  isReplay?: boolean;
  isSpectating?: boolean;
  myTeamId?: number;
  myAllyTeamId?: number;
  teams?: ScenarioTeam[];
  units?: ScenarioUnit[];
  /** Spring.GetSelectedUnits() */
  selectedUnits?: number[];
  /** widget.canControlUnits; false = BAR's sandbox, where every Spring.GiveOrder* raises. */
  canControlUnits?: boolean;
  windFunctions?: {
    averageWindLookup?: Record<string | number, Record<string | number, string | number>>;
    /** BAR's getWindRisk() returns a string percentage, e.g. "100" (engine-facts.md). */
    windRisk?: string;
    isNoWind?: () => boolean;
  };
}

export class Scenario {
  public gameVersion: string;
  public engineVersion: string;
  public mapName: string;
  public windMin: number;
  public windMax: number;
  public tidal: number;
  public currentFrame: number;
  public isReplay: boolean;
  public isSpectating: boolean;
  public myTeamId: number;
  public myAllyTeamId: number;
  public teams: Map<number, ScenarioTeam> = new Map();
  public units: Map<number, ScenarioUnit> = new Map();
  public unitDefsById: Map<number, UnitDefRecord> = new Map();
  public unitDefsByName: Map<string, { defId: number; def: UnitDefRecord }> = new Map();
  public windFunctions?: ScenarioOptions['windFunctions'];
  public selectedUnits: number[];
  public canControlUnits: boolean;

  get myPlayerName(): string {
    return this.teams.get(this.myTeamId)?.playerName ?? 'TestPlayer';
  }

  constructor(options: ScenarioOptions = {}) {
    this.gameVersion = options.gameVersion ?? testSnapshot.gameVersion;
    this.engineVersion = options.engineVersion ?? testSnapshot.engineVersion;
    this.mapName = options.mapName ?? 'supreme_isthmus_v2.1';
    this.windMin = options.windMin ?? 0;
    this.windMax = options.windMax ?? 15;
    this.tidal = options.tidal ?? 12;
    this.currentFrame = options.startFrame ?? 0;
    this.isReplay = options.isReplay ?? false;
    this.isSpectating = options.isSpectating ?? false;
    this.myTeamId = options.myTeamId ?? 0;
    this.myAllyTeamId = options.myAllyTeamId ?? 0;
    this.windFunctions = options.windFunctions;
    this.selectedUnits = options.selectedUnits ?? [];
    this.canControlUnits = options.canControlUnits ?? true;

    // Index synthetic unitDefs
    testSnapshot.units.forEach((u, idx) => {
      const defId = idx + 1;
      this.unitDefsById.set(defId, u);
      this.unitDefsByName.set(u.id.toLowerCase(), { defId, def: u });
    });

    // Default player team if none provided
    if (options.teams && options.teams.length > 0) {
      for (const t of options.teams) {
        this.teams.set(t.teamId, { ...t });
      }
    } else {
      this.teams.set(this.myTeamId, {
        teamId: this.myTeamId,
        allyTeamId: this.myAllyTeamId,
        playerName: 'TestPlayer',
        factionId: 'armada',
        isAI: false,
        isMe: true,
        metal: 1000,
        energy: 1000,
        metalStorage: 1000,
        energyStorage: 1000,
        metalIncome: 0,
        energyIncome: 0,
        startUnit: 'armcom'
      });
    }

    if (options.units) {
      for (const u of options.units) {
        this.units.set(u.id, { ...u });
      }
    }
  }

  setFrame(frame: number): void {
    this.currentFrame = frame;
  }

  advanceFrames(n: number): void {
    this.currentFrame += n;
  }

  addUnit(unit: ScenarioUnit): void {
    this.units.set(unit.id, unit);
  }

  removeUnit(unitId: number): void {
    this.units.delete(unitId);
  }

  setTeamResources(teamId: number, metal: number, energy: number): void {
    const t = this.teams.get(teamId);
    if (t) {
      t.metal = metal;
      t.energy = energy;
    }
  }
}

let nextUnitId = 1000;

export function createScenarioUnit(
  unitDefName: string,
  scenario: Scenario,
  overrides: Partial<ScenarioUnit> = {}
): ScenarioUnit {
  const norm = unitDefName.toLowerCase();
  const defInfo = scenario.unitDefsByName.get(norm);
  if (!defInfo) {
    throw new Error(`UnitDef ${unitDefName} not found in scenario test snapshot`);
  }

  const id = overrides.id ?? ++nextUnitId;
  const health = overrides.health ?? defInfo.def.combat.health;

  return {
    id,
    defId: defInfo.defId,
    unitDefName: norm,
    teamId: overrides.teamId ?? scenario.myTeamId,
    health,
    maxHealth: overrides.maxHealth ?? health,
    isBuilding: overrides.isBuilding ?? defInfo.def.isBuilding,
    isBeingBuilt: overrides.isBeingBuilt ?? false,
    buildProgress: overrides.buildProgress ?? 1.0,
    currentBuildPower: overrides.currentBuildPower ?? (defInfo.def.isBuilder ? defInfo.def.buildSpeed : 0),
    position: overrides.position ?? { x: 100, y: 0, z: 100 },
    ...overrides
  };
}

export function createScenario(options: ScenarioOptions = {}): Scenario {
  return new Scenario(options);
}
