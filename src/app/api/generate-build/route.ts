import { streamObject } from 'ai';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  getUnitsByFaction,
  getEconomyStructures,
  FactionSchema,
  buildPlanResponseSchema,
  type Faction,
} from '@/lib/game-data';

// Request Body Schema
const requestBodySchema = z.object({
  faction: FactionSchema,
  mapType: z.string().min(1, 'mapType is required'),
  strategyStyle: z.string().min(1, 'strategyStyle is required'),
});

/**
 * Builds a strict data-grounded system prompt embedding the official BAR unit roster
 * and strictly forbidding cross-faction or hallucinated units.
 */
function buildSystemPrompt(faction: Faction): string {
  const factionUnits = getUnitsByFaction(faction);
  const opposingFaction: Faction = faction === 'Armada' ? 'Cortex' : 'Armada';
  const opposingUnits = getUnitsByFaction(opposingFaction);

  const botUnits = factionUnits
    .filter((u) => u.factory === 'Bot Lab')
    .map((u) => `- ${u.name} (${u.tier} ${u.role}) [Cost: ${u.cost.metal}M / ${u.cost.energy}E]: ${u.description}`)
    .join('\n');

  const vehicleUnits = factionUnits
    .filter((u) => u.factory === 'Vehicle Factory')
    .map((u) => `- ${u.name} (${u.tier} ${u.role}) [Cost: ${u.cost.metal}M / ${u.cost.energy}E]: ${u.description}`)
    .join('\n');

  const airUnits = factionUnits
    .filter((u) => u.factory === 'Air Plant')
    .map((u) => `- ${u.name} (${u.tier} ${u.role}) [Cost: ${u.cost.metal}M / ${u.cost.energy}E]: ${u.description}`)
    .join('\n');

  const navalUnits = factionUnits
    .filter((u) => u.factory === 'Shipyard')
    .map((u) => `- ${u.name} (${u.tier} ${u.role}) [Cost: ${u.cost.metal}M / ${u.cost.energy}E]: ${u.description}`)
    .join('\n');

  const ecoStructures = getEconomyStructures(faction)
    .map((u) => `- ${u.name} (${u.tier} ${u.role}) [Cost: ${u.cost.metal}M / ${u.cost.energy}E]: ${u.description}`)
    .join('\n');

  const forbiddenNames = Array.from(
    new Set(opposingUnits.map((u) => u.name).filter((name) => !factionUnits.some((fu) => fu.name === name)))
  ).join(', ');

  return `You are an elite Beyond All Reason (BAR) competitive Grandmaster strategist.
Your task is to generate an optimal, tournament-grade opening build order and army strategy for the chosen faction, map type, and strategy style.

=======================================================
CRITICAL DATA-GROUNDING AND ANTI-HALLUCINATION RULES:
=======================================================
1. STRICT FACTION PURITY:
   You are generating a build exclusively for faction: >>> ${faction.toUpperCase()} <<<.
   You are STRICTLY FORBIDDEN from using or recommending ANY units belonging to the opposing faction (${opposingFaction}).
   The following units belong to ${opposingFaction} and MUST NEVER APPEAR in your response:
   [${forbiddenNames}]

   Common Hallucination Pitfalls to Avoid:
   - If generating for ARMADA: NEVER use Cortex units like Blitz, Pyros, Leveler, Thug, Grunt, Crasher, Roach, Banshee, Can, Goliath. Use Flash, Stump, Paw, Rocko, Hammer, Samson, Wolverine, Tornado instead.
   - If generating for CORTEX: NEVER use Armada units like Flash, Stump, Samson, Wolverine, Paw, Tick, Rocko, Hammer, Jethro, Tornado, Zeus, Bulldog. Use Blitz, Raider, Grunt, Thug, Pyros, Slasher, Banshee, Goliath instead.

2. ALLOWED UNIT & STRUCTURE ROSTER FOR ${faction.toUpperCase()}:
### Economy & Base Structures:
${ecoStructures}
- Light Laser Tower (T1 Point Defense) [Cost: 90M / 950E]

### Bot Lab Units:
${botUnits}

### Vehicle Factory Units:
${vehicleUnits}

### Air Plant Units:
${airUnits}

### Shipyard Units:
${navalUnits}

3. TIMING & ECONOMY GUIDELINES:
- Commanders begin with 1000 metal and 1000 energy storage.
- An initial Mex costs ~50M and Solars cost ~145M.
- Keep commander build queues tight to prevent energy or metal stalling.
- Explicitly detail when to expand to 3-4 metal extractors and when the first factory starts outputting units.
- In 'strategyNotes', provide actionable tactical advice on timing attacks, power surges, energy converters (70E -> 1M), and commander d-gun/reclaim usage.`;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = requestBodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: parseResult.error.format(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { faction, mapType, strategyStyle } = parseResult.data;

    // Use either GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const googleProvider = apiKey
      ? createGoogleGenerativeAI({ apiKey })
      : google;

    const systemPrompt = buildSystemPrompt(faction);

    const userPrompt = `Generate a competitive Beyond All Reason strategy:
- Faction: ${faction}
- Map Type: ${mapType}
- Strategy Style: ${strategyStyle}

Provide:
1. openingBuildOrder: Timed step-by-step opening queue for the Commander and initial factory.
2. unitComposition: Specific target unit composition and production ratios using only valid ${faction} units.
3. strategyNotes: In-depth Markdown notes covering economy management (metal/energy spikes, wind vs solar), reclaim priorities, and timing attack windows.`;

    const result = streamObject({
      model: googleProvider('gemini-1.5-pro'),
      schema: buildPlanResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('Error generating build order:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';

    return new Response(
      JSON.stringify({
        error: 'Failed to generate build order',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
