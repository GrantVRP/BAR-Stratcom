import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWidgetHarness, type WidgetHarness } from './harness';
import { createScenario, createScenarioUnit } from './scenario';

describe('Widget Test Harness', () => {
  let harness: WidgetHarness;

  beforeEach(async () => {
    const scenario = createScenario();
    harness = await createWidgetHarness(scenario);
  });

  afterEach(() => {
    harness.close();
  });

  it('loads widget and retrieves GetInfo() metadata', () => {
    const info = harness.callin('GetInfo') as Record<string, unknown>;
    expect(info).toBeDefined();
    expect(info.name).toBe('BAR StratCom');
    expect(info.license).toBe('GPL-2.0-or-later');
    expect(info.layer).toBe(0);
    expect(info.enabled).toBe(true);
  });

  it('Initialize creates stratcom/ directory (first spec)', () => {
    expect(harness.fs.hasDir('stratcom')).toBe(false);
    harness.callin('Initialize');
    expect(harness.fs.hasDir('stratcom')).toBe(true);
  });

  it('provides a functioning in-memory filesystem through io and os mocks', () => {
    harness.engine.doStringSync(`
      local f = io.open("stratcom/test.txt", "w")
      f:write("line 1\\nline 2")
      f:close()
    `);

    expect(harness.fs.exists('stratcom/test.txt')).toBe(true);
    expect(harness.fs.read('stratcom/test.txt')).toBe('line 1\nline 2');

    // Test reading back in Lua
    const readBack = harness.engine.doStringSync(`
      local f = io.open("stratcom/test.txt", "r")
      local content = f:read("*a")
      f:close()
      return content
    `);
    expect(readBack).toBe('line 1\nline 2');

    // Test rename
    harness.engine.doStringSync(`
      os.rename("stratcom/test.txt", "stratcom/test_renamed.txt")
    `);
    expect(harness.fs.exists('stratcom/test.txt')).toBe(false);
    expect(harness.fs.exists('stratcom/test_renamed.txt')).toBe(true);

    // Test remove
    harness.engine.doStringSync(`
      os.remove("stratcom/test_renamed.txt")
    `);
    expect(harness.fs.exists('stratcom/test_renamed.txt')).toBe(false);
  });

  it('provides Json.encode and Json.decode compatible with Recoil / BAR', () => {
    const jsonStr = harness.engine.doStringSync(`
      local sample = {
        protocol = 1,
        mode = "player",
        active = true,
        units = { "armsolar", "armmex" }
      }
      return Json.encode(sample)
    `) as string;

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(parsed.protocol).toBe(1);
    expect(parsed.mode).toBe('player');
    expect(parsed.active).toBe(true);
    expect(parsed.units).toEqual(['armsolar', 'armmex']);

    // Test decode in Lua
    const decodedVal = harness.engine.doStringSync(`
      local decoded = Json.decode('${JSON.stringify({ key: 'val', count: 42 })}')
      return decoded.key .. ":" .. tostring(decoded.count)
    `);
    expect(decodedVal).toBe('val:42');
  });

  it('synchronizes Spring game frame with scenario frame advancement', () => {
    expect(harness.engine.doStringSync('return Spring.GetGameFrame()')).toBe(0);

    harness.setFrame(150);
    expect(harness.engine.doStringSync('return Spring.GetGameFrame()')).toBe(150);
    expect(harness.engine.doStringSync('return Spring.GetGameSeconds()')).toBe(5);
  });

  it('exposes UnitDefs and UnitDefNames from synthetic scenario snapshot', () => {
    const solarDefName = harness.engine.doStringSync(`
      return UnitDefNames["armsolar"].translatedHumanName
    `);
    expect(solarDefName).toBe('Solar Collector');

    const unitDefId = harness.scenario.unitDefsByName.get('armsolar')?.defId;
    const solarFromId = harness.engine.doStringSync(`
      return UnitDefs[${unitDefId}].name
    `);
    expect(solarFromId).toBe('armsolar');
  });

  it('tracks units created in the scenario', () => {
    const unit = createScenarioUnit('armsolar', harness.scenario);
    harness.scenario.addUnit(unit);

    const unitDefId = harness.engine.doStringSync(`
      return Spring.GetUnitDefID(${unit.id})
    `);
    expect(unitDefId).toBe(unit.defId);

    const health = harness.engine.doStringSync(`
      local h = Spring.GetUnitHealth(${unit.id})
      return h
    `);
    expect(health).toBe(unit.health);
  });

  it('records draw calls via gl mock', () => {
    harness.engine.doStringSync(`
      gl.Color(1, 0, 0, 1)
      gl.Rect(10, 10, 50, 50)
    `);

    const calls = harness.drawCalls();
    expect(calls.length).toBe(2);
    expect(calls[0]?.name).toBe('Color');
    expect(calls[1]?.name).toBe('Rect');
  });

  it('records action registrations via widgetHandler mock', () => {
    harness.engine.doStringSync(`
      widgetHandler.actionHandler:AddAction("stratcom_toggle", function() end)
    `);

    expect(harness.actions().has('stratcom_toggle')).toBe(true);
  });
});
