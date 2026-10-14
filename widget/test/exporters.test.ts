import { describe, expect, it } from 'vitest';
import factionsData from '../../data/factions.json';
import { normalizeRawUnitdefs } from '../../src/core/registry/normalize';
import {
  FactionsFileSchema,
  RawUnitdefsExportSchema,
  RawWindLookupSchema,
  type UnitDefRecord
} from '../../src/core/schemas';
import { createWidgetHarness } from './harness';
import { createScenario } from './scenario';

const factions = FactionsFileSchema.parse(factionsData);

describe('Widget Exporters', () => {
  it('exports unitdefs and wind-lookup validating against schemas and normalizing cleanly', async () => {
    const scenario = createScenario({
      gameVersion: '105.1.1-2550',
      engineVersion: '2026.07.04'
    });
    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');

      // 1. unitdefs export exists with sanitised filename
      const unitdefsFilename = 'stratcom/unitdefs-105.1.1-2550.json';
      expect(harness.fs.exists(unitdefsFilename)).toBe(true);

      const rawUnitdefs = harness.fs.readJson(unitdefsFilename);
      expect(rawUnitdefs).not.toBeNull();

      // Validates against RawUnitdefsExportSchema
      const validatedExport = RawUnitdefsExportSchema.parse(rawUnitdefs);
      expect(validatedExport.protocol).toBe(1);
      expect(validatedExport.kind).toBe('unitdefs');
      expect(validatedExport.gameVersion).toBe('105.1.1-2550');
      expect(validatedExport.engineVersion).toBe('2026.07.04');
      expect(validatedExport.units.length).toBeGreaterThan(0);

      // Passes normalizeRawUnitdefs without throwing
      const snapshot = normalizeRawUnitdefs(validatedExport, factions);
      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.units.length).toBe(validatedExport.units.length);

      // Verify a known unit (armcom) has converted build options and customParams
      const armcom = snapshot.units.find((u) => u.id === 'armcom');
      expect(armcom).toBeDefined();
      expect(armcom!.isCommander).toBe(true);
      expect(armcom!.buildOptions.length).toBeGreaterThan(0);

      // 2. wind-lookup export exists
      const windFilename = 'stratcom/wind-lookup.json';
      expect(harness.fs.exists(windFilename)).toBe(true);

      const rawWind = harness.fs.readJson(windFilename);
      expect(rawWind).not.toBeNull();

      const validatedWind = RawWindLookupSchema.parse(rawWind);
      expect(validatedWind.protocol).toBe(1);
      expect(validatedWind.kind).toBe('wind-lookup');
      expect(validatedWind.gameVersion).toBe('105.1.1-2550');
      expect(validatedWind.table['0']?.['15']).toBe(7.5);
    } finally {
      harness.close();
    }
  });

  it('sanitises gameVersion with special characters into a safe filename', async () => {
    const scenario = createScenario({
      gameVersion: '105.1.1:special/build #42'
    });
    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');

      // Sanitised: [^%w%.%-] -> _
      const expectedFilename = 'stratcom/unitdefs-105.1.1_special_build__42.json';
      expect(harness.fs.exists(expectedFilename)).toBe(true);

      const raw = harness.fs.readJson(expectedFilename);
      const validated = RawUnitdefsExportSchema.parse(raw);
      // Real un-sanitised string stays inside JSON
      expect(validated.gameVersion).toBe('105.1.1:special/build #42');
    } finally {
      harness.close();
    }
  });

  it('reports missing fields when a field is absent across all unitdefs', async () => {
    const scenario = createScenario();
    // Delete tidalGenerator from all synthetic unit definitions
    scenario.unitDefsById.forEach((u) => {
      // @ts-expect-error test override
      delete u.economy.tidalGenerator;
    });

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');

      const raw = harness.fs.readJson<{ missingFields: string[] }>(
        `stratcom/unitdefs-${scenario.gameVersion.replace(/[^a-zA-Z0-9.-]/g, '_')}.json`
      );
      expect(raw).not.toBeNull();
      expect(raw!.missingFields).toContain('tidalGenerator');
    } finally {
      harness.close();
    }
  });

  it('does not write wind-lookup.json if require("common/wind_functions") fails', async () => {
    const scenario = createScenario();
    const harness = await createWidgetHarness(scenario);
    try {
      // Override require to fail for wind_functions
      harness.engine.doStringSync(`
        require = function(mod)
          if mod == "common/wind_functions" then
            error("module not found")
          end
        end
      `);

      harness.callin('Initialize');
      expect(harness.fs.exists('stratcom/wind-lookup.json')).toBe(false);

      // Heartbeat has null avgWind
      const hb = harness.fs.readJson<{ map: { avgWind: number | null } }>('stratcom/widget.json');
      expect(hb?.map.avgWind).toBeNull();
    } finally {
      harness.close();
    }
  });

  it('skips rewriting unitdefs and wind-lookup files on a second Initialize', async () => {
    const scenario = createScenario();
    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');

      const safeVer = scenario.gameVersion.replace(/[^a-zA-Z0-9.-]/g, '_');
      const unitdefsPath = `stratcom/unitdefs-${safeVer}.json`;
      const windPath = 'stratcom/wind-lookup.json';

      // Stamp existing files with canary content
      harness.fs.write(unitdefsPath, JSON.stringify({ canary: 'unitdefs-v1' }));
      harness.fs.write(windPath, JSON.stringify({ canary: 'wind-v1' }));

      // Run Initialize a second time
      harness.callin('Initialize');

      // Content must NOT have been overwritten
      expect(harness.fs.readJson(unitdefsPath)).toEqual({ canary: 'unitdefs-v1' });
      expect(harness.fs.readJson(windPath)).toEqual({ canary: 'wind-v1' });
    } finally {
      harness.close();
    }
  });

  it('exports a 500-unit synthetic list in well under 50 ms', async () => {
    const scenario = createScenario();

    // Populate scenario with 500 synthetic units based on template
    const template = scenario.unitDefsById.get(1)!;
    for (let i = 1; i <= 500; i++) {
      const unit: UnitDefRecord = {
        ...template,
        id: `synth_${i}`,
        name: `Synthetic Unit ${i}`,
        metalCost: 100 + i,
        energyCost: 200 + i,
        buildOptions: i < 50 ? [`synth_${i + 1}`, `synth_${i + 2}`] : []
      };
      scenario.unitDefsById.set(i, unit);
      scenario.unitDefsByName.set(`synth_${i}`, { defId: i, def: unit });
    }

    const harness = await createWidgetHarness(scenario);
    try {
      const start = performance.now();
      harness.callin('Initialize');
      const durationMs = performance.now() - start;

      const safeVer = scenario.gameVersion.replace(/[^a-zA-Z0-9.-]/g, '_');
      const exported = harness.fs.readJson<{ units: unknown[] }>(`stratcom/unitdefs-${safeVer}.json`);

      expect(exported).not.toBeNull();
      expect(exported!.units.length).toBe(500);

      // Measure budget: ≤ 50 ms (wall-clock budget skipped when coverage instrumentation is active)
      if (!process.env.VITEST_COVERAGE) {
        expect(durationMs).toBeLessThan(50);
      }
    } finally {
      harness.close();
    }
  });
});
