import fs from 'node:fs';
import path from 'node:path';
import { createRegistry } from '../src/core/registry';
import { eventsToPlan } from '../src/core/plans/events-to-plan';
import { validatePlan } from '../src/core/plans/validate';
import type { WidgetEvent } from '../src/core/schemas/protocol';

export const FIXTURE_IDS = [
  '2026-10-01-cortex-1v1-vs-ai-barr',
  '2026-10-01-cortex-1v1-vs-ai-barr-499s',
  '2026-10-02-cortex-1v1-vs-ai-altair',
  '2026-10-02-armada-1v1-vs-ai-isthmus'
] as const;

export function generateSamplePlans(): void {
  const root = process.cwd();
  const snapshotPath = path.join(root, 'data/snapshots/test-31479-433a460/units.json');
  const factionsPath = path.join(root, 'data/factions.json');
  const aliasesPath = path.join(root, 'data/aliases.json');

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const factions = JSON.parse(fs.readFileSync(factionsPath, 'utf-8'));
  const aliases = JSON.parse(fs.readFileSync(aliasesPath, 'utf-8'));
  const registry = createRegistry(snapshot, factions, aliases);

  const outDir = path.join(root, 'data/builds/samples');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fixturesDir = path.join(root, 'data/fixtures/sessions');

  for (const fixtureId of FIXTURE_IDS) {
    const fixturePath = path.join(fixturesDir, fixtureId);
    const metaRaw = JSON.parse(fs.readFileSync(path.join(fixturePath, 'meta.json'), 'utf-8'));
    const eventLines = fs
      .readFileSync(path.join(fixturePath, 'events.ndjson'), 'utf-8')
      .trim()
      .split('\n');
    const events: WidgetEvent[] = eventLines.map((l) => JSON.parse(l));

    const myTeam = metaRaw.teams.find((t: { isMe?: boolean }) => t.isMe) ?? metaRaw.teams[0];

    const plan = eventsToPlan({
      registry,
      events,
      teamId: myTeam.teamId,
      teams: metaRaw.teams,
      horizonSec: 600,
      meta: {
        id: fixtureId,
        player: 'owner',
        map: metaRaw.mapScriptName,
        skill: 'intermediate',
        source: {
          kind: 'own-game',
          sessionId: metaRaw.sessionId,
          map: metaRaw.mapScriptName,
          capturedAt: metaRaw.startedAt
        }
      }
    });

    // Generate accurate, human-readable title (max 60 chars per BuildPlanSchema)
    let displayMap = metaRaw.mapScriptName;
    if (displayMap === 'Altair_Crossing_V4.1') displayMap = 'Altair Crossing';
    if (displayMap === 'Supreme Isthmus v1.7') displayMap = 'Supreme Isthmus';

    const factionTitle = plan.factionId.charAt(0).toUpperCase() + plan.factionId.slice(1);
    const suffix = fixtureId.endsWith('-499s') ? ' #2 (owner vs AI)' : ' (owner vs AI)';
    plan.title = `Sample // ${factionTitle} ${plan.opening} on ${displayMap}${suffix}`;
    if (plan.title.length > 60) {
      plan.title = plan.title.slice(0, 60);
    }
    plan.skill = 'intermediate';

    // Validate against registry (must have 0 errors)
    const validation = validatePlan(plan, registry);
    if (validation.errors.length > 0) {
      throw new Error(
        `Validation failed for sample plan ${fixtureId}: ${JSON.stringify(validation.errors)}`
      );
    }

    const targetFile = path.join(outDir, `${fixtureId}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(plan, null, 2) + '\n', 'utf-8');
    console.log(`Generated sample plan: ${path.relative(root, targetFile)} (${plan.steps.length} steps) - "${plan.title}"`);
  }
}

if (process.argv[1]?.endsWith('make-sample-plans.ts')) {
  generateSamplePlans();
}
