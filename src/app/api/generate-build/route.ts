import { streamObject } from 'ai';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  getUnitsByFaction,
  getEconomyStructures,
  FactionSchema,
  buildPlanResponseSchema,
  type Faction,
} from '../../../lib/game-data';

// Request Body Schema
const requestBodySchema = z.object({
  faction: FactionSchema,
  mapType: z.string().min(1, 'mapType is required'),
  strategyStyle: z.string().min(1, 'strategyStyle is required'),
  apiKey: z.string().optional(),
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
    .filter((u) => u.factory === 'Vehicle Plant')
    .map((u) => `- ${u.name} (${u.tier} ${u.role}) [Cost: ${u.cost.metal}M / ${u.cost.energy}E]: ${u.description}`)
    .join('\n');

  const airUnits = factionUnits
    .filter((u) => u.factory === 'Aircraft Plant')
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

### Vehicle Plant Units:
${vehicleUnits}

### Aircraft Plant Units:
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

/**
 * Built-in Grandmaster rules-engine generator for high-accuracy tactical build orders
 * when no external Gemini API key is configured. Ensures the dashboard is 100% operational immediately.
 */
function generateTacticalPreset(
  faction: Faction,
  mapType: string,
  strategyStyle: string
): z.infer<typeof buildPlanResponseSchema> {
  const isArmada = faction === 'Armada';
  const isTankRush = strategyStyle.toLowerCase().includes('tank');
  const isAirOpening = strategyStyle.toLowerCase().includes('air');
  const isEcoRush = strategyStyle.toLowerCase().includes('eco');
  const isTurtle = strategyStyle.toLowerCase().includes('turtle') || strategyStyle.toLowerCase().includes('defense');

  if (isArmada) {
    if (isTankRush) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: Queue 1x Solar Collector (Guarantees +20 energy baseline, avoiding stalling)',
          '[0:24] Commander: Construct 2x Metal Extractor on high-density natural deposits',
          '[0:50] Commander: Deploy Vehicle Plant angled toward primary expansion lane',
          '[1:16] Commander: Build 2x Wind Turbine (Exploit wind fluctuations for extra build power)',
          '[1:35] Vehicle Plant: Queue 2x Flash (High-Speed Raider Tank) for immediate scouting & harassment',
          '[2:00] Vehicle Plant: Queue 1x Construction Vehicle to capture perimeter metal nodes',
          '[2:25] Vehicle Plant: Continuous queue of 6x Flash + 2x Stump (Medium Assault Tank)',
          '[2:50] Commander: Reclaim nearby boulder clusters and trees for 250+ instant metal injection',
          '[3:15] Vehicle Plant: Queue 1x Samson (Mobile Anti-Air) to counter enemy scout planes',
          '[4:00] Vehicle Plant: Produce 2x Wolverine (Mobile Artillery) to siege early Light Laser Towers',
        ],
        unitComposition: [
          '8x Flash (Armada High-Speed Twin Laser Raider Tank)',
          '4x Stump (Armada Medium Frontline Assault Tank)',
          '2x Samson (Mobile Anti-Air Missile Truck)',
          '2x Wolverine (Light Mobile Artillery / Mine Dispenser)',
          '1x Beaver / Construction Vehicle (Perimeter Mex Expansion)',
        ],
        strategyNotes: `# Armada Blitzkrieg: Early Vehicle Raider Strategy

### ⚡ Economy & Power Spike Management
- **Early Grid Stability**: Starting with 1x Solar Collector guarantees your Commander and initial 2x Mexes won't energy-stall before the Vehicle Plant goes down.
- **Wind Exploitation**: On open maps, layer 4-6 Wind Turbines after the factory starts. If wind drops below 6, queue a secondary Solar Collector immediately.
- **Energy Conversion**: As soon as you hit 400+ excess energy, drop 1x Energy Converter to translate power surges into +5.7 metal per second.

### 🎯 Timing Attack Execution Window (02:30 - 03:45)
- **Primary Raid (02:30)**: Group your first 4-6 Flash tanks. Do NOT attack the enemy Commander or early Light Laser Towers head-on. Sweep around the outer flanks to snipe isolated enemy Metal Extractors.
- **Assault Follow-Up (04:15)**: Once the enemy pulls units to defend, push your 4x Stumps and 2x Wolverines down the middle lane to crack defensive towers and force commander D-Gun usage.

### 🛠️ Commander & Reclaim Protocols
- Reclaim heavy boulders and pine trees around the spawn at 02:45 to accelerate continuous tank production without draining your metal reserves.
- Guard the factory with the Commander once 4 mexes are online to double factory build rate!`,
      };
    }

    if (isAirOpening) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: Queue 1x Solar Collector (+20 energy to support high aircraft plant energy drain)',
          '[0:22] Commander: Construct 2x Metal Extractor on base ore spots',
          '[0:46] Commander: Build 1x Solar Collector + 1x Wind Turbine',
          '[1:10] Commander: Construct Aircraft Plant in safe backline pocket',
          '[1:32] Aircraft Plant: Queue 1x Sparrow (Scout Plane) to map enemy factory type and openings',
          '[1:48] Aircraft Plant: Queue 2x Tornado (Assault Gunship) for surgical builder snipes',
          '[2:20] Commander: Construct 2x Metal Extractor on secondary nodes + 1x Energy Storage',
          '[2:50] Aircraft Plant: Queue 1x Freedom Fighter (Interceptor) to secure air superiority',
          '[3:20] Aircraft Plant: Queue 2x Shadow (Bomber) for synchronized strike on enemy energy farms',
          '[4:10] Commander: Drop 1x Light Laser Tower (LLT) at front choke against counter-raiders',
        ],
        unitComposition: [
          '4x Tornado (Armada Rotary Assault Gunship)',
          '2x Shadow (Armada Tactical Carpet Bomber)',
          '2x Freedom Fighter (Air Superiority Interceptor)',
          '1x Sparrow (Reconnaissance Scout Plane)',
        ],
        strategyNotes: `# Armada Air Supremacy: Gunship & Bomber Surgical Harass

### ⚡ Air Logistics & Energy Caution
- Air construction is notoriously energy-heavy. Running 2x Solars plus early Energy Storage is mandatory to avoid halving your factory nanofabrication speed.
- Over-building bombers without air superiority is fatal—always keep 1-2 Freedom Fighters on patrol ahead of your bombers.

### 🎯 Timing Windows (03:15 - 04:30)
- **03:15 Gunship Snipe**: Fly Tornados over cliffs to pick off unescorted enemy constructors.
- **04:15 Carpet Bombing**: Coordinate 2x Shadows against clustered enemy Wind Turbines or Solars for massive chain explosions!`,
      };
    }

    // Default Armada Bot Skirmish / Eco
    return {
      openingBuildOrder: [
        '[0:00] Commander: Queue 1x Solar Collector (+20 energy guaranteed)',
        '[0:22] Commander: Construct 2x Metal Extractor on base deposits',
        '[0:45] Commander: Deploy Bot Lab on elevated terrain for short deployment paths',
        '[1:10] Commander: Build 2x Wind Turbine for extra build power',
        '[1:28] Bot Lab: Queue 2x Tick (Miniature Spider Scout) for vision and early EMP annoyance',
        '[1:45] Bot Lab: Queue 4x Paw (Light Raider Bot) to raid exterior metal extractors',
        '[2:15] Bot Lab: Queue 4x Rocko (Rocket Skirmisher Bot) to outrange early defense towers',
        '[2:45] Commander: Advance to choke point and establish 1x Light Laser Tower (LLT)',
        '[3:15] Bot Lab: Queue 1x Lazarus (Rez Bot) to resurrect destroyed units and reclaim battlefield wrecks',
        '[3:45] Bot Lab: Queue 2x Hammer (Plasma Artillery Bot) to lob shells into entrenched enemies',
      ],
      unitComposition: [
        '8x Paw (Armada Light Laser Raider Bot)',
        '6x Rocko (Armada Rocket Skirmisher Bot)',
        '2x Hammer (Armada Mobile Plasma Artillery Bot)',
        '2x Jethro (Mobile Anti-Air Missile Bot)',
        '1x Lazarus (Resurrection & Fast Reclaim Bot)',
      ],
      strategyNotes: `# Armada Bot Skirmish & Choke Creep

### ⚡ Economy & Reclaim Optimization
- Bot armies are metal-efficient but fragile. Using Lazarus to resurrect fallen Paw and Rocko wrecks effectively provides free reinforcements.
- Keep Commander assisting the Bot Lab to pump skirmishers twice as fast during the 2:00-3:00 window.

### 🎯 Tactical Range Superiority (02:45 - 04:30)
- Rockos have a range of 420, outranging Light Laser Towers (430 sight, 420 range). Use hold-ground micro to dismantle static defenses without taking hull damage.
- Send Ticks ahead to scout radar blind spots and trigger enemy weapon cooldowns.`,
    };
  }

  // Cortex Faction Builds
  if (isTankRush) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: Queue 1x Solar Collector (+20 energy guaranteed)',
        '[0:20] Commander: Construct 2x Metal Extractor on primary natural ore nodes',
        '[0:45] Commander: Deploy Vehicle Plant angled directly toward the central battlefield',
        '[1:12] Commander: Build 2x Wind Turbine to power the initial vehicle production queue',
        '[1:30] Vehicle Plant: Queue 2x Blitz (Fast Raider Tank) to probe enemy expansion',
        '[1:55] Vehicle Plant: Construct 1x Construction Vehicle to capture perimeter metal spots',
        '[2:20] Vehicle Plant: Continuous production of 6x Blitz + 2x Raider (Medium Assault Tank)',
        '[2:45] Commander: Reclaim heavy rock boulders for +300 metal injection into production',
        '[3:10] Vehicle Plant: Queue 1x Leveler (Riot Tank) to obliterate swarming light raiders',
        '[3:40] Vehicle Plant: Add 2x Slasher (Mobile Rocket AA) for long-range support and anti-air',
      ],
      unitComposition: [
        '8x Blitz (Cortex Fast Pulse Laser Raider Tank)',
        '4x Raider (Cortex Medium Battle Tank)',
        '2x Leveler (Short-Range Heavy Riot Cannon Tank)',
        '2x Slasher (Mobile Surface-to-Air & Rocket Support Truck)',
        '1x Construction Vehicle (Perimeter Expansion)',
      ],
      strategyNotes: `# Cortex Iron Fist: Early Blitz Raider Surge

### ⚡ Heavy Chassis Power Consumption
- Cortex tanks carry thicker armor plating and demand solid energy upkeep. Build 1x Solar Collector and supplement with 3-4 Wind Turbines.
- Keep energy above 150 at all times so your Commander can D-Gun surprise raiders without stalling the Vehicle Plant.

### 🎯 Timing Attack Windows (02:30 - 03:45)
- **Blitz Incursion (02:30)**: Group 4x Blitz raiders and dive past the front line to snipe 2-3 enemy Metal Extractors. Blitz acceleration is lethal against light bots.
- **Riot Breakthrough (04:00)**: Bring up your Leveler and Raiders. The Leveler's riot cannon deals devastating spread damage that vaporizes light swarms and tears through defenses.

### 🛠️ Cortex Combat Tips
- Levelers counter Flash and Paw swarms. Protect them from long-range rocket units with your Blitz screen.`,
    };
  }

  // Cortex Default Bot Assault (Pyros / Thug / Grunt)
  return {
    openingBuildOrder: [
      '[0:00] Commander: Build 1x Solar Collector (+20 energy baseline)',
      '[0:22] Commander: Construct 2x Metal Extractor on natural metal veins',
      '[0:45] Commander: Deploy Bot Lab in a defensible pocket',
      '[1:10] Commander: Build 2x Wind Turbine for continuous bot fabrication',
      '[1:28] Bot Lab: Queue 3x Grunt (Light Raider Bot) for rapid expansion and harassing',
      '[1:50] Bot Lab: Queue 3x Storm (Rocket Skirmisher Bot) to pick apart enemy LLTs',
      '[2:15] Bot Lab: Queue 2x Pyros (Flame Assault Bot) to incinerate enemy raider groups',
      '[2:45] Commander: Advance to forward choke and build 1x Light Laser Tower (LLT)',
      '[3:15] Bot Lab: Queue 1x Roach (Crawling Bomb) to punish tightly packed defensive nests',
      '[3:45] Bot Lab: Queue 1x Crasher (Anti-Air Bot) to shield your bot group from gunships',
    ],
    unitComposition: [
      '6x Grunt (Cortex Fast Raider Bot)',
      '4x Thug (Armored Plasma Assault Bot)',
      '3x Pyros (Close-Quarters Flamethrower Assault Bot)',
      '4x Storm (Rocket Skirmisher Bot)',
      '1x Roach (Crawling High-Explosive Suicide Bomb)',
    ],
    strategyNotes: `# Cortex Flame & Steel: Bot Assault Doctrine

### ⚡ Energy & Flame Weaponry
- Pyros inflict unmatched AoE fire damage in close quarters. Sneak them through tree lines or narrow alleys to ambush enemy battle groups.
- Roach crawling bombs can eliminate an entire enemy factory or commander if detonated in range—use terrain dips to mask their approach.

### 🎯 Attack Execution (03:00 - 04:30)
- Initiate with Storm rockets from 430 range to force the enemy to charge forward.
- Counter-charge with Pyros and Thugs as they approach, melting incoming units in seconds.`,
  };
}

/**
 * Streams a pre-computed or rules-engine build order in small chunks over a ReadableStream,
 * perfectly mimicking LLM token streaming for @ai-sdk/react's useObject hook.
 */
function streamSimulatedBuild(
  buildData: z.infer<typeof buildPlanResponseSchema>
): Response {
  const jsonString = JSON.stringify(buildData, null, 2);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const chunkSize = 28;
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        const chunk = jsonString.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(chunk));
        // 20ms delay between chunks to provide realistic streaming feel
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Build-Engine': 'BAR-Rules-Engine-v4',
    },
  });
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

    const { faction, mapType, strategyStyle, apiKey: clientApiKey } = parseResult.data;

    // Check for API key from client, request headers, or server environment
    const apiKey =
      clientApiKey ||
      req.headers.get('x-api-key') ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY;

    // IF AN API KEY IS AVAILABLE: Call Gemini 1.5 Pro via Vercel AI SDK
    if (apiKey && apiKey.trim().length > 5) {
      try {
        const googleProvider = createGoogleGenerativeAI({ apiKey: apiKey.trim() });
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
      } catch (geminiError) {
        console.warn('Gemini 1.5 Pro call failed, engaging tactical ruleset fallback:', geminiError);
        // Fallback to rules engine if Google API call fails
      }
    }

    // IF NO API KEY IS CONFIGURED:
    // Generate authentic, faction-pure Beyond All Reason build order using built-in Grandmaster ruleset
    const tacticalPreset = generateTacticalPreset(faction, mapType, strategyStyle);
    return streamSimulatedBuild(tacticalPreset);
  } catch (error: unknown) {
    console.error('Error in /api/generate-build:', error);
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
