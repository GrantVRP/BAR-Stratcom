import { describe, expect, it } from 'vitest';
import { WidgetHeartbeatSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';
import { createScenario } from './scenario';

describe('widget perf numbers are milliseconds', () => {
  it('reports frame, draw and snapshot cost in ms (DiffTimers asked for ms; the mock answers 1 ms)', async () => {
    const harness = await createWidgetHarness(createScenario());
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');
      for (let n = 1; n <= 60; n++) harness.callin('GameFrame', n);
      harness.callin('DrawScreen');
      harness.callin('GameFrame', 90); // writes the heartbeat
      const perf = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json')).perf!;
      // seconds would read 0.001 here; the frame cost averages each 30-frame window
      expect(perf.frameMs).toBe(1);
      expect(perf.snapshotMs).toBe(1);
      expect(perf.drawMs).toBe(0); // no coach.json yet, so the HUD returns before measuring
    } finally {
      harness.close();
    }
  });
});
