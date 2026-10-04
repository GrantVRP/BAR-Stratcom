import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry } from '../registry/loader';
import { capturePlan, listCapturePlayers } from '../../core/plans/capture';
import { SessionMetaSchema } from '../../core/schemas';
import type { WidgetEvent } from '../../core/schemas/protocol';

const fixturesDir = join(process.cwd(), 'data/fixtures/sessions');

function loadFixture(name: string): { meta: ReturnType<typeof SessionMetaSchema.parse>; events: WidgetEvent[] } {
  const meta = SessionMetaSchema.parse(JSON.parse(readFileSync(join(fixturesDir, name, 'meta.json'), 'utf8')));
  const events = readFileSync(join(fixturesDir, name, 'events.ndjson'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as WidgetEvent);
  return { meta, events };
}

describe('replay capture on the recorded fixtures (T08.2)', () => {
  const replayFixtures = readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => loadFixture(name).meta.mode !== 'player');

  it('captures every capturable team of every replay fixture with 0 validation errors', () => {
    let captured = 0;
    let blocked = 0;
    for (const name of replayFixtures) {
      const { meta, events } = loadFixture(name);
      const registry = loadRegistry(meta.gameVersion);
      for (const player of listCapturePlayers(registry, meta, events)) {
        if (!player.capturable) {
          blocked += 1;
          expect(player.reason, `${name} team ${player.teamId}`).toBe('Legion is not supported yet');
          continue;
        }
        const { plan, issues } = capturePlan({
          registry,
          meta,
          events,
          teamId: player.teamId,
          capturedAt: '2026-10-03T00:00:00.000Z'
        });
        expect(issues.errors, `${name} team ${player.teamId}`).toEqual([]);
        expect(plan.steps.length).toBeGreaterThan(0);
        expect(plan.source.kind).toBe('replay-capture');
        captured += 1;
      }
    }
    // onyx 2 + dworld 18 + mediterraneum 16 + ptaq 9; ptaq's 7 Legion teams are blocked
    expect(captured).toBe(45);
    expect(blocked).toBe(7);
  });
});
