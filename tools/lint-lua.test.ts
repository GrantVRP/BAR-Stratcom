import { describe, expect, it } from 'vitest';
import { lintLua } from './lint-lua';

describe('lintLua AST checks', () => {
  it('passes on valid local code and widget call-ins', () => {
    const code = `
      local spCreateDir = Spring.CreateDir

      function widget:GetInfo()
        return { name = "BAR StratCom" }
      end

      function widget:Initialize()
        if spCreateDir then
          spCreateDir("stratcom")
        end
      end
    `;
    const errors = lintLua(code);
    expect(errors).toEqual([]);
  });

  it('fails on assignments to undeclared globals', () => {
    const code = `
      x = 42
    `;
    const errors = lintLua(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain('undeclared global variable "x"');
  });

  it('passes when assigning to declared local variables', () => {
    const code = `
      local x = 10
      x = 20
    `;
    const errors = lintLua(code);
    expect(errors).toEqual([]);
  });

  it('fails on global function declarations', () => {
    const code = `
      function myGlobalHelper()
        return 1
      end
    `;
    const errors = lintLua(code);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain('Global function declaration "myGlobalHelper"');
  });

  it('passes on local function declarations', () => {
    const code = `
      local function myLocalHelper()
        return 1
      end
    `;
    const errors = lintLua(code);
    expect(errors).toEqual([]);
  });

  it('fails on forbidden use of setfenv and getfenv', () => {
    const codeSet = `
      local function test()
        setfenv(1, {})
      end
    `;
    expect(lintLua(codeSet).length).toBeGreaterThan(0);

    const codeGet = `
      local function test()
        local env = getfenv(1)
      end
    `;
    expect(lintLua(codeGet).length).toBeGreaterThan(0);
  });

  it('fails on forbidden use of io.popen and os.execute', () => {
    const codePopen = `
      local function test()
        io.popen("ls")
      end
    `;
    expect(lintLua(codePopen).length).toBeGreaterThan(0);

    const codeExec = `
      local function test()
        os.execute("reboot")
      end
    `;
    expect(lintLua(codeExec).length).toBeGreaterThan(0);
  });

  it('permits GiveOrder inside assist-prefixed functions', () => {
    const codeLocal = `
      local function assistQueueOrder(unitId)
        Spring.GiveOrderToUnit(unitId, 1, {}, 0)
      end
    `;
    expect(lintLua(codeLocal)).toEqual([]);

    const codeWidget = `
      function widget:assistArmNext(unitId)
        Spring.GiveOrderToUnit(unitId, 1, {}, 0)
      end
    `;
    expect(lintLua(codeWidget)).toEqual([]);
  });

  it('fails on GiveOrder outside assist-prefixed functions', () => {
    const codeNonAssist = `
      local function attackUnit(unitId)
        Spring.GiveOrderToUnit(unitId, 1, {}, 0)
      end
    `;
    const errors = lintLua(codeNonAssist);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain('GiveOrder');

    const codeTopLevel = `
      local spGiveOrder = Spring.GiveOrderToUnit
    `;
    const errorsTop = lintLua(codeTopLevel);
    expect(errorsTop.length).toBeGreaterThan(0);
  });
});
