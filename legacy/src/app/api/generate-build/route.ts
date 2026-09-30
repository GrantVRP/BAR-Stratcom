import { streamObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
  _mapType?: string,
  _strategyStyle?: string
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
   - If generating for ARMADA: NEVER use Cortex units like Blitz, Pyros, Leveler, Thug, Grunt, Crasher, Roach, Banshee, Can, Goliath, Necro, Sheldon, Sumo, Freaker, Rapier, Liche, Valkyrie. Use Flash, Stump, Pawn, Rocko, Hammer, Samson, Wolverine, Tornado, Brawler, Blade, Atlas, Lazarus, Hound, Sharpshooter, Centurion, Phoenix, Kestrel, Zeus, Bulldog instead.
   - If generating for CORTEX: NEVER use Armada units like Flash, Stump, Samson, Wolverine, Pawn, Tick, Rocko, Hammer, Jethro, Tornado, Zeus, Bulldog, Lazarus, Brawler, Blade, Atlas, Hound, Sharpshooter, Centurion, Phoenix, Kestrel. Use Blitz, Raider, Grunt, Thug, Pyros, Slasher, Banshee, Goliath, Can, Necro, Valkyrie, Sheldon, Sumo, Freaker, Rapier, Liche instead.

2. ALLOWED UNIT & STRUCTURE ROSTER FOR ${faction.toUpperCase()}:
### Economy & Base Structures:
${ecoStructures}
- Light Laser Tower (T1 Point Defense) [Cost: ${faction === 'Armada' ? '85M / 680E' : '90M / 700E'}]

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

6. RADAR & LINE-OF-SIGHT (LOS) RANGE DISPARITY:
   - Firing range (typically 650-800 on artillery and rocket units) frequently exceeds visual line-of-sight (typically 350-450).
   - Long-range units (Rocko, Storm, Hammer, Thud, Wolverine) can fire into radar blips, but suffer accuracy dispersion.
   - Mandate early radar placement at elevated choke points paired with forward scout spotters (Tick, Roach, Sparrow, Finch) to grant direct vision for 100% sniper accuracy.
   - Deploy Radar Jammers along attack paths to mask strike groups and deny opponent early warning.

7. THE "THREE R'S" — RECLAIM, RESURRECT, REPAIR:
   - RECLAIM: Stripping HP from live units yields 100% metal and PREVENTS DEATH EXPLOSIONS. Reclaim enemy bombs or hazardous structures to defuse them safely.
   - RESURRECT: Resurrection Bots (Lazarus / Necro) revive fallen battlefield wrecks for 0 Metal and 50% Energy. Winning a frontline skirmish and resurrecting the husks effectively doubles army value.
   - REPAIR: Field repairs cost ZERO resources—only constructor build power. Issue Fight/Patrol orders while holding ALT to cause resurrection units to automatically revive intact wrecks, repair allies, and reclaim debris.

8. POSITIONAL FLANKING MECHANICS & FORMATION CONTROL:
   - Units in Beyond All Reason take up to +100% bonus damage (double damage!) when struck from behind, and +50% from the flanks.
   - Always pin enemy frontline formations with frontal skirmishers, while sending high-speed raiders (Flash, Blitz, Pawn, Grunt) sweeping into their rear.
   - Always deploy units in wide Line Formations (right-click drag) to maximize firing arcs and eliminate choke clustering. Use 'Y' priority targeting to snipe enemy constructors and commanders.

9. BASE DESIGN & ANTI-CHAIN EXPLOSION SPACING:
   - "Spread your winds, spread your solars, spread your fusions, spread your buildpower."
   - Never build energy structures directly adjacent to each other. Maintain a minimum of two grid spaces between power generators to prevent catastrophic chain detonations.
   - Never spam multiple T1 factories. Establish 1-2 primary factories and surround them with 3+ Construction Turrets (nanotowers) for scalable, cost-efficient build power.

${fewShotExcerpts}

=======================================================
OUTPUT FORMAT & CASTER VOICE INSTRUCTIONS:
=======================================================
1. 'openingBuildOrder':
   - MUST BE A COMPREHENSIVE, EXTENSIVE 20 TO 28 STEP TOURNAMENT TIMELINE covering the full tactical progression from 00:00 to 11:00+ across all four strategic phases:
     * Phase 1 (00:00 - 01:30): Grid Bedrock (+60E baseline before factory, natural mexes, factory placement)
     * Phase 2 (01:30 - 03:00): Vanguard & Expansion (scouts/raiders, expansion constructor, spawn rock reclaim, forward mexes, radar, LLT)
     * Phase 3 (03:00 - 05:00): Timing Harass & Factory Scaling (skirmishers/tanks, resurrection bot, nanotower buildpower, energy converters, AA screen, solar reclaim)
     * Phase 4 (05:00 - 11:00+): T2 Slingshot & Apex Breakthrough (T2 factory foundation, T2 constructor, Moho Mine mex upgrades, Fusion/AFUS reactor, T2 combat units, and coordinated timing attack).
   - CONCISE ACTION FORMAT: Format each step concisely as '[M:SS] Actor: Count Item (Short Action Rationale)', e.g. '[0:00] Commander: 1x Solar Collector (+20E baseline grid)'. Keep the parenthetical rationale short, focused, and punchy—DO NOT write long essay paragraphs per step.
2. 'unitComposition':
   - Target unit counts and roles using ONLY valid ${faction} units across both T1 vanguard and T2 apex forces.
3. 'strategyNotes':
   - Formatted in comprehensive GitHub-flavored Markdown.
   - Written in the energetic, analytical, high-tempo style of a veteran tournament caster (as exemplified in the few-shot excerpts above).
   - DIRECTIVE: STRICTLY NO EMOJIS IN HEADINGS. Never write '### ⚡ Macro' or '### 🎯 Execution'. Use clean military bracket syntax such as '### [MACRO DISCIPLINE]' or '### [COMBAT TIMING WINDOWS]'.
   - Break down the 100E:10M macro balance, timing attack execution windows, Commander reclaim sweeps, radar/skirmish positioning, flanking angles, and husk scavenging.`;
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
  const styleLower = strategyStyle.toLowerCase();
  const isTankRush = styleLower.includes('tank');
  const isAirOpening = styleLower.includes('air') || styleLower.includes('gunship');
  const isSolarReclaim = styleLower.includes('solar') || styleLower.includes('reclaim');
  const isFlankRez = styleLower.includes('flank') || styleLower.includes('rez');
  const isDedicatedEco = styleLower.includes('afus') || (styleLower.includes('eco') && !isSolarReclaim);
  const isAirDrop = styleLower.includes('drop') || styleLower.includes('ferry') || styleLower.includes('turtle');
  const isCloakedDemo = styleLower.includes('cloak') || styleLower.includes('skuttle') || styleLower.includes('roach') || styleLower.includes('snipe') || styleLower.includes('tumbleweed');
  const isNaval = styleLower.includes('naval') || styleLower.includes('sea') || styleLower.includes('fleet') || styleLower.includes('flagship') || styleLower.includes('ocean');

  if (isArmada) {
    if (isSolarReclaim) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
          '[0:20] Commander: 2x Metal Extractor on base deposits (+4.4M/s)',
          '[0:42] Commander: 2x Solar Collector (Spaced 3 tiles apart, locks +60E)',
          '[1:05] Commander: Deploy Bot Lab in defensible cliff alcove',
          '[1:28] Commander: 1x Solar Collector (Achieves +80E threshold)',
          '[1:45] Bot Lab: 2x Pawn (Lane scout and harass)',
          '[2:05] Bot Lab: 1x Construction Bot (Perimeter expansion)',
          '[2:25] Commander: Reclaim spawn rock field (+280M injection)',
          '[2:50] Construction Bot: 2x Expansion Mexes on outer corridor',
          '[3:15] Construction Bot: 1x Radar Tower on elevated ridge',
          '[3:35] Bot Lab: 4x Rocko (Rocket Skirmishers to pin enemy choke)',
          '[4:00] Construction Bot: 1x Light Laser Tower (Anchor forward ramp)',
          '[4:25] Commander: 1x Construction Turret (Assists Bot Lab fabrication)',
          '[4:50] Bot Lab: 1x Lazarus (Rez bot to scavenge wrecks)',
          '[5:15] Bot Lab: 2x Jethro (Mobile Anti-Air escort)',
          '[5:40] Construction Bot: 1x Energy Storage + 1x Energy Converter (70E -> 1M)',
          '[6:05] Commander: Reclaim all 4 early Solars (+620M 100% tech refund)',
          '[6:35] Commander: Deploy Advanced Bot Lab (Funded by reclaimed metal)',
          '[7:15] Advanced Bot Lab: 1x Advanced Construction Bot',
          '[7:55] Advanced Construction Bot: Upgrade 2x base Mex to Advanced Metal Extractor (+18M/s)',
          '[8:40] Advanced Construction Bot: Deploy Advanced Solar Generator (+80E)',
          '[9:25] Advanced Bot Lab: 4x Hound (T2 Plasma Skirmish Bot)',
          '[10:10] Advanced Bot Lab: 2x Sharpshooter (T2 Long-Range Sniper Bot)',
          '[11:00] Strike Group: 4x Hound (Coordinate Hounds and Sharpshooters to crack enemy perimeter)',
        ],
        unitComposition: [
          '6x Pawn (Armada Light Laser Raider Bot)',
          '6x Rocko (Armada Rocket Skirmisher Bot)',
          '4x Hound (Armada Heavy T2 Plasma Skirmisher)',
          '2x Sharpshooter (Armada Long-Range Sniper Bot)',
          '1x Lazarus (Resurrection & High-Speed Reclaim Bot)',
          '1x Advanced Construction Bot (T2 Infrastructure)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Anti-Chain Solars & 100% Reclaim Slingshot

### [MACRO DISCIPLINE: THE SOLAR RECLAIM ADVANTAGE]
- **Zero Wind RNG Stalls**: Unlike Wind Turbines which fluctuate wildly between 0 and 25+, Solar Collectors provide a rigid, guaranteed +20 Energy baseline.
- **Anti-Chain Spacing**: Solars explode violently when destroyed. Always space them at least 3-4 tiles apart so an enemy artillery shell or stray raider cannot trigger a cascading chain reaction.
- **100% Metal Recycling Slingshot**: At 06:05, your Commander reclaims all early Solars, recovering 100% of the 155 metal cost per unit (+620 metal total!). This massive burst liquidates dead capital directly into an immediate T2 Lab and Advanced Metal Extractors!

### [COMBAT TIMING & TRANSITION] (06:30 - 11:00)
- Maintain lane control with Pawns and Rockos.
- As the reclaimed metal floods your bank, drop the Advanced Bot Lab and transition directly into Hounds and Sharpshooters to shatter enemy frontline fortresses!`,
      };
    }

    if (isFlankRez) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline)',
          '[0:20] Commander: 2x Metal Extractor on natural deposits (+4.4M/s)',
          '[0:42] Commander: 2x Solar Collector (+60E threshold reached)',
          '[1:05] Commander: Deploy Bot Lab oriented toward primary corridor',
          '[1:28] Commander: 2x Wind Turbine (Scaling power for bot production)',
          '[1:45] Bot Lab: 4x Pawn (Establish flank reconnaissance)',
          '[2:05] Bot Lab: 1x Construction Bot (Perimeter expansion)',
          '[2:25] Commander: Reclaim spawn rock field (+260M injection)',
          '[2:50] Construction Bot: 2x Expansion Mexes on outer flank lane',
          '[3:15] Construction Bot: 1x Radar Tower on flank elevation',
          '[3:35] Bot Lab: 6x Rocko (Pin enemy frontline at 420 range)',
          '[4:00] Construction Bot: 1x Light Laser Tower (Anchor secondary choke)',
          '[4:25] Bot Lab: 2x Lazarus (Rez bot set to Fight/Patrol behind line)',
          '[4:50] Commander: 1x Construction Turret (Triples Bot Lab buildpower)',
          '[5:15] Bot Lab: 2x Hammer (Plasma Artillery to crack static defenses)',
          '[5:40] Bot Lab: 2x Jethro (Screen against gunship counters)',
          '[6:05] Strike Group: 6x Pawn (Line-drag Pawns into enemy rear flank for +150% flank damage)',
          '[6:35] Lazarus: 2x Lazarus (Reanimate fallen enemy tank and raider husks for 0 metal)',
          '[7:05] Commander: Deploy Advanced Bot Lab in protected base pocket',
          '[7:45] Advanced Bot Lab: 1x Advanced Construction Bot',
          '[8:25] Advanced Construction Bot: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
          '[9:10] Advanced Bot Lab: 4x Hound (Heavy skirmish and repair line with Welders)',
          '[10:15] Strike Group: 4x Hound (Full-scale assault with reanimated army and T2 shock troops)',
        ],
        unitComposition: [
          '8x Pawn (Armada Light Laser Raider Bot)',
          '8x Rocko (Armada Rocket Skirmisher Bot)',
          '4x Hound (Armada T2 Heavy Plasma Skirmisher)',
          '2x Welder (Armada Combat Engineer & Repair Bot)',
          '2x Lazarus (Resurrection & Field Salvage Bot)',
          '2x Hammer (Mobile Plasma Artillery Bot)',
          '2x Jethro (Anti-Air Escort Bot)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Flank Assault & Lazarus Reanimation Protocol

### [THE FLANKING ENGINE] (+100% to +150% Rear Damage)
- **Directional Armor Penetration**: In Beyond All Reason, units take massive bonus damage when struck from behind or sideways (+100% to +150% extra damage).
- **The Hammer & Anvil Pin**: Use Rockos and Hammers to hold the opponent's main force in place from 420 range, then sprint Pawns around their flanks to assassinate heavy units from the rear in seconds!

### [LAZARUS RESURRECTION PROTOCOL]
- Set 2x Lazarus bots to 'Fight' or 'Patrol' commands directly behind your skirmish line.
- The moment an enemy unit dies, Lazarus reanimates the metallic husk back into a living Armada fighter under your control! You steal their metal and double your army size on the fly!`,
      };
    }

    if (isDedicatedEco) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline)',
          '[0:20] Commander: 2x Metal Extractor on natural veins (+4.4M/s)',
          '[0:44] Commander: 3x Solar Collector (Spaced grid, locking in +80E)',
          '[1:08] Commander: Deploy Bot Lab in safe rear base quadrant',
          '[1:30] Bot Lab: 2x Construction Bot (Expand energy grid and perimeter)',
          '[1:55] Commander: Reclaim dense boulder field (+320M injection)',
          '[2:20] Construction Bot 1: 6x Wind Turbines in spaced pairs',
          '[2:50] Construction Bot 2: 2x Expansion Mexes on rear deposits',
          '[3:15] Construction Bot 1: 1x Energy Storage (Buffer for D-Gun & conversion)',
          '[3:40] Construction Bot 2: 2x Energy Converters (70E -> 1M)',
          '[4:05] Commander: 2x Construction Turret (Surrounding Bot Lab)',
          '[4:30] Bot Lab: 1x Lazarus (Base repair and wreckage reclamation)',
          '[4:55] Commander: Deploy Advanced Solar Generator (+80E baseline)',
          '[5:25] Commander: Deploy Advanced Bot Lab foundation with Nanotower assist',
          '[6:00] Advanced Bot Lab: 1x Advanced Construction Bot',
          '[6:40] Advanced Construction Bot: Upgrade 3x base Mex to Advanced Metal Extractor (+27M/s)',
          '[7:25] Advanced Construction Bot: Deploy Advanced Fusion Reactor (AFUS) (+3000E/s)',
          '[8:15] Commander: Assist AFUS fabrication with Nanotower cluster',
          '[9:00] Advanced Construction Bot: Deploy 4x Advanced Energy Converters',
          '[9:45] Base Eco: Channel +25M/s overflow metal directly to frontline allies',
          '[10:30] Advanced Bot Lab: 2x Advanced Construction Bot to scale 2nd AFUS reactor',
          '[11:15] Advanced Construction Bot: Deploy 2nd AFUS Reactor (+6000E/s combined)',
          '[12:00] Base Eco: 1x Calamity (Deploy long-range plasma battery foundation to shell enemy core)',
        ],
        unitComposition: [
          '2x Construction Bot (Energy Grid Expansion)',
          '1x Lazarus (Base Repair & Reclaim Assistant)',
          '2x Advanced Construction Bot (AFUS & T2 Converter Deployment)',
          '2x Advanced Fusion Reactor (+6000 Energy/s combined)',
          '6x Advanced Energy Converter (70E:1M Conversion Grid)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Dedicated Backline Eco & AFUS Slingshot

### [MACRO DISCIPLINE: 70E:1M CONVERSION & AFUS DOMINANCE]
- **The Golden Ratio**: Energy is metal in high-level BAR! Once your Advanced Fusion Reactor (+3000 E/s) is completed, each Energy Converter converts 70 excess Energy into 1 Metal.
- **Frontline Feeding**: A dedicated backline eco player does not build combat units early; your sole purpose is to hit AFUS by 07:30 - 09:00, convert 1000+ Energy into 15-25 Metal/sec, and send metal streams directly to your frontline players to crush their lanes!`,
      };
    }

    if (isAirDrop) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline)',
          '[0:20] Commander: 2x Metal Extractor (+4.4M/s)',
          '[0:42] Commander: 2x Solar Collector (+60E threshold reached)',
          '[1:05] Commander: Deploy Vehicle Plant on low ground',
          '[1:28] Commander: Deploy Aircraft Plant in adjacent pocket',
          '[1:48] Vehicle Plant: 2x Flash (High-speed raiders for scouting)',
          '[2:10] Aircraft Plant: 1x Sparrow (Aerial scout to map enemy blind spots)',
          '[2:30] Commander: Reclaim nearby heavy boulders (+280M injection)',
          '[2:55] Vehicle Plant: 1x Construction Vehicle (Perimeter expansion)',
          '[3:20] Aircraft Plant: 2x Atlas (Air transports for cliff dropping)',
          '[3:45] Construction Vehicle: 2x Expansion Mexes + 1x Radar Tower',
          '[4:10] Vehicle Plant: 4x Stump (Medium assault tanks)',
          '[4:35] Aircraft Plant: Set Atlas automated Ferry Route ("F" key) to plateau',
          '[5:00] Vehicle Plant: 2x Samson (Mobile AA to protect drop corridor)',
          '[5:25] Commander: 1x Construction Turret to assist vehicle fabrication',
          '[5:50] Air Ferry: Airlift 4x Stumps over cliff directly into enemy rear Mexes',
          '[6:20] Aircraft Plant: 2x Freedom Fighter (Air superiority screen)',
          '[6:50] Vehicle Plant: Deploy Advanced Vehicle Plant in base core',
          '[7:30] Advanced Vehicle Plant: 1x Advanced Construction Vehicle',
          '[8:15] Advanced Vehicle Plant: 2x Bull (Heavy frontline assault tanks)',
          '[9:00] Atlas Ferry: 2x Bull (Airlift Bulls onto isolated high-ground ridge)',
          '[9:50] Strike Group: 2x Bull (Shell enemy Commander and production core from cliff vantage)',
          '[10:45] Strike Group: 2x Brawler (Deploy gunships to mop up retreating constructors)',
        ],
        unitComposition: [
          '2x Atlas (Armada Air Transport)',
          '2x Bull (Armada Heavy Frontline Assault Tank)',
          '4x Stump (Armada Medium Frontline Tank)',
          '4x Flash (Armada High-Speed Raider Tank)',
          '2x Samson (Armada Mobile Anti-Air Screen)',
          '2x Brawler (Armada Heavy Rotary Assault Gunship)',
          '1x Sparrow (Armada Aerial Recon Scout Plane)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Automated Air-Drop & Cliff Bypass Siege

### [AIR TRANSPORT FERRY LANES] ('F' Command)
- In competitive BAR, ground armies often get bottlenecked in narrow mountain passes or choke points guarded by dozens of Light Laser Towers.
- Use the Atlas transport's automated Ferry command ('F'): set pickup and drop-off beacons. Any unit that moves into the beacon is automatically airlifted over mountains directly into the enemy's unfortified backline!

### [TACTICAL COMBAT EXECUTION]
- Fly heavy Bulls and Stumps over impassable terrain to crush vulnerable Solars and Advanced Mexes from behind!`,
      };
    }

    if (isCloakedDemo) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
          '[0:20] Commander: 2x Metal Extractor on base deposits (+4.4M/s)',
          '[0:42] Commander: 3x Solar Collector (Spaced grid, locking +80E)',
          '[1:05] Commander: Deploy Bot Lab in natural terrain depression',
          '[1:28] Bot Lab: 2x Pawn (Light raiders for peripheral radar vision)',
          '[1:50] Bot Lab: 1x Construction Bot (Perimeter expansion)',
          '[2:15] Commander: Reclaim nearby heavy boulders (+290M injection)',
          '[2:40] Construction Bot: 2x Expansion Mexes on outer flank lane',
          '[3:05] Construction Bot: 1x Radar Tower + 1x Light Laser Tower',
          '[3:30] Bot Lab: 4x Rocko (Pin enemy front and distract radar)',
          '[3:55] Construction Bot: 1x Energy Storage (Crucial buffer for cloaking drain)',
          '[4:20] Commander: Reclaim 3x early Solars (+465M tech slingshot)',
          '[4:50] Commander: Deploy Advanced Bot Lab in concealed rear pocket',
          '[5:30] Advanced Bot Lab: 1x Construction Turret (Triples fabrication buildpower)',
          '[6:00] Advanced Bot Lab: 3x Tumbleweed (Amphibious rolling bombs)',
          '[6:30] Advanced Bot Lab: 2x Sharpshooter (Snipers to eliminate spotters)',
          '[7:00] Advanced Bot Lab: 1x Gremlin (Stealth tank to jam radar coverage)',
          '[7:30] Strike Group: 3x Tumbleweed (Activate Cloak ["K" key] and navigate riverbed)',
          '[8:10] Bot Lab: 2x Lazarus (Stealth rez bots following behind bomb pack)',
          '[8:45] Strike Group: 3x Tumbleweed (Detonate under enemy Commander for +5000 alpha damage)',
          '[9:15] Lazarus: Reclaim enemy Commander metallic husk (+1250M windfall)',
          '[9:55] Advanced Bot Lab: 4x Hound (Assault bots to exploit shattered enemy lane)',
          '[10:45] Strike Group: 4x Hound (Roll over destabilized enemy base with Hounds and snipers)',
        ],
        unitComposition: [
          '4x Tumbleweed (Armada Amphibious Rolling Bomb)',
          '2x Sharpshooter (Armada Long-Range Sniper Bot)',
          '4x Hound (Armada Heavy T2 Plasma Skirmisher)',
          '1x Gremlin (Armada Stealth Ambush Tank)',
          '2x Lazarus (Stealthy Rez / Field Salvage Bot)',
          '1x Advanced Construction Bot (T2 Infrastructure)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Cloaked Tumbleweed & Comm Snipe

### [STEALTH INFILTRATION & RADAR BLIND SPOTS]
- **Energy Drain Protocol**: Cloaking requires continuous energy upkeep. Maintain at least +150E buffer and 1x Energy Storage so stealth units do not decloak prematurely mid-transit.
- **Amphibious Rolling Bombs**: Tumbleweeds navigate deep riverbeds and coastal shallows without surfacing, bypassing standard front chokes and radar cones completely.

### [TIMING ATTACK WINDOW: COMMANDER ASSASSINATION] (06:30 - 08:30)
- Enemy commanders frequently push forward around 07:00 to assist forward construction turrets or D-Gun incoming skirmishers.
- Infiltrate 3-4 cloaked Tumbleweeds behind them. Trigger manual self-destruct or ram them simultaneously for 5,000+ explosive alpha damage, instantly vaporizing the Commander before D-Gun can fire!
- Follow up with Lazarus stealth bots to vacuum the Commander husk (+1,250 Metal) or resurrect fallen bodyguards.`,
      };
    }

    if (isNaval) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Tidal Generator / Solar (+20E baseline grid)',
          '[0:20] Commander: 2x Underwater Metal Extractor (+4.4M/s)',
          '[0:45] Commander: 2x Tidal Generator / Solar (Locks in +60E threshold)',
          '[1:10] Commander: Deploy Shipyard in sheltered deep-water cove',
          '[1:32] Shipyard: 2x Dolphin (Fast corvettes to scout coastline)',
          '[1:55] Shipyard: 2x Eel (Submarines to secure underwater sea lanes)',
          '[2:20] Commander: Reclaim sunken hull debris / coastal rocks (+280M)',
          '[2:45] Shipyard: 1x Construction Ship (Expand deep-water mexes)',
          '[3:10] Construction Ship: 2x Perimeter Underwater Mexes + 1x Sonar Tower',
          '[3:35] Shipyard: 3x Corsair (Destroyers for depth charges & bombardment)',
          '[4:05] Construction Ship: 1x Floating Light Laser Tower (Defend tidal grid)',
          '[4:30] Shipyard: 1x Grim Reaper (Resurrection sub to scavenge sunken wrecks)',
          '[4:55] Commander: 1x Floating Construction Turret (Assist Shipyard)',
          '[5:25] Construction Ship: 4x Tidal Generators (Scale naval power grid)',
          '[6:00] Construction Ship: Deploy Advanced Shipyard in deep water',
          '[6:45] Advanced Shipyard: 1x Advanced Construction Ship',
          '[7:30] Advanced Construction Ship: Upgrade 2x Mexes to Advanced Sea Mexes (+20M/s)',
          '[8:15] Advanced Shipyard: 2x Serpent (Long-range battle submarines)',
          '[9:00] Advanced Shipyard: 2x Paladin (Cruisers with heavy plasma & depth charges)',
          '[9:45] Advanced Shipyard: 1x Epoch (Flagship - Forward-firing heavy plasma battery)',
          '[10:45] Grim Reaper: 1x Grim Reaper (Reanimate sunken enemy cruisers and destroyers)',
          '[11:30] Strike Group: 1x Epoch (Shell enemy coastal fortifications from 1200+ range)',
          '[12:15] Flagship Fleet: 1x Epoch (Decisive fleet engagement to establish absolute ocean dominance)',
        ],
        unitComposition: [
          '1x Epoch (Armada Heavy Flagship - Forward-Firing Plasma Battery)',
          '2x Serpent (Armada Long-Range Battle Submarine)',
          '2x Paladin (Armada Cruiser - Dual Heavy Plasma & Depth Charges)',
          '4x Corsair (Armada Destroyer - Surface & Subsurface Escort)',
          '1x Grim Reaper (Resurrection & Field Salvage Submarine)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Naval Superiority & Epoch Flagship Siege

### [FORWARD-FIRING BATTERY ARCHITECTURE]
- **The Epoch Advantage**: Unlike broadside warships, the Armada Epoch mounts all primary plasma cannons facing forward. Keep your bow aligned directly with the enemy coastline or fleet to concentrate 100% of your firepower without exposing vulnerable flanks.
- **Hovercraft Torpedo Immunity**: Be aware that hovercraft skim over the water surface and are completely immune to torpedoes and depth charges. Screen against hover raiders using Dolphin corvettes and Corsair deck guns.

### [SUB-SURFACE ACOUSTIC SCREEN & SALVAGE]
- Keep Eels and Serpents ahead of the battle line. Sonar pings reveal submerged enemies before they enter torpedo range.
- The Grim Reaper submarine recovers sunken capital ships at zero metal cost and 50% energy; every enemy battleship destroyed is a future Armada reinforcement!`,
      };
    }

    if (isTankRush) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
          '[0:20] Commander: 2x Metal Extractor on base deposits (+4.4M/s)',
          '[0:42] Commander: 2x Solar Collector (+60E threshold for factory)',
          '[1:08] Commander: Deploy Vehicle Plant',
          '[1:30] Commander: 2x Wind Turbine (Spaced 3 tiles apart)',
          '[1:48] Vehicle Plant: 2x Flash (Lane scout and harass)',
          '[2:08] Vehicle Plant: 1x Construction Vehicle (Perimeter expansion)',
          '[2:30] Commander: Reclaim spawn rock field (+280M injection)',
          '[2:55] Construction Vehicle: 2x Expansion Mexes (Outer lane)',
          '[3:18] Construction Vehicle: 1x Radar Tower (Choke vision)',
          '[3:38] Vehicle Plant: 6x Flash + 2x Stump (Frontline battle group)',
          '[4:02] Construction Vehicle: 1x Light Laser Tower (Anchor choke ramp)',
          '[4:25] Commander: 1x Construction Turret (Boosts factory buildpower)',
          '[4:48] Vehicle Plant: 2x Samson (Mobile AA escort)',
          '[5:10] Vehicle Plant: 2x Wolverine (Outrange static defenses)',
          '[5:35] Construction Vehicle: 1x Energy Storage + 2x Energy Converters',
          '[6:00] Strike Group: Flank raid with Flash tanks into enemy metal line',
          '[6:30] Commander: Reclaim early Solars (+310M tech refund)',
          '[7:00] Commander: Deploy Advanced Vehicle Plant in base pocket',
          '[7:40] Advanced Vehicle Plant: 1x Advanced Construction Vehicle',
          '[8:20] Advanced Construction Vehicle: Upgrade 2x Mex to Advanced Metal Extractor (+18M/s)',
          '[9:05] Advanced Construction Vehicle: Deploy Fusion Reactor (+750E/s)',
          '[9:50] Advanced Vehicle Plant: 3x Bull (Heavy assault tanks)',
          '[10:35] Advanced Vehicle Plant: 2x Penetrator (Long-range heavy laser artillery)',
          '[11:20] Armored Spearhead: 3x Bull (Push Bulls and Penetrators through enemy primary defense line)',
        ],
        unitComposition: [
          '8x Flash (Armada High-Speed Twin Laser Raider Tank)',
          '4x Stump (Armada Medium Frontline Assault Tank)',
          '3x Bull (Armada Heavy Frontline Assault Tank)',
          '2x Penetrator (Armada Heavy Long-Range Laser Artillery)',
          '2x Samson (Mobile Anti-Air Missile Truck)',
          '2x Wolverine (Light Mobile Artillery / Mine Dispenser)',
          '1x Advanced Construction Vehicle (T2 Infrastructure)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Blitzkrieg - Early Vehicle Raider Surge

### [MACRO DISCIPLINE: +60 ENERGY RULE & 100E:10M RATIO]
- **The +60E Power Threshold**: Notice how we never drop the Vehicle Plant until 3 Solars lock down +60 Energy. Dropping a factory on +20E cuts Commander build power down to a crawl and delays your first Flash tank by 25 seconds—an eternity in competitive BAR!
- **100:10 Macro Sustain**: As perimeter Mexes come online (+10M), immediately balance with Wind Turbines to maintain 100 Energy per 10 Metal. When excess power crosses 400+, slide on 1x Energy Converter (70E -> 1M) for a steady +5.7 metal influx.

### [POWER GRID CONVERSION & WIND SENSORS]
- If map wind averages >= 8, scale spaced pairs of Wind Turbines to avoid chain explosions. If wind falls below 6, drop an extra Solar Collector immediately to keep nanofabricators running at 100% capacity.

### [COMMANDER RECLAIM HARVEST]
- **02:30 Rock Reclaim**: Commander vacuums up local boulder clusters for +280 instant metal, injecting pure fuel into continuous Flash and Stump production.
- **06:30 Solar Recycling**: Reclaim early Solars to fund the Advanced Vehicle Plant, transitioning directly into Bulls and Penetrators!`,
      };
    }

    if (isAirOpening) {
      return {
        openingBuildOrder: [
          '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
          '[0:20] Commander: 2x Metal Extractor (+4.4M/s)',
          '[0:44] Commander: 2x Solar Collector (Achieves +60E required for air plant)',
          '[1:08] Commander: Deploy Aircraft Plant in protected rear corner',
          '[1:32] Commander: 2x Wind Turbine (Scaling power for aircraft fabrication)',
          '[1:50] Aircraft Plant: 1x Sparrow (Recon scout plane to spot enemy opening)',
          '[2:10] Aircraft Plant: 2x Freedom Fighter (Air superiority patrol against enemy scouts)',
          '[2:32] Commander: Reclaim spawn rock field (+270M injection)',
          '[2:55] Aircraft Plant: 1x Construction Aircraft (Perimeter expansion)',
          '[3:20] Construction Aircraft: 2x Perimeter Mexes on high-altitude ridges',
          '[3:45] Aircraft Plant: 3x Brawler (Heavy gunships for precision strikes)',
          '[4:10] Construction Aircraft: 1x Radar Tower + 1x Light Laser Tower',
          '[4:35] Aircraft Plant: 2x Shadow (Stealth bombers)',
          '[5:00] Strike Group: 3x Brawler (Surgical strike on isolated enemy expansion constructors)',
          '[5:30] Commander: 1x Construction Turret (Assisting Aircraft Plant)',
          '[6:00] Aircraft Plant: 2x Freedom Fighter (Reinforce air screen against mobile AA)',
          '[6:30] Commander: Reclaim obsolete Solars (+310M tech refund)',
          '[7:00] Commander: Deploy Advanced Aircraft Plant',
          '[7:45] Advanced Aircraft Plant: 1x Advanced Construction Aircraft',
          '[8:30] Advanced Construction Aircraft: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
          '[9:15] Advanced Aircraft Plant: 3x Banshee (Heavy T2 Gunships)',
          '[10:00] Advanced Aircraft Plant: 2x Whirlwind (T2 Stealth Interceptors)',
          '[10:50] Aerial Dominance: 3x Banshee (Coordinated gunship and bomber raid on enemy T2 factory foundation)',
        ],
        unitComposition: [
          '4x Brawler (Armada Heavy Rotary Assault Gunship)',
          '3x Banshee (Armada T2 Heavy Combat Gunship)',
          '2x Shadow (Armada Tactical Carpet Bomber)',
          '2x Whirlwind (Armada T2 Advanced Stealth Interceptor)',
          '4x Freedom Fighter (Air Superiority Interceptor)',
          '1x Sparrow (Armada Aerial Recon Scout Plane)',
        ],
        strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Air Supremacy - Gunship & Bomber Surgical Harass

### [MACRO DISCIPLINE: +60 ENERGY RULE & 100E:10M RATIO]
- **Air Factory Power Floor**: Air plants have brutal energy demands. Starting before +60E will brown out your base instantly. Securing 3x Solars gives the +60E bedrock needed to keep the nanofabricator spinning without choking the Commander.
- **100:10 Ratio & Energy Storage**: Air units drink energy like water. Build early Energy Storage before your second bomber is queued to cushion high burst drain and enable Commander D-Gun defense.

### [TIMING ATTACK WINDOWS] (03:15 - 10:50)
- **05:00 Gunship Snipe**: Fly Brawlers over ridgelines to eliminate isolated constructors.
- **10:50 Aerial Decapitation**: Coordinate Banshees and Shadows against enemy T2 factories and power grids!`,
      };
    }

    // Default Armada Bot Skirmish / Choke Creep
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
        '[0:20] Commander: 2x Metal Extractor on primary deposits (+4.4M/s)',
        '[0:42] Commander: 2x Solar Collector (+60E threshold reached)',
        '[1:06] Commander: Deploy Bot Lab on elevated terrain',
        '[1:30] Commander: 2x Wind Turbine (Sustained power for continuous queues)',
        '[1:48] Bot Lab: 2x Tick (Spider scout for early radar vision)',
        '[2:05] Bot Lab: 4x Pawn (Light raiders for outer node harassment)',
        '[2:30] Commander: Reclaim nearby large rocks (+260M metal boost)',
        '[2:52] Bot Lab: 1x Construction Bot (Perimeter expansion)',
        '[3:15] Construction Bot: 2x Expansion Mexes + 1x Radar Tower',
        '[3:38] Bot Lab: 6x Rocko (Rocket Skirmishers to outrange LLTs at 420 range)',
        '[4:02] Construction Bot: 1x Light Laser Tower at forward choke',
        '[4:25] Commander: 1x Construction Turret (Nanotower buildpower)',
        '[4:48] Bot Lab: 1x Lazarus (Rez bot to scavenge frontline wrecks)',
        '[5:10] Bot Lab: 2x Hammer (Plasma artillery to break static defenses)',
        '[5:35] Bot Lab: 2x Jethro (Mobile AA screen)',
        '[6:00] Construction Bot: 1x Energy Storage + 2x Energy Converters',
        '[6:30] Commander: Reclaim early Solars (+310M into T2 lab)',
        '[7:00] Commander: Deploy Advanced Bot Lab in base pocket',
        '[7:45] Advanced Bot Lab: 1x Advanced Construction Bot',
        '[8:30] Advanced Construction Bot: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
        '[9:15] Advanced Bot Lab: 4x Hound (Heavy skirmishers)',
        '[10:00] Advanced Bot Lab: 2x Sharpshooter (Snipers to pick off heavy units)',
        '[11:00] Strike Group: 4x Hound (Advance forward with Rockos and Lazarus line to take central theater)',
      ],
      unitComposition: [
        '8x Pawn (Armada Light Laser Raider Bot)',
        '8x Rocko (Armada Rocket Skirmisher Bot)',
        '4x Hound (Armada Heavy T2 Plasma Skirmisher)',
        '2x Sharpshooter (Armada Long-Range Sniper Bot)',
        '2x Hammer (Armada Mobile Plasma Artillery Bot)',
        '2x Jethro (Mobile Anti-Air Missile Bot)',
        '1x Lazarus (Resurrection & Fast Reclaim Bot)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Armada Bot Skirmish & Choke Creep

### [MACRO DISCIPLINE: +60 ENERGY RULE & 100E:10M RATIO]
- **The +60E Bedrock**: 3x Solars give you guaranteed +60E before the Bot Lab starts. That means the Commander can assist unit production without bleeding your energy reserves dry.
- **100:10 Macro Sustain**: Match every 10 metal per second with 100 energy generation. Bot armies are metal-efficient, but Rockos and Lasers need constant power backing.

### [TACTICAL RANGE SUPERIORITY] (03:38 - 11:00)
- Rockos boast 420 range, outranging Light Laser Towers (420 vs 400). Use hold-ground micro to pick apart static defenses without taking hull damage while Ticks provide radar spotting.
- Follow up with Hounds and Sharpshooters to establish absolute choke dominance!`,
    };
  }

  // Cortex Faction Builds
  if (isSolarReclaim) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E guaranteed baseline)',
        '[0:20] Commander: 2x Metal Extractor on natural deposits (+4.4M/s)',
        '[0:42] Commander: 2x Solar Collector (Spaced 3 tiles apart - reaches +60E)',
        '[1:05] Commander: Deploy Bot Lab in defensible depression',
        '[1:28] Commander: 1x Solar Collector (Achieves +80E threshold)',
        '[1:45] Bot Lab: 2x Grunt (Fast raider for early lane scouting)',
        '[2:05] Bot Lab: 1x Construction Bot (Perimeter expansion)',
        '[2:25] Commander: Reclaim nearby large boulders (+320M instant metal injection)',
        '[2:50] Construction Bot: 2x Expansion Mexes on forward nodes',
        '[3:15] Construction Bot: 1x Radar Tower on high-ground choke',
        '[3:35] Bot Lab: 4x Storm (Rocket skirmishers to outrange LLTs at 430 range)',
        '[4:00] Construction Bot: 1x Light Laser Tower (Anchor front choke)',
        '[4:25] Commander: 1x Construction Turret (Nanotower assisting Bot Lab)',
        '[4:50] Bot Lab: 1x Necro (Resurrection & rapid battlefield salvage bot)',
        '[5:15] Bot Lab: 2x Crasher (Mobile Anti-Air escort against early air)',
        '[5:40] Construction Bot: 1x Energy Storage + 1x Energy Converter (70E -> 1M)',
        '[6:05] Commander: Reclaim all 4 early Solars (+600M 100% tech refund)',
        '[6:35] Commander: Deploy Advanced Bot Lab (Funded by refunded solar metal)',
        '[7:15] Advanced Bot Lab: 1x Advanced Construction Bot',
        '[7:55] Advanced Construction Bot: Upgrade 2x base Mex to Advanced Metal Extractor (+18M/s)',
        '[8:40] Advanced Construction Bot: Deploy Advanced Solar Generator (+80E)',
        '[9:25] Advanced Bot Lab: 4x Sheldon (T2 Heavy Skirmisher Bot)',
        '[10:10] Advanced Bot Lab: 2x Sumo (T2 Super-Heavy Plasma Assault Bot)',
        '[11:00] Strike Group: 4x Sheldon (Coordinate Sheldons and Sumos to crack fortified enemy choke)',
      ],
      unitComposition: [
        '4x Grunt (Cortex Fast Raider Bot)',
        '6x Storm (Cortex Rocket Skirmisher Bot)',
        '4x Sheldon (Cortex T2 Heavy Skirmisher Bot)',
        '2x Sumo (Cortex T2 Super-Heavy Plasma Assault Bot)',
        '1x Necro (Resurrection & Rapid Salvage Bot)',
        '2x Crasher (Mobile Anti-Air Missile Bot)',
        '1x Advanced Construction Bot (T2 Infrastructure)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Anti-Chain Solars & 100% Metal Reclaim Slingshot

### [MACRO DISCIPLINE: THE SOLAR RECLAIM SLINGSHOT]
- **Eliminating Volatility**: Wind turbines on fluctuating maps risk crippling power stalls. Solar Collectors give an unyielding +20 Energy baseline.
- **Anti-Chain Spacing**: Cortex solars explode with heavy area damage upon destruction. Spacing them by 3-4 tiles guarantees zero cascading grid failure.
- **100% Metal Reclaim at 06:05**: By reclaiming 4 solars, you get +600 metal back on the spot (150 metal each)—funding an instant Advanced Bot Lab transition while competitors are still building T1 wind farms!

### [TACTICAL EXECUTION: SHELDON & SUMO CRACK] (09:25 - 11:00)
- Sheldons deliver punishing 650-range plasma volleys, disintegrating defensive emplacements before enemy turrets can return fire.
- Position Sumos in front as walking laser bulwarks to absorb incoming fire while Necros reanimate all casualties on the fly!`,
    };
  }

  if (isFlankRez) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E baseline)',
        '[0:20] Commander: 2x Metal Extractor (+4.4M/s)',
        '[0:42] Commander: 2x Solar Collector (+60E threshold reached)',
        '[1:06] Commander: Deploy Bot Lab in primary attack lane',
        '[1:30] Commander: 2x Wind Turbine (Sustaining 100E:10M ratio)',
        '[1:48] Bot Lab: 4x Grunt (Fast raiders to probe flanks and cut supply lines)',
        '[2:10] Bot Lab: 1x Construction Bot (Perimeter expansion)',
        '[2:32] Commander: Reclaim large boulder clusters (+280M instant metal injection)',
        '[2:55] Construction Bot: 2x Expansion Mexes + 1x Radar Tower',
        '[3:18] Bot Lab: 4x Storm (Rocket skirmishers to pin the frontline)',
        '[3:40] Construction Bot: 1x Light Laser Tower at forward choke',
        '[4:02] Bot Lab: 2x Pyros (Close-quarters flamethrowers to melt enemy raiders)',
        '[4:25] Commander: 1x Construction Turret (Assisting Bot Lab production)',
        '[4:48] Bot Lab: 2x Necro (Set to follow combat line and reanimate wrecks)',
        '[5:10] Bot Lab: 2x Crasher (Mobile Anti-Air protection against air scouts)',
        '[5:35] Construction Bot: 1x Energy Storage + 2x Energy Converters',
        '[6:05] Commander: Reclaim 2x early Solars (+300M into tech leap)',
        '[6:40] Commander: Deploy Advanced Bot Lab in base depression',
        '[7:20] Advanced Bot Lab: 1x Advanced Construction Bot',
        '[8:00] Advanced Construction Bot: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
        '[8:45] Advanced Bot Lab: 4x Sheldon (T2 Heavy Skirmishers)',
        '[9:30] Advanced Bot Lab: 3x Welder (Fast assault shock bots)',
        '[10:15] Strike Group: 4x Sheldon (Encircle enemy army with Grunts for +150% flank damage while Necros reanimate)',
      ],
      unitComposition: [
        '8x Grunt (Cortex Fast Raider Bot)',
        '6x Storm (Cortex Rocket Skirmisher Bot)',
        '2x Pyros (Close-Quarters Flamethrower Assault Bot)',
        '4x Sheldon (Cortex T2 Heavy Skirmisher Bot)',
        '3x Welder (Cortex Fast Heavy Assault Bot)',
        '2x Necro (Resurrection & Rapid Salvage Bot)',
        '2x Crasher (Mobile Anti-Air Support Bot)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Flank Assault & Necro Reanimation Swarm

### [THE FLANKING ENGINE] (+100% to +150% Rear Damage)
- **Flank Multipliers**: BAR's combat engine rewards encircling the enemy. Strike enemy heavy armor from behind with Grunts for a massive +150% damage bonus!
- **Necro Field Reanimation**: Necros salvage metal at rapid speed and reanimate husks on the fly. Turn fallen enemy units into Cortex shock troops right inside their own territory!

### [TIMING ATTACK WINDOWS] (04:02 - 10:15)
- Open with Storm rockets from 430 range to pin defense turrets.
- Sweep Grunts around the rear perimeter to trigger flanking penalties while Pyros incinerate defending light units!`,
    };
  }

  if (isDedicatedEco) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E baseline)',
        '[0:20] Commander: 2x Metal Extractor (+4.4M/s)',
        '[0:44] Commander: 3x Solar Collector (Spaced grid, locking in +80E)',
        '[1:08] Commander: Deploy Bot Lab in safe rear pocket',
        '[1:30] Bot Lab: 2x Construction Bot (Energy grid expansion and perimeter)',
        '[1:55] Commander: Reclaim dense boulder field (+320M injection)',
        '[2:20] Construction Bot 1: 6x Wind Turbines in spaced pairs',
        '[2:50] Construction Bot 2: 2x Expansion Mexes on rear deposits',
        '[3:15] Construction Bot 1: 1x Energy Storage (Buffer for conversion)',
        '[3:40] Construction Bot 2: 2x Energy Converters (70E -> 1M)',
        '[4:05] Commander: 2x Construction Turret (Surrounding Bot Lab)',
        '[4:30] Bot Lab: 1x Necro (Base repair and wreckage reclamation)',
        '[4:55] Commander: Deploy Advanced Solar Generator (+80E baseline)',
        '[5:25] Commander: Deploy Advanced Bot Lab foundation with Nanotower assist',
        '[6:00] Advanced Bot Lab: 1x Advanced Construction Bot',
        '[6:40] Advanced Construction Bot: Upgrade 3x base Mex to Advanced Metal Extractor (+27M/s)',
        '[7:25] Advanced Construction Bot: Deploy Advanced Fusion Reactor (AFUS) (+3000E/s)',
        '[8:15] Commander: Assist AFUS fabrication with Nanotower cluster',
        '[9:00] Advanced Construction Bot: Deploy 4x Advanced Energy Converters',
        '[9:45] Base Eco: Channel +25M/s overflow metal directly to frontline allies',
        '[10:30] Advanced Bot Lab: 2x Advanced Construction Bot to scale 2nd AFUS reactor',
        '[11:15] Advanced Construction Bot: Deploy 2nd AFUS Reactor (+6000E/s combined)',
        '[12:00] Base Eco: 1x Tremor (Deploy mobile heavy rapid plasma artillery battery to shell enemy core)',
      ],
      unitComposition: [
        '2x Construction Bot (Energy Grid Expansion)',
        '1x Necro (Base Repair & Reclaim Assistant)',
        '2x Advanced Construction Bot (AFUS & T2 Converter Deployment)',
        '2x Advanced Fusion Reactor (+6000 Energy/s combined)',
        '6x Advanced Energy Converter (70E:1M Conversion Grid)',
        '1x Tremor (Cortex Heavy Mobile Rapid Plasma Artillery)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Dedicated Backline Eco & AFUS Powerhouse

### [MACRO DISCIPLINE: 70E:1M RATIO & SLINGSHOTTING THE TEAM]
- Fast T2 into Advanced Fusion (+3000 E/s) is the premier win condition in 8v8 competitive BAR.
- Convert power with 4x Advanced Converters and funnel surplus metal into frontline teammate factories or tech directly into heavy artillery (Tremor) and T3 game-enders!`,
    };
  }

  if (isAirDrop) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E baseline)',
        '[0:20] Commander: 2x Metal Extractor (+4.4M/s)',
        '[0:42] Commander: 2x Solar Collector (+60E threshold reached)',
        '[1:06] Commander: Deploy Bot Lab in defensible pocket',
        '[1:30] Commander: Deploy Aircraft Plant in adjacent pocket',
        '[1:55] Bot Lab: 2x Grunt (Early scouting and vision)',
        '[2:15] Bot Lab: 1x Construction Bot (Perimeter expansion)',
        '[2:35] Commander: Reclaim nearby heavy boulders (+280M instant metal)',
        '[2:58] Aircraft Plant: 2x Valkyrie (Heavy air transports for automated ferry routes)',
        '[3:22] Bot Lab: 4x Thug (Armored plasma bots for cliff drop)',
        '[3:45] Aircraft Plant: 1x Avenger (Air superiority escort against enemy fighters)',
        '[4:10] Bot Lab: 2x Crasher (Anti-air support for drop zone)',
        '[4:35] Valkyrie Ferry: 2x Valkyrie (Establish drop lane delivering Thugs onto enemy rear high ground)',
        '[5:00] Commander: 1x Construction Turret (Accelerate factory buildpower)',
        '[5:30] Construction Bot: 2x Expansion Mexes + 1x Energy Storage',
        '[6:00] Commander: Reclaim early Solars (+300M tech refund)',
        '[6:35] Commander: Deploy Advanced Bot Lab in base crevasse',
        '[7:15] Advanced Bot Lab: 1x Advanced Construction Bot',
        '[7:55] Advanced Bot Lab: 2x The Can (Heavy armored walking fortresses)',
        '[8:40] Aircraft Plant: 2x Valkyrie (Reinforce heavy ferry capacity)',
        '[9:20] Valkyrie Ferry: 2x The Can (Air-drop walking fortresses into enemy backline economy nodes)',
        '[10:05] Advanced Bot Lab: 2x Sheldon (Provide long-range suppression)',
        '[10:45] Combined Citadel: 2x The Can (Encircle dropped Cans with Sheldons and Crasher AA to dismantle enemy base)',
      ],
      unitComposition: [
        '4x Valkyrie (Cortex Heavy Air Transport)',
        '2x The Can (Cortex Super-Heavy Walking Fortress Bot)',
        '4x Thug (Cortex Armored Plasma Assault Bot)',
        '2x Sheldon (Cortex T2 Heavy Skirmisher Bot)',
        '2x Crasher (Cortex Mobile Anti-Air Screen)',
        '1x Avenger (Cortex Air Superiority Interceptor)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Automated Valkyrie Air-Drop Siege

### [AIR TRANSPORT FERRY LANES & HEAVY ARMOR CLIFF DROPS]
- Heavy Cortex fortresses like The Can have terrifying armor and DPS, but move at a slow crawl.
- Use automated Valkyrie ferry lines to lift them over cliffs and waterways, dropping unkillable laser fortresses straight into the enemy rear economy!

### [DROP TIMINGS & ESCORT SCREENS] (04:35 - 10:45)
- Always lead transport ferry drops with an Avenger fighter to trigger and absorb anti-air fire.
- Drop Thugs early onto contested ridges, followed by The Can at 09:20 to annihilate the enemy base core!`,
    };
  }

  if (isCloakedDemo) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
        '[0:20] Commander: 2x Metal Extractor on natural deposits (+4.4M/s)',
        '[0:42] Commander: 3x Solar Collector (Spaced grid, locking in +80E threshold)',
        '[1:08] Commander: Deploy Bot Lab in rear crevasse',
        '[1:32] Bot Lab: 2x Grunt (Peripheral vision and lane scouting)',
        '[1:55] Bot Lab: 1x Construction Bot (Perimeter radar and energy expansion)',
        '[2:18] Commander: Reclaim heavy boulder formations (+300M instant metal injection)',
        '[2:42] Construction Bot: 2x Expansion Mexes on flank corridors',
        '[3:08] Construction Bot: 1x Radar Tower + 1x Light Laser Tower',
        '[3:32] Bot Lab: 4x Storm (Skirmishers to draw enemy attention away from flanks)',
        '[3:58] Commander: 1x Construction Turret (Nanotower buildpower)',
        '[4:22] Bot Lab: 1x Graverobber (Stealthy fast salvage & rez bot)',
        '[4:48] Construction Bot: 1x Energy Storage (Vital buffer for continuous cloaking drain)',
        '[5:15] Commander: Reclaim all 4 early Solars (+600M 100% tech refund)',
        '[5:45] Commander: Deploy Advanced Bot Lab in concealed rear base pocket',
        '[6:25] Advanced Bot Lab: 1x Advanced Construction Bot',
        '[7:05] Advanced Bot Lab: 4x Skuttle (Advanced Amphibious Crawling Bomb with cloak active)',
        '[7:45] Advanced Bot Lab: 2x Bedbug (Amphibious crawling bombs as diversionary screen)',
        '[8:25] Advanced Bot Lab: 1x Commando (Stealthy paratrooper bot bypassing radar)',
        '[9:05] Advanced Bot Lab: 2x Sheldon (Provide long-range fire cover)',
        '[9:50] Strike Group: 4x Skuttle (Crawl cloaked through riverbed into enemy Commander or AFUS)',
        '[10:20] Strike Group: 4x Skuttle (Trigger 6,000+ explosive alpha strike to instantly vaporize target)',
        '[10:50] Salvage Unit: 2x Graverobber (Vacuum +1,250M Commander wreck under radar cover before opponent reacts)',
      ],
      unitComposition: [
        '4x Skuttle (Cortex Advanced Amphibious Crawling Bomb)',
        '2x Bedbug (Cortex Amphibious Crawling Bomb)',
        '1x Commando (Cortex Stealthy Paratrooper Bot)',
        '2x Graverobber (Cortex Stealthy Rez & Rapid Salvage Bot)',
        '2x Sheldon (Cortex T2 Heavy Skirmisher Bot)',
        '1x Advanced Construction Bot (T2 Infrastructure)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Cloaked Skuttle & Comm Snipe

### [SKUTTLE EXPLOSIVE ALPHA & RADAR INFILTRATION]
- **The Ultimate Assassination Weapon**: The Skuttle is BAR's premier tactical weapon: an amphibious crawling bomb that cloaks and navigates underwater without surfacing.
- **Energy Upkeep Warning**: Cloaking drains energy continuously. Ensure at least +120E surplus or energy storage buffer before moving a Skuttle pack into enemy territory.
- **Target Priority: Commander & AFUS**: A single Skuttle detonation near an enemy Commander or Advanced Fusion Reactor triggers an immediate cataclysmic secondary explosion, ending the match or crippling an entire lane.
- **Graverobber Salvage**: Graverobbers are radar-invisible. Trail them behind the detonation zone to immediately vacuum up the enemy commander wreck (+1,250 Metal) before the opponent can react.`,
    };
  }

  if (isNaval) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Tidal Generator / Solar Collector (+20E baseline grid)',
        '[0:20] Commander: 2x Underwater Metal Extractor (+4.4M/s)',
        '[0:42] Commander: 2x Tidal Generator / Solar Collector (Locks in +60E)',
        '[1:08] Commander: Deploy Shipyard in sheltered deep-water basin',
        '[1:32] Commander: 2x Tidal Generator (Scaling power for naval fabrication)',
        '[1:50] Shipyard: 2x Supporter (Light gun boat for swift coastal patrol)',
        '[2:12] Shipyard: 2x Orca (Submarines to secure underwater choke points)',
        '[2:35] Commander: Reclaim sunken hull debris / coastal boulders (+300M injection)',
        '[2:58] Shipyard: 1x Construction Ship (Perimeter expansion)',
        '[3:22] Construction Ship: 2x Deep-Sea Expansion Mexes + 1x Sonar/Radar Tower',
        '[3:48] Shipyard: 3x Oppressor (Destroyers for heavy depth charges and naval artillery)',
        '[4:15] Construction Ship: 1x Floating Light Laser Tower (Anchor sea lane)',
        '[4:40] Commander: 1x Construction Turret (Assisting Shipyard fabrication)',
        '[5:05] Shipyard: 1x Death Cavalry (Resurrection submarine to scavenge sunken hulls)',
        '[5:30] Construction Ship: 1x Tidal Generator Farm + 1x Energy Storage',
        '[6:00] Commander: Reclaim early tidal units / Solars (+320M tech refund)',
        '[6:40] Construction Ship: Deploy Advanced Shipyard with Nanotower assist',
        '[7:25] Advanced Shipyard: 1x Advanced Construction Ship',
        '[8:10] Advanced Construction Ship: Upgrade offshore Mexes to Advanced Metal Extractor (+18M/s)',
        '[9:00] Advanced Shipyard: 2x Buccaneer (Cruisers with heavy plasma & anti-sub screen)',
        '[9:50] Advanced Shipyard: 2x Kraken (Long-range battle submarines)',
        '[10:40] Advanced Shipyard: 1x Black Hydra (Cortex Flagship with devastating broadside laser battery)',
        '[11:30] Death Cavalry: 1x Death Cavalry (Reanimate destroyed enemy cruisers at zero metal cost)',
        '[12:15] Flagship Fleet: 1x Black Hydra (Steer broadside perpendicular to enemy coastline to bring beam lasers to bear)',
      ],
      unitComposition: [
        '1x Black Hydra (Cortex Super-Flagship - Broadside Heavy Laser Battery)',
        '2x Kraken (Cortex Long-Range Battle Submarine)',
        '2x Buccaneer (Cortex Cruiser - Heavy Plasma & Anti-Sub Screen)',
        '4x Oppressor (Cortex Destroyer - Surface & Subsurface Escort)',
        '1x Death Cavalry (Resurrection & Field Salvage Submarine)',
        '1x Advanced Construction Ship (T2 Naval Infrastructure)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Naval Superiority & Black Hydra Broadside

### [BROADSIDE GEOMETRY & BLACK HYDRA MICRO]
- **Broadside Laser Alignment**: Unlike Armada's forward-firing Epoch, the Cortex Black Hydra mounts terrifying continuous beam lasers along its port and starboard broadsides. Always steer perpendicular to the enemy target to bring all laser banks to bear simultaneously!
- **Kraken Sub-Surface Stalking**: The Kraken outranges standard depth charges. Hunt enemy battleships from maximum acoustic range while staying completely submerged.

### [DEATH CAVALRY FIELD REANIMATION]
- Sunken capital ships represent massive pools of refined metal. The Death Cavalry submarine reanimates destroyed battleships at zero metal cost and 50% energy; resurrect the enemy's own fleet against them!`,
    };
  }

  if (isTankRush) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E guaranteed baseline)',
        '[0:20] Commander: 2x Metal Extractor on natural ore deposits (+4.4M/s)',
        '[0:42] Commander: 2x Solar Collector (Locks in +60E threshold prior to Vehicle Plant)',
        '[1:06] Commander: Deploy Vehicle Plant angled toward central combat corridors',
        '[1:30] Commander: 2x Wind Turbine (Sustaining 100E:10M golden macro ratio)',
        '[1:50] Vehicle Plant: 2x Raider (Medium Battle Tank to probe enemy expansion)',
        '[2:12] Vehicle Plant: 1x Construction Vehicle (Perimeter expansion)',
        '[2:35] Commander: Reclaim heavy rock boulders (+300M instant metal injection)',
        '[2:58] Construction Vehicle: 2x Expansion Mexes on vehicle flatlands',
        '[3:20] Construction Vehicle: 1x Radar Tower + 1x Light Laser Tower',
        '[3:45] Vehicle Plant: 4x Raider (Medium battle tanks for rapid flank raids)',
        '[4:10] Vehicle Plant: 2x Leveler (Riot tanks with heavy cannons to obliterate swarming bots)',
        '[4:35] Commander: 1x Construction Turret (Assisting Vehicle Plant)',
        '[5:00] Vehicle Plant: 2x Slasher (Mobile rocket AA trucks for range and air defense)',
        '[5:25] Construction Vehicle: 1x Energy Storage + 1x Energy Converter',
        '[5:55] Commander: Reclaim early Solars (+320M tech refund)',
        '[6:30] Commander: Deploy Advanced Vehicle Plant in base pocket',
        '[7:15] Advanced Vehicle Plant: 1x Advanced Construction Vehicle',
        '[8:00] Advanced Construction Vehicle: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
        '[8:45] Advanced Vehicle Plant: 3x Tiger (Heavy battle tanks with devastating armor)',
        '[9:35] Advanced Vehicle Plant: 2x Tremor (Mobile heavy rapid plasma artillery)',
        '[10:25] Armored Spearhead: 2x Tremor (Shell enemy defensive perimeter from 1200+ range)',
        '[11:15] Armored Spearhead: 3x Tiger (Push Tigers and Levelers through the breach to annihilate the enemy base)',
      ],
      unitComposition: [
        '6x Raider (Cortex Medium Battle Tank)',
        '2x Leveler (Cortex Short-Range Heavy Riot Cannon Tank)',
        '2x Slasher (Cortex Mobile Surface-to-Air & Rocket Truck)',
        '3x Tiger (Cortex Heavy Assault Tank)',
        '2x Tremor (Cortex Mobile Heavy Rapid Plasma Artillery)',
        '1x Advanced Construction Vehicle (T2 Infrastructure)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Iron Fist - Early Blitz Raider Surge

### [MACRO DISCIPLINE: +60 ENERGY RULE & 100E:10M RATIO]
- **Heavy Armor Needs Heavy Power**: Cortex tanks carry thicker hulls and high energy maintenance. Never place the Vehicle Plant before reaching +60 Energy (3x Solars).
- **100:10 Macro Sustain**: With 4 Mexes pumping 8.8M/s, your energy grid must produce 90-100E. Build spaced wind turbines and reserve 150+ energy buffer for Commander D-Guns.

### [TIMING ATTACK WINDOWS] (03:45 - 11:15)
- **Raider Incursion (03:45)**: Group 4x Raiders and dive past the front line to snipe 2-3 enemy Metal Extractors.
- **Riot Breakthrough (04:10)**: Roll forward with Levelers. The Leveler's riot cannon vaporizes swarms and tears open defense lines.
- **Apex Tremor Siege (10:25)**: Tremors unleash devastating continuous plasma barrages from extreme range, pulverizing fortifications before Tigers roll in!`,
    };
  }

  if (isAirOpening) {
    return {
      openingBuildOrder: [
        '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
        '[0:20] Commander: 2x Metal Extractor (+4.4M/s)',
        '[0:44] Commander: 2x Solar Collector (Achieves +60E required for air plant)',
        '[1:08] Commander: Deploy Aircraft Plant in protected rear base pocket',
        '[1:32] Commander: 2x Wind Turbine (Scaling power for aircraft fabrication)',
        '[1:50] Aircraft Plant: 1x Finch (Recon scout plane to spot enemy opening)',
        '[2:10] Aircraft Plant: 2x Valiant (Air superiority fighters to sweep enemy scouts)',
        '[2:32] Commander: Reclaim spawn rock field (+270M injection)',
        '[2:55] Aircraft Plant: 1x Construction Aircraft (Perimeter expansion)',
        '[3:20] Construction Aircraft: 2x Expansion Mexes on high-altitude plateau',
        '[3:45] Aircraft Plant: 3x Rapier (Gunships for precision harassment)',
        '[4:10] Construction Aircraft: 1x Radar Tower + 1x Light Laser Tower',
        '[4:35] Aircraft Plant: 2x Whirlwind (Tactical carpet bombers)',
        '[5:00] Strike Group: 3x Rapier (Surgical strike on isolated enemy expansion constructors)',
        '[5:30] Commander: 1x Construction Turret (Assisting Aircraft Plant)',
        '[6:00] Aircraft Plant: 2x Valiant (Reinforce air screen against mobile AA)',
        '[6:30] Commander: Reclaim obsolete Solars (+310M tech refund)',
        '[7:00] Commander: Deploy Advanced Aircraft Plant',
        '[7:45] Advanced Aircraft Plant: 1x Advanced Construction Aircraft',
        '[8:30] Advanced Construction Aircraft: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
        '[9:15] Advanced Aircraft Plant: 3x Titan (Heavy T2 Gunships)',
        '[10:00] Advanced Aircraft Plant: 2x Hurricane (T2 Strategic Heavy Bombers)',
        '[10:50] Aerial Dominance: 3x Titan (Coordinated Titan and Hurricane bombing run on enemy T2 factory foundation)',
      ],
      unitComposition: [
        '3x Rapier (Cortex Combat Gunship)',
        '3x Titan (Cortex Heavy T2 Gunship)',
        '2x Whirlwind (Cortex Tactical Carpet Bomber)',
        '2x Hurricane (Cortex T2 Strategic Heavy Bomber)',
        '4x Valiant (Cortex Air Superiority Fighter)',
        '1x Finch (Cortex Aerial Recon Scout Plane)',
      ],
      strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Aerial Supremacy - Gunship & Strategic Bomber Raid

### [MACRO DISCIPLINE: +60 ENERGY RULE & 100E:10M RATIO]
- **Air Factory Power Floor**: Air plants have brutal energy demands. Starting before +60E will brown out your base immediately. Securing 3x Solars gives the +60E bedrock needed to keep the nanofabricator spinning without choking the Commander.
- **100:10 Ratio & Energy Storage**: Air units drink energy like water. Build early Energy Storage before your second bomber is queued to cushion high burst drain and enable Commander D-Gun defense.

### [TIMING ATTACK WINDOWS] (03:45 - 10:50)
- **05:00 Gunship Snipe**: Fly Rapiers over ridgelines to eliminate isolated constructors.
- **10:50 Aerial Decapitation**: Coordinate Titans and Hurricanes against enemy T2 factories and power grids!`,
    };
  }

  // Cortex Default Bot Assault (Pyros / Thug / Grunt / Sheldon)
  return {
    openingBuildOrder: [
      '[0:00] Commander: 1x Solar Collector (+20E baseline grid)',
      '[0:20] Commander: 2x Metal Extractor on natural metal veins (+4.4M/s)',
      '[0:42] Commander: 2x Solar Collector (Reaches vital +60E threshold before factory drops)',
      '[1:06] Commander: Deploy Bot Lab in defensible pocket with clean deployment ramps',
      '[1:30] Commander: 2x Wind Turbine (Sustaining 100E:10M ratio for continuous bot fabrication)',
      '[1:48] Bot Lab: 2x Roach (Crawling bombs to breach early enemy choke defenses)',
      '[2:08] Bot Lab: 4x Grunt (Light raider bots for rapid expansion denial and harassing)',
      '[2:30] Commander: Reclaim large boulder clusters (+275M surge for uninterrupted production)',
      '[2:52] Bot Lab: 1x Construction Bot (Perimeter expansion)',
      '[3:15] Construction Bot: 2x Expansion Mexes + 1x Radar Tower',
      '[3:38] Bot Lab: 4x Storm (Rocket skirmishers to pick apart enemy LLTs at 430 range)',
      '[4:02] Construction Bot: 1x Light Laser Tower at forward choke',
      '[4:25] Bot Lab: 2x Pyros (Flame assault bots to incinerate incoming raider packs)',
      '[4:48] Commander: 1x Construction Turret (Nanotower assisting Bot Lab)',
      '[5:10] Bot Lab: 1x Necro (Rez bot to scavenge and reanimate frontline casualties)',
      '[5:35] Bot Lab: 2x Crasher (Mobile Anti-Air screen)',
      '[6:00] Construction Bot: 1x Energy Storage + 2x Energy Converters',
      '[6:30] Commander: Reclaim early Solars (+310M tech refund)',
      '[7:00] Commander: Deploy Advanced Bot Lab in base pocket',
      '[7:45] Advanced Bot Lab: 1x Advanced Construction Bot',
      '[8:30] Advanced Construction Bot: Upgrade base Mexes to Advanced Metal Extractor (+18M/s)',
      '[9:15] Advanced Bot Lab: 4x Sheldon (Heavy skirmishers for range superiority)',
      '[10:00] Advanced Bot Lab: 2x Sumo (Heavy assault walking fortresses)',
      '[11:00] Strike Group: 4x Sheldon (Advance battle line with Sumos and Necros to overwhelm enemy core)',
    ],
    unitComposition: [
      '6x Grunt (Cortex Fast Raider Bot)',
      '4x Storm (Cortex Rocket Skirmisher Bot)',
      '2x Pyros (Close-Quarters Flamethrower Assault Bot)',
      '4x Sheldon (Cortex T2 Heavy Skirmisher Bot)',
      '2x Sumo (Cortex Super-Heavy Plasma Assault Bot)',
      '2x Crasher (Mobile Anti-Air Support Bot)',
      '1x Necro (Resurrection & Rapid Salvage Bot)',
    ],
    strategyNotes: `# [STRATEGIC BRIEFING: CASTER DESK]
## Cortex Flame & Steel - Bot Assault Strategy

### [MACRO DISCIPLINE: +60 ENERGY RULE & 100E:10M RATIO]
- **The +60E Launchpad**: Securing 3x Solars gives guaranteed +60E before the Bot Lab is queued. Cortex bots build fast—without +60E, your Commander will stall on the very first Grunt.
- **100:10 Macro Sustain**: Keep energy generation at 10x your metal income. Scale wind turbines in spaced pairs and use 1x Energy Converter when storage exceeds 400+.

### [POWER GRID CONVERSION & COMMANDER RECLAIM]
- **Boulder Injection & Solar Recycling**: Commander claims 275+ metal from nearby rocks at 02:30, then reclaims early Solars at 06:30 to fund an uninterrupted Advanced Bot Lab transition.

### [TIMING ATTACK WINDOWS] (03:38 - 11:00)
- Open with Storm rockets from 430 range to force an opponent counter-charge.
- Counter-charge with Pyros as enemies close in, melting incoming raiders with terrifying AoE fire damage!
- Follow up with Sheldons and Sumos at 11:00 to break fortified chokes permanently!`,
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
