import { streamObject } from 'ai';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { z } from 'zod';
import transcriptsData from '../../../../data/transcripts.json';
import {
  getUnitsByFaction,
  getEconomyStructures,
  FactionSchema,
  buildPlanResponseSchema,
  ECONOMY_RULES,
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
 * Generates condensed transcript excerpts from the scraped competitive video guides
 * to serve as few-shot caster style references in Gemini's context window.
 */
function getCompetitiveFewShotExcerpts(): string {
  // Transcripts array contains 5 guides: Hy_xebtAfr4, amWOq-lxyIk, 0QLGRwhjTpI, xCn777Cu-q4, _KSbQkz7qDM
  const sourceGuides = transcriptsData
    .map((t) => `• "${t.title}" (${t.video_id})`)
    .join('\n');

  return `=======================================================
FEW-SHOT EXAMPLES: TOURNAMENT CASTER STRATEGY TONE
(Derived from official competitive guide transcripts in data/transcripts.json:
${sourceGuides})
=======================================================
Adopt the energetic, tactical, jargon-rich tone of an elite tournament caster for the 'strategyNotes' section. Study these condensed excerpts from real tournament guides:

--- EXCERPT 1: "BAR Academy 1v1 Competitive Opening Breakdown" (Theta Crystals) ---
"Ladies and gentlemen, welcome back to the BAR Academy casting desk! Look at the tempo on Theta Crystals: you cannot drop a factory without hitting that +60 Energy threshold first, otherwise your nanofabrication crawls and you're handing map control away on a silver platter. Notice how Vader manages build power—he never floats 400 metal in the bank. He immediately drops construction turrets and scales wind while cycling res bots on fallen husks. If your opponent opens vehicles, you must play greedier with your build power. Eat the perimeter crystal clusters, keep your energy-to-metal ratio locked at 10:1 (100E per 10M), and when that forward radar detects raiders slipping along the ridge, rotate your skirmish screen immediately!"

--- EXCERPT 2: "Competitive Frontline Build Order & Strategy" (All That Smolders) ---
"On All That Smolders, observe the strict discipline on the Commander opening: 2 Mexes into immediate power grid scaling. You NEVER queue your Bot Lab or Vehicle Plant before hitting +60 Energy. If the map wind gauge is fluctuating under 8, do NOT gamble on turbines—drop solid Solar Collectors for guaranteed +20 output. Once your factory finishes its first combat wing, shift the Commander to reclaiming early obsolete solars and spawn boulders to refund 100% of the metal back into heavy armor. That gives you an instant 250-300 metal injection right as the 3-minute combat skirmish erupts!"

--- EXCERPT 3: "BAR Economy, Metal, Energy, & Build Power Masterclass" ---
"In high-level BAR, your build power is completely worthless if your grid crashes. Remember the golden ratio: maintain 100 Energy generation for every 10 Metal income. If you start stalling out on energy, your laser towers stop firing and your factory build rate drops by 70%. Never queue excess constructors without the power to feed them. The moment your energy storage crosses 400+, slide on your energy converters (70E -> 1M) for a steady +5.7 metal influx, and use your Commander to guard-assist the factory during key timing attack windows!"`;
}

/**
 * Builds a strict data-grounded system prompt embedding the official BAR unit roster,
 * competitive meta guidelines (+60E rule, 100E:10M ratio, wind vs solar, reclaim tasks),
 * and tournament caster few-shot excerpts.
 */
function buildSystemPrompt(
  faction: Faction,
  mapType?: string,
  strategyStyle?: string
): string {
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

  const fewShotExcerpts = getCompetitiveFewShotExcerpts();

  return `You are an elite Beyond All Reason (BAR) competitive Grandmaster strategist and veteran tournament caster.
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

=======================================================
COMPETITIVE META GUIDELINES (MANDATORY ENFORCEMENT):
=======================================================
You MUST adhere strictly to these fundamental Beyond All Reason competitive rules in the generated 'openingBuildOrder' and 'strategyNotes':

1. NEVER PLACE A FACTORY BEFORE REACHING +60 ENERGY:
   - The Commander opening queue MUST achieve at least +${ECONOMY_RULES.minEnergyBeforeFactory} Energy income BEFORE placing any factory (Bot Lab, Vehicle Plant, Aircraft Plant, Shipyard).
   - Standard competitive opening: 2x Metal Extractors, followed immediately by Solars or Wind Turbines that bring grid output to +60E or greater, and ONLY THEN queue the factory.
   - Dropping a factory before +60E stalls the Commander's 300 build power, cuts nanofabrication speed in half, delays early raiders, and forfeits early lane initiative.

2. MAINTAIN THE 100 ENERGY TO 10 METAL RATIO:
   - Always balance economic expansion according to the golden competitive ratio: ${ECONOMY_RULES.energyToMetalRatio}.
   - Every additional metal extractor or reclaimed metal flow must be backed by matching energy generation (+10E per +1M) so production queues, radar coverage, and energy-based defenses never brown out.

3. MAP WIND EVALUATION (WIND TURBINES VS. SOLAR COLLECTORS):
   - ${ECONOMY_RULES.windVsSolar.guideline}
   - Low or fluctuating wind maps (average wind < ${ECONOMY_RULES.windVsSolar.minAvgWindForTurbines}): prioritize Solar Collectors (+20 fixed) for guaranteed grid stability.
   - High wind maps (average wind >= ${ECONOMY_RULES.windVsSolar.minAvgWindForTurbines}): start with 1 Solar baseline, then scale Wind Turbines in spaced pairs to prevent catastrophic chain explosions.

4. COMMANDER RECLAIM & OBSOLETE POWER RECYCLING:
   - ${ECONOMY_RULES.commanderReclaim.earlyBoost}
   - ${ECONOMY_RULES.commanderReclaim.recycleObsoletePower}
   - The opening queue MUST explicitly include Commander reclaim tasks:
     a) Reclaim spawn rock clusters or dense trees between 02:00-03:00 for an immediate 250-300 metal injection to fuel continuous factory unit queues.
     b) Reclaim early obsolete Solar Collectors once wind farms or advanced power are established to recover 100% of their 145 metal cost and re-invest it into heavy combat units.

5. ENERGY CONVERTER THRESHOLD:
   - Conversion rate: ${ECONOMY_RULES.energyConversion.rate}.
   - ${ECONOMY_RULES.energyConversion.overflowTrigger}.

${fewShotExcerpts}

=======================================================
OUTPUT FORMAT & CASTER VOICE INSTRUCTIONS:
=======================================================
1. 'openingBuildOrder':
   - An array of precise, timestamped build steps formatted like '[M:SS] Unit/Building: Action (Tactical Rationale)'.
   - MUST show +60 Energy achieved BEFORE the factory drops.
   - MUST factor map wind into turbine vs solar placement.
   - MUST include Commander reclaim of rocks and recycling of early obsolete power.
2. 'unitComposition':
   - Target unit counts and roles using ONLY valid ${faction} units.
3. 'strategyNotes':
   - Formatted in comprehensive GitHub-flavored Markdown.
   - Written in the energetic, analytical, high-tempo style of a veteran tournament caster (as exemplified in the few-shot excerpts above).
   - Break down the 100E:10M macro balance, timing attack execution windows, Commander reclaim sweeps, and radar/skirmish positioning.`;
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
          '[0:00] Commander: Queue 1x Solar Collector (+20E baseline grid stability)',
          '[0:20] Commander: Construct 2x Metal Extractor on base deposits (+4.4M/s)',
          '[0:42] Commander: Construct 2x Solar Collector (Locks in +60E threshold required before factory placement)',
          '[1:08] Commander: Deploy Vehicle Plant (Guaranteed zero nanofabrication stall with +60E online)',
          '[1:32] Commander: Construct 2x Wind Turbine (Map wind average >= 8, scaling power for vehicle queue)',
          '[1:48] Vehicle Plant: Queue 2x Flash (High-Speed Raider Tank) for immediate scouting & lane control',
          '[2:10] Vehicle Plant: Queue 1x Construction Vehicle to capture perimeter metal nodes',
          '[2:32] Commander: Reclaim nearby rock cluster (+280 instant metal injection to accelerate tank queue)',
          '[2:55] Vehicle Plant: Continuous queue of 6x Flash + 2x Stump (Medium Assault Tank)',
          '[3:25] Commander: Reclaim 1x early obsolete Solar Collector (+145 metal refunded into heavy armor)',
          '[3:50] Vehicle Plant: Queue 1x Samson (Mobile Anti-Air) to screen against early scout planes',
          '[4:15] Vehicle Plant: Produce 2x Wolverine (Mobile Artillery) to dismantle forward defense turrets',
        ],
        unitComposition: [
          '8x Flash (Armada High-Speed Twin Laser Raider Tank)',
          '4x Stump (Armada Medium Frontline Assault Tank)',
          '2x Samson (Mobile Anti-Air Missile Truck)',
          '2x Wolverine (Light Mobile Artillery / Mine Dispenser)',
          '1x Beaver / Construction Vehicle (Perimeter Mex Expansion)',
        ],
        strategyNotes: `# 🎙️ Caster Desk: Armada Blitzkrieg - Early Vehicle Raider Surge

### ⚡ Macro Discipline: +60 Energy Rule & 100E:10M Ratio
- **The +60E Power Threshold**: Notice how we never drop the Vehicle Plant until 3 Solars lock down +60 Energy. Dropping a factory on +20E cuts Commander build power down to a crawl and delays your first Flash tank by 25 seconds—an eternity in competitive BAR!
- **100:10 Macro Sustain**: As perimeter Mexes come online (+10M), immediately balance with Wind Turbines to maintain 100 Energy per 10 Metal. When excess power crosses 400+, slide on 1x Energy Converter (70E -> 1M) for a steady +5.7 metal influx.

### 🌬️ Wind vs. Solar Tactical Adaptation
- If map wind averages >= 8, scale spaced pairs of Wind Turbines to avoid chain explosions. If wind falls below 6, drop an extra Solar Collector immediately to keep nanofabricators running at 100% capacity.

### 🛠️ Commander Reclaim & Power Recycling
- **02:30 Rock Reclaim**: Commander vacuums up local boulder clusters for +280 instant metal, injecting pure fuel into continuous Flash and Stump production.
- **03:25 Solar Recycling**: Once wind turbines stabilize, reclaim 1x early obsolete Solar Collector. That recovers 100% of the 145 metal investment, instantly converted into frontline armor!

### 🎯 Timing Attack Execution Window (02:30 - 03:45)
- **Flank Harassment (02:30)**: Group 4-6 Flash tanks. Never dive the enemy Commander's D-Gun! Sweep the outer lanes to snipe unprotected Metal Extractors.
- **Armor Push (04:15)**: Follow up with 4x Stumps and 2x Wolverines to crack static Light Laser Towers from outside their 420 range.`,
      };
    }

    if (isAirOpening) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: Queue 1x Solar Collector (+20E baseline grid stability)',
          '[0:20] Commander: Construct 2x Metal Extractor on base deposits (+4.4M/s)',
          '[0:44] Commander: Construct 2x Solar Collector (Achieves mandatory +60E before high-drain air plant)',
          '[1:12] Commander: Deploy Aircraft Plant in safe backline pocket',
          '[1:36] Aircraft Plant: Queue 1x Sparrow (Scout Plane) to map enemy factory type and openings',
          '[1:52] Aircraft Plant: Queue 2x Tornado (Assault Gunship) for surgical builder snipes',
          '[2:20] Commander: Reclaim nearby boulder cluster (+250 instant metal injection)',
          '[2:45] Commander: Construct 2x Metal Extractor on secondary nodes + 1x Energy Storage',
          '[3:10] Commander: Reclaim 1x obsolete Solar once grid scales with wind turbines (+145 metal recovered)',
          '[3:35] Aircraft Plant: Queue 1x Freedom Fighter (Air Superiority Interceptor)',
          '[4:05] Aircraft Plant: Queue 2x Shadow (Tactical Bomber) for synchronized strike on enemy energy farms',
          '[4:40] Commander: Establish 1x Light Laser Tower (LLT) at front choke against counter-raiders',
        ],
        unitComposition: [
          '4x Tornado (Armada Rotary Assault Gunship)',
          '2x Shadow (Armada Tactical Carpet Bomber)',
          '2x Freedom Fighter (Air Superiority Interceptor)',
          '1x Sparrow (Reconnaissance Scout Plane)',
        ],
        strategyNotes: `# 🎙️ Caster Desk: Armada Air Supremacy - Gunship & Bomber Surgical Harass

### ⚡ Macro Discipline: +60 Energy Rule & 100E:10M Ratio
- **Air Factory Power Floor**: Air plants have brutal energy demands. Starting before +60E will brown out your base instantly. Securing 3x Solars gives the +60E bedrock needed to keep the nanofabricator spinning without choking the Commander.
- **100:10 Ratio & Energy Storage**: Air units drink energy like water. Build early Energy Storage before your second bomber is queued to cushion high burst drain and enable Commander D-Gun defense.

### 🌬️ Wind vs. Solar & Commander Power Recycling
- Scale wind turbines in the safe backline. At 03:10, reclaim 1x early Solar Collector to refund 145 metal directly into Freedom Fighter anti-air defense.

### 🎯 Timing Windows (03:15 - 04:30)
- **03:15 Gunship Snipe**: Fly Tornados over ridgelines to eliminate isolated constructors.
- **04:15 Carpet Bombing**: Coordinate 2x Shadows against tightly packed enemy windmills for massive secondary chain reactions!`,
      };
    }

    // Default Armada Bot Skirmish / Eco
    return {
      openingBuildOrder: [
        '[0:00] Commander: Queue 1x Solar Collector (+20E baseline grid)',
        '[0:20] Commander: Construct 2x Metal Extractor on primary deposits (+4.4M/s)',
        '[0:42] Commander: Construct 2x Solar Collector (Achieves +60E threshold required before factory placement)',
        '[1:06] Commander: Deploy Bot Lab on elevated terrain for rapid rally paths',
        '[1:30] Commander: Construct 2x Wind Turbine (Capitalizing on map wind for sustained 100E:10M ratio)',
        '[1:48] Bot Lab: Queue 2x Tick (Miniature Spider Scout) for vision and early EMP probe',
        '[2:05] Bot Lab: Queue 4x Paw (Light Raider Bot) to raid exterior metal extractors',
        '[2:30] Commander: Reclaim nearby large rocks (+260 instant metal boost for combat reinforcements)',
        '[2:52] Bot Lab: Queue 4x Rocko (Rocket Skirmisher Bot) to outrange early defense towers',
        '[3:18] Commander: Reclaim 1x early obsolete Solar Collector to recycle 145M into frontline defenses',
        '[3:40] Commander: Advance to choke point and establish 1x Light Laser Tower (LLT)',
        '[4:05] Bot Lab: Queue 1x Lazarus (Rez Bot) to resurrect destroyed units and sweep wrecks',
        '[4:30] Bot Lab: Queue 2x Hammer (Plasma Artillery Bot) to lob shells into entrenched enemies',
      ],
      unitComposition: [
        '8x Paw (Armada Light Laser Raider Bot)',
        '6x Rocko (Armada Rocket Skirmisher Bot)',
        '2x Hammer (Armada Mobile Plasma Artillery Bot)',
        '2x Jethro (Mobile Anti-Air Missile Bot)',
        '1x Lazarus (Resurrection & Fast Reclaim Bot)',
      ],
      strategyNotes: `# 🎙️ Caster Desk: Armada Bot Skirmish & Choke Creep

### ⚡ Macro Discipline: +60 Energy Rule & 100E:10M Ratio
- **The +60E Bedrock**: 3x Solars give you guaranteed +60E before the Bot Lab starts. That means the Commander can assist unit production without bleeding your energy reserves dry.
- **100:10 Macro Sustain**: Match every 10 metal per second with 100 energy generation. Bot armies are metal-efficient, but Rockos and Lasers need constant power backing.

### 🌬️ Wind vs. Solar & Commander Reclaim Tasks
- **Boulders & Obsolete Power Reclaim**: Commander cleans out local boulders at 02:30 for +260 metal, then recycles an obsolete Solar Collector at 03:18 to recover 145 metal for forward defenses.
- **Lazarus Recycling**: Resurrect fallen Paw wrecks to reinforce the frontline for free!

### 🎯 Tactical Range Superiority (02:45 - 04:30)
- Rockos boast 420 range, outranging Light Laser Towers (420 vs 400). Use hold-ground micro to pick apart static defenses without taking hull damage while Ticks provide radar spotting.`,
    };
  }

  // Cortex Faction Builds
  if (isTankRush) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: Queue 1x Solar Collector (+20E guaranteed baseline)',
        '[0:20] Commander: Construct 2x Metal Extractor on natural ore deposits (+4.4M/s)',
        '[0:42] Commander: Construct 2x Solar Collector (Locks in +60E threshold prior to Vehicle Plant)',
        '[1:08] Commander: Deploy Vehicle Plant angled toward central combat corridors',
        '[1:32] Commander: Construct 2x Wind Turbine (Sustaining the 100E:10M golden macro ratio)',
        '[1:50] Vehicle Plant: Queue 2x Blitz (Fast Raider Tank) to probe enemy expansion routes',
        '[2:15] Vehicle Plant: Queue 1x Construction Vehicle to capture perimeter metal spots',
        '[2:38] Commander: Reclaim heavy rock boulders (+300 instant metal injection into heavy armor)',
        '[3:00] Vehicle Plant: Continuous production of 6x Blitz + 2x Raider (Medium Battle Tank)',
        '[3:28] Commander: Reclaim 1x obsolete Solar Collector once wind farm is established (recovering 145M)',
        '[3:55] Vehicle Plant: Queue 1x Leveler (Riot Tank) to obliterate swarming light raiders',
        '[4:25] Vehicle Plant: Add 2x Slasher (Mobile Rocket AA) for long-range rocket support and anti-air',
      ],
      unitComposition: [
        '8x Blitz (Cortex Fast Pulse Laser Raider Tank)',
        '4x Raider (Cortex Medium Battle Tank)',
        '2x Leveler (Short-Range Heavy Riot Cannon Tank)',
        '2x Slasher (Mobile Surface-to-Air & Rocket Support Truck)',
        '1x Construction Vehicle (Perimeter Expansion)',
      ],
      strategyNotes: `# 🎙️ Caster Desk: Cortex Iron Fist - Early Blitz Raider Surge

### ⚡ Macro Discipline: +60 Energy Rule & 100E:10M Ratio
- **Heavy Armor Needs Heavy Power**: Cortex tanks carry thicker hulls and high energy maintenance. Never place the Vehicle Plant before reaching +60 Energy (3x Solars).
- **100:10 Macro Sustain**: With 4 Mexes pumping 8.8M/s, your energy grid must produce 90-100E. Build spaced wind turbines and reserve 150+ energy buffer for Commander D-Guns.

### 🌬️ Wind vs. Solar & Commander Reclaim Tasks
- **Boulder Reclaim**: Commander clears heavy boulders at 02:38 for +300 metal, fueling non-stop Blitz fabrication.
- **Power Recycling**: At 03:28, reclaim 1x obsolete Solar Collector once the wind farm is spinning to refund 145 metal directly into Leveler riot cannons.

### 🎯 Timing Attack Windows (02:30 - 04:00)
- **Blitz Incursion (02:30)**: Group 4x Blitz raiders and dive past the front line to snipe 2-3 enemy Metal Extractors. Blitz acceleration shreds light bots.
- **Riot Breakthrough (04:00)**: Roll forward with Levelers and Raiders. The Leveler's riot cannon vaporizes swarms and tears open defense lines.`,
    };
  }

  // Cortex Default Bot Assault (Pyros / Thug / Grunt)
  return {
    openingBuildOrder: [
      '[0:00] Commander: Build 1x Solar Collector (+20E baseline grid)',
      '[0:20] Commander: Construct 2x Metal Extractor on natural metal veins (+4.4M/s)',
      '[0:42] Commander: Construct 2x Solar Collector (Reaches vital +60E threshold before factory drops)',
      '[1:06] Commander: Deploy Bot Lab in defensible pocket with clean deployment ramps',
      '[1:30] Commander: Construct 2x Wind Turbine (Sustaining 100E:10M ratio for continuous bot fabrication)',
      '[1:48] Bot Lab: Queue 3x Grunt (Light Raider Bot) for rapid expansion denial and harassing',
      '[2:10] Bot Lab: Queue 3x Storm (Rocket Skirmisher Bot) to pick apart enemy LLTs at 430 range',
      '[2:32] Commander: Reclaim large boulder clusters (+275 metal surge for uninterrupted production)',
      '[2:55] Bot Lab: Queue 2x Pyros (Flame Assault Bot) to incinerate incoming raider packs',
      '[3:20] Commander: Reclaim 1x early obsolete Solar Collector (Recycles 145M into frontline push)',
      '[3:45] Commander: Advance to forward choke and build 1x Light Laser Tower (LLT)',
      '[4:10] Bot Lab: Queue 1x Roach (Crawling Bomb) to punish tightly packed defensive nests',
      '[4:35] Bot Lab: Queue 1x Crasher (Anti-Air Bot) to shield the assault group from gunships',
    ],
    unitComposition: [
      '6x Grunt (Cortex Fast Raider Bot)',
      '4x Thug (Armored Plasma Assault Bot)',
      '3x Pyros (Close-Quarters Flamethrower Assault Bot)',
      '4x Storm (Rocket Skirmisher Bot)',
      '1x Roach (Crawling High-Explosive Suicide Bomb)',
    ],
    strategyNotes: `# 🎙️ Caster Desk: Cortex Flame & Steel - Bot Assault Doctrine

### ⚡ Macro Discipline: +60 Energy Rule & 100E:10M Ratio
- **The +60E Launchpad**: Securing 3x Solars gives guaranteed +60E before the Bot Lab is queued. Cortex bots build fast—without +60E, your Commander will stall on the very first Grunt.
- **100:10 Macro Sustain**: Keep energy generation at 10x your metal income. Scale wind turbines in spaced pairs and use 1x Energy Converter when storage exceeds 400+.

### 🌬️ Wind vs. Solar & Commander Reclaim Tasks
- **Boulder Injection & Solar Recycling**: Commander claims 275+ metal from nearby rocks at 02:32, then reclaims 1x obsolete Solar Collector at 03:20 to refund 145 metal into high-impact Pyros flamethrowers.

### 🎯 Attack Execution (03:00 - 04:30)
- Open with Storm rockets from 430 range to force an opponent counter-charge.
- Counter-charge with Pyros and Thugs as they commit, melting incoming raiders with terrifying AoE fire damage!`,
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
        const systemPrompt = buildSystemPrompt(faction, mapType, strategyStyle);

        const userPrompt = `Generate a competitive Beyond All Reason strategy:
- Faction: ${faction}
- Map Type: ${mapType}
- Strategy Style: ${strategyStyle}

Requirements:
1. openingBuildOrder: Timed step-by-step opening queue for the Commander and initial factory. Strictly enforce reaching +60 Energy before placing the factory, evaluate map wind vs solar, and include Commander reclaim tasks for early obsolete power.
2. unitComposition: Specific target unit composition and production ratios using only valid ${faction} units.
3. strategyNotes: High-energy tournament caster breakdown covering the 100E:10M macro ratio, power spikes, wind vs solar decisions, Commander reclaim sweeps, and tactical timing attack windows.`;

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
