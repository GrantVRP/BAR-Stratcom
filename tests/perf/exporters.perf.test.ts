import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { createWidgetHarness } from '../../widget/test/harness';
import { createScenario } from '../../widget/test/scenario';
import type { UnitDefRecord } from '../../src/core/schemas';

describe('Widget Exporters Wall-Clock Performance Benchmark (T02.3, T04.6)', () => {
  it('exports a 500-unit synthetic list in well under 50 ms', async () => {
    const scenario = createScenario();

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

      // Measure budget: <= 50 ms
      expect(durationMs).toBeLessThan(50);
    } finally {
      harness.close();
    }
  });
});
