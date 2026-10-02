import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRegistry } from '../src/core/registry';
import { validatePlan } from '../src/core/plans/validate';
import { eventsToPlan } from '../src/core/plans/events-to-plan';
import type { WidgetEvent } from '../src/core/schemas/protocol';

describe('eventsToPlan real fixture validation (04 §5.3, T04.4)', () => {
  const snapshot = JSON.parse(
    readFileSync(join(process.cwd(), 'data/snapshots/test-31479-433a460/units.json'), 'utf-8')
  );
  const factions = JSON.parse(readFileSync(join(process.cwd(), 'data/factions.json'), 'utf-8'));
  const aliases = JSON.parse(readFileSync(join(process.cwd(), 'data/aliases.json'), 'utf-8'));
  const registry = createRegistry(snapshot, factions, aliases);

  it('runs on every real player fixture and produces plans with 0 validation errors', () => {
    const fixturesDir = join(process.cwd(), 'data/fixtures/sessions');
    const dirs = readdirSync(fixturesDir, { withFileTypes: true }).filter((d) => d.isDirectory());

    // Only test player fixtures (skip spectator large team replays where the owner did not play a team)
    const playerDirs = dirs.filter((d) => !d.name.includes('multi-large-team'));

    expect(playerDirs.length).toBeGreaterThanOrEqual(4);

    for (const d of playerDirs) {
      const metaRaw = JSON.parse(readFileSync(join(fixturesDir, d.name, 'meta.json'), 'utf-8'));
      const eventLines = readFileSync(join(fixturesDir, d.name, 'events.ndjson'), 'utf-8')
        .trim()
        .split('\n');
      const events: WidgetEvent[] = eventLines.map((l) => JSON.parse(l));

      const myTeam = metaRaw.teams.find((t: { isMe?: boolean }) => t.isMe) ?? metaRaw.teams[0];

      const plan = eventsToPlan({
        registry,
        events,
        teamId: myTeam.teamId,
        teams: metaRaw.teams,
        meta: {
          player: myTeam.playerName,
          map: metaRaw.mapScriptName,
          source: {
            kind: 'own-game',
            sessionId: metaRaw.sessionId,
            map: metaRaw.mapScriptName,
            capturedAt: metaRaw.startedAt
          }
        }
      });

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps.length).toBeLessThanOrEqual(60);

      const validation = validatePlan(plan, registry);
      expect(validation.errors, `Validation errors in fixture ${d.name}`).toEqual([]);
      expect(validation.warnings, `Validation warnings in fixture ${d.name}`).toEqual([]);
    }
  });
});
