export type MetalDensity = 'low' | 'medium' | 'high' | 'all-metal';

export interface BarMapData {
  id: string;
  name: string;
  subtext: string;
  windRange: [number, number]; // [min, max] in m/s
  windAvg: number;
  windLabel: string;
  tidal: number; // +E/s from Tidal Generators
  metalDensity: MetalDensity;
  terrainTag: string;
  ecoFocus: string;
  recommendedDoctrines: string[];
  chokePoints: string; // Markdown detailing geo vents, choke points, and main battle lines
}

export const BAR_MAPS: Record<string, BarMapData> = {
  'supreme-isthmus': {
    id: 'supreme-isthmus',
    name: 'Supreme Isthmus',
    subtext: '8v8 Meta Standard, High Ground & Dual Sea',
    windRange: [4, 18],
    windAvg: 12,
    windLabel: 'MODERATE',
    tidal: 18,
    metalDensity: 'medium',
    terrainTag: 'CHOKE & SEA',
    ecoFocus: 'Tidal Boost into Heavy Sea & Artillery',
    recommendedDoctrines: [
      'Sea Choke Hold',
      'Fast T2 Tech',
      'Cliff Artillery Crawl',
      'Hover Raider Flank',
    ],
    chokePoints: `### Tactical Topography // Supreme Isthmus
- **The Land Bridge (Center)**: Primary frontal meatgrinder. Dense Dragon's Teeth (DT) and Plasma Defenses (LLTs/Beamer) required at narrow pinch point (Elevation +120m).
- **Geothermal Vents**: 
  - 1x Safe Base Geo (rear base plateau).
  - 1x Contested Hill Geo on middle elevation flank — crucial priority for Commander early rush.
- **Sea Chokepoints (East & West)**:
  - Eastern Deep Trench: High-value submarine highway; control with Sonar and Torpedo Launchers.
  - Western Shallow Strait: Hovercraft and Amphibious Raider lane bypassing center DTs.
- **High Ground Artillery Perch**: The towering central cliffs allow T1/T2 artillery (Wolverine / Hammer / Leveler) to rain down directly onto enemy factory lines.`,
  },

  'all-that-glitters': {
    id: 'all-that-glitters',
    name: 'All That Glitters',
    subtext: 'Premier 8v8 Macro Battleground (Glitter)',
    windRange: [6, 22],
    windAvg: 14,
    windLabel: 'VARIABLE',
    tidal: 0,
    metalDensity: 'high',
    terrainTag: '3-LANE MACRO',
    ecoFocus: 'Wind Farm Scaling into Backline Fusion Rush',
    recommendedDoctrines: [
      'Fast Eco',
      'Armored Breakthrough',
      'Air Superiority',
      'Backline Fusion Rush',
    ],
    chokePoints: `### Tactical Topography // All That Glitters
- **Central Mesa & 3-Lane Valleys**:
  - Three distinct battle lanes separated by rugged plateaus.
  - Middle lane contains heavy metal cluster (+18 M/s potential) with rapid flanking openings into north and south lanes.
- **Geothermal Positions**:
  - 2x Base Geos per team (guarantees fast T2 conversion transition).
  - 2x Neutral Valley Geos contested between frontlines.
- **Main Battle Lines**:
  - Heavy vehicle warfare dominant. Light Laser Towers (LLTs) struggle against long-range assault tanks (Stump / Raider / Blitz); build fortified Gauntlet/Pitbull lines.
- **Air Corridor**: Expansive flat skybox offers zero natural anti-air cover—radar coverage on central plateau spots incoming bombing runs with 20s lead time.`,
  },

  'speed-metal': {
    id: 'speed-metal',
    name: 'Speed Metal / All Metal',
    subtext: 'Zero Metal Constraint, Pure Build-Power Arena',
    windRange: [10, 25],
    windAvg: 18,
    windLabel: 'HIGH WIND',
    tidal: 0,
    metalDensity: 'all-metal',
    terrainTag: 'FLAT ARENA',
    ecoFocus: 'Infinite Metal // Pure Energy Scaling & Micro',
    recommendedDoctrines: [
      'Energy Swarm Priority',
      'Continuous T1 Flood',
      'Heavy Laser Crawl',
      'Mass Bomber Strike',
    ],
    chokePoints: `### Tactical Topography // Speed Metal
- **Infinite Metal Floor**: Metal extractors can be placed virtually anywhere for constant max yield. The bottleneck is **Energy** and **Build Power (BP)**.
- **Zero Natural Chokepoints**: Completely level terrain with zero cliff barriers.
- **Defensive Line Architecture**:
  - Construct dense interlocking Dragon's Teeth belts to funnel enemy hordes into concentrated Heavy Laser Tower (HLT) kill zones.
- **Commander Survival Protocol**: Keep Commander behind double-thick defensive perimeters; sniper bots and suicide ticks exploit wide-open line of sight.`,
  },

  'comet-catcher': {
    id: 'comet-catcher',
    name: 'Comet Catcher',
    subtext: 'Low Gravity Lunar Landscape, High-Wind Craters',
    windRange: [0, 30],
    windAvg: 16,
    windLabel: 'VOLATILE HIGH',
    tidal: 0,
    metalDensity: 'high',
    terrainTag: 'CRATER BASINS',
    ecoFocus: 'High-Wind Turbines with Solar Battery Buffer',
    recommendedDoctrines: [
      'Fast Raider Harassment',
      'Mobile Artillery Siege',
      'Wind Farm Grid',
      'T2 Airborne Strike',
    ],
    chokePoints: `### Tactical Topography // Comet Catcher
- **Crater Rim Lips**:
  - High-rim lips offer elevated line of sight and kinetic ballistic range bonuses (+25% range for bots/tanks shooting downward).
  - Bot units scale steep slopes far faster than tracked vehicles.
- **Volatile Wind Dynamics**:
  - Wind fluctuates violently between 0 m/s (dead stall) and 30 m/s (supercharged).
  - **Critical Rule**: Always maintain at least 3-4 Solar Collectors or 1000+ Energy Storage buffer to prevent catastrophic stall during sudden calm intervals.
- **Central Basin**: Rich in high-yield metal extractors but completely exposed to multi-directional artillery fire from surrounding crater walls.`,
  },

  'eight-horses': {
    id: 'eight-horses',
    name: 'Eight Horses',
    subtext: '4-Quadrant Mountain Valleys & Severe Chokes',
    windRange: [8, 16],
    windAvg: 12,
    windLabel: 'STEADY',
    tidal: 0,
    metalDensity: 'medium',
    terrainTag: 'VALLEY CHOKES',
    ecoFocus: 'Controlled Valley Expansion with Fortified Bastions',
    recommendedDoctrines: [
      'Defensive Crawl',
      'Mid-Game T2 Artillery',
      'Flanking Raider Wolves',
      'Long-Range Radar Grid',
    ],
    chokePoints: `### Tactical Topography // Eight Horses
- **Quadrant Mountain Passes**:
  - Four distinct corners separated by towering impassable mountain ridges.
  - Only three narrow passes connect each quadrant, making early defense exceptionally cost-effective.
- **High-Elevation Geothermal Nodes**:
  - Each mountain pass features a geothermal vent overlooking the valley floor. Securing this geo provides both massive early power (+250 E) and high-ground vision.
- **Battle Lines**:
  - Single plasma battery or LLT backed by repair bots can hold against 4x unit value at pass entrances.
  - Air transport drops over mountain peaks frequently bypass choked passes to strike undefended eco backlines.`,
  },

  'tears-of-the-emperor': {
    id: 'tears-of-the-emperor',
    name: 'Tears of the Emperor',
    subtext: 'Central River Delta, Amphibious & Island Strongholds',
    windRange: [5, 15],
    windAvg: 10,
    windLabel: 'MODERATE',
    tidal: 12,
    metalDensity: 'medium',
    terrainTag: 'RIVER DELTA',
    ecoFocus: 'Mixed Tidal / Wind Hybrid & Amphibious Tech',
    recommendedDoctrines: [
      'Amphibious Raider Rush',
      'Torpedo River Ambush',
      'Island Fortress Tech',
      'Gunship Air Patrol',
    ],
    chokePoints: `### Tactical Topography // Tears of the Emperor
- **Central River Crossings**:
  - Broad shallow river splits the theater. Vehicles suffer a 20% speed penalty when fording the water.
  - Amphibious units (Pelican / Duck / Triton) and Hovercraft maintain 100% velocity across water transitions.
- **River Island Redoubts**:
  - Central islands contain crucial metal extractor nodes and high-yield reclaimable wreckage.
- **Submerged Naval Threats**:
  - Even small river channels accommodate light torpedo boats and amphibious submersible bots; build river sonar buoys early.`,
  },

  'red-comet': {
    id: 'red-comet',
    name: 'Red Comet',
    subtext: 'Classic 1v1 / 2v2 Competitive Speed Chess',
    windRange: [8, 18],
    windAvg: 13,
    windLabel: 'MODERATE',
    tidal: 0,
    metalDensity: 'low',
    terrainTag: 'ROLLING HILLS',
    ecoFocus: 'Precise 3-Mex Start into Fast Raider Expansion',
    recommendedDoctrines: [
      'Early Tank Raider Rush',
      'Fast Skirmisher Harassment',
      'Scout & Snipe Expansion',
      'Aggressive Commander Push',
    ],
    chokePoints: `### Tactical Topography // Red Comet
- **Central Plateau & Flank Gullies**:
  - Central hill gives radar dominance over 75% of the theater.
  - Dual flanking gullies offer covered approach for fast raiders (Flash / Paw / Bandit) to bypass frontline armies and strike expanding metal extractors.
- **Scarcity & Reclaim Economy**:
  - Metal is scarce (low density). Capturing and reclaiming the massive central boulder field (+1200 instant metal) usually decides the match outcome.
- **Commander Battle Doctrine**: Commander d-gun must be preserved to punish enemy early factory pushes.`,
  },

  'plains-of-hope': {
    id: 'plains-of-hope',
    name: 'Plains of Hope',
    subtext: 'Massive Flat Expanse, Wind Turbine Goldmine',
    windRange: [12, 28],
    windAvg: 20,
    windLabel: 'HIGH WIND',
    tidal: 0,
    metalDensity: 'high',
    terrainTag: 'OPEN FLANKING',
    ecoFocus: 'Mass Wind Generator Priority // Zero Solar',
    recommendedDoctrines: [
      'Wind Farm Priority',
      'Heavy Armored Push',
      'Wide-Front Raider Screen',
      'T2 Aircraft Overrun',
    ],
    chokePoints: `### Tactical Topography // Plains of Hope
- **Supercharged Wind Field**:
  - Average 20 m/s wind makes Wind Turbines produce over 2.5x the energy-per-metal of Solar Collectors. Zero Solars required.
- **Zero Choke Geography**:
  - Pure open field warfare. Stationary defensive turrets are easily flanked and bypassed.
  - Security requires mobile patrol screens of light combat units (Glaive / Pawn / Flash / Blitz) patrolling perimeter radar circles.
- **High-Yield Metal Rings**: Concentric rings of metal extractors expand outward from each base; expanding early with multiple construction bots is paramount.`,
  },

  'altair-crossing': {
    id: 'altair-crossing',
    name: 'Altair Crossing',
    subtext: 'Dual River Bridges, High-Lethality Chokeholds',
    windRange: [4, 14],
    windAvg: 9,
    windLabel: 'LOW-MOD',
    tidal: 0,
    metalDensity: 'medium',
    terrainTag: 'TWIN BRIDGES',
    ecoFocus: 'Solar Collector Core with Focused Artillery Bastions',
    recommendedDoctrines: [
      'Bridge Lockdown Defenses',
      'Artillery Siege Crawl',
      'Amphibious Deep Flank',
      'Air Transport Insertion',
    ],
    chokePoints: `### Tactical Topography // Altair Crossing
- **Twin Steel Bridges**:
  - Two heavily fortified bridge crossings span a deep canyon river.
  - Any ground unit attempting to force a bridge crossing without smoke cover or artillery suppression will be vaporized.
- **Cliff Emplacements**:
  - Elevated cliff edges directly overlook bridge ramps. Build Heavy Laser Towers and Plasma Artillery here for commanding fire lanes.
- **Deep Water Flank Route**:
  - Canyon river floor allows amphibious assault units or gunships to bypass the bridge bloodbath entirely and hit enemy rear production lines.`,
  },

  'desert-siege': {
    id: 'desert-siege',
    name: 'Desert Siege (DSD)',
    subtext: 'Central Canyon Corridor, High Dune Ridge Overlooks',
    windRange: [10, 20],
    windAvg: 15,
    windLabel: 'STEADY',
    tidal: 0,
    metalDensity: 'medium',
    terrainTag: 'CANYON CORRIDOR',
    ecoFocus: 'Wind Farm Economy with Canyon Bottleneck Traps',
    recommendedDoctrines: [
      'Canyon Choke Defense',
      'High-Dune Artillery Fire',
      'Hover Raider Flank',
      'Fast T2 Heavy Tank Push',
    ],
    chokePoints: `### Tactical Topography // Desert Siege
- **The Great Canyon (Center)**:
  - Deep recessed central corridor where 80% of ground engagements take place.
  - Ramps leading out of the canyon are key kill zones.
- **High Dune Ridges**:
  - Parallel cliff ridges offer unobstructed firing angles down into the canyon floor.
  - Long-range skirmishers and artillery posted on the dunes inflict one-way attrition on canyon units.
- **Perimeter Sand Dunes**:
  - Wide exterior dunes allow high-speed hovercraft and light vehicles to execute deep encirclement maneuvers around the central canyon deadlock.`,
  },
};

export const BAR_MAP_LIST: BarMapData[] = Object.values(BAR_MAPS);

/**
 * Finds a map by its exact ID or fallback to the first map (Supreme Isthmus)
 */
export function findMapById(id: string): BarMapData {
  return BAR_MAPS[id] || BAR_MAP_LIST[0];
}

/**
 * Searches maps by name, subtext, terrain tag, or recommended doctrines
 */
export function searchMaps(query: string): BarMapData[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return BAR_MAP_LIST;

  return BAR_MAP_LIST.filter((map) => {
    return (
      map.name.toLowerCase().includes(clean) ||
      map.subtext.toLowerCase().includes(clean) ||
      map.terrainTag.toLowerCase().includes(clean) ||
      map.ecoFocus.toLowerCase().includes(clean) ||
      map.metalDensity.toLowerCase().includes(clean) ||
      map.recommendedDoctrines.some((doc) => doc.toLowerCase().includes(clean))
    );
  });
}

/**
 * Fuzzy matches a raw map string reported by the BAR game engine or memory bridge
 * (e.g. "Supreme_Isthmus_v2.4", "Glitter_v1", "speedmetal", "Comet_Catcher_Redux")
 */
export function matchMapByName(rawName: string): BarMapData {
  if (!rawName) return BAR_MAP_LIST[0];

  const normalized = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Direct name/id match
  for (const map of BAR_MAP_LIST) {
    const mapNorm = map.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idNorm = map.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes(mapNorm) || mapNorm.includes(normalized)) return map;
    if (normalized.includes(idNorm) || idNorm.includes(normalized)) return map;
  }

  // 2. Keyword heuristic matches
  if (normalized.includes('isthmus') || normalized.includes('supreme')) return BAR_MAPS['supreme-isthmus'];
  if (normalized.includes('glitter') || normalized.includes('glitters')) return BAR_MAPS['all-that-glitters'];
  if (normalized.includes('metal') || normalized.includes('speedmetal')) return BAR_MAPS['speed-metal'];
  if (normalized.includes('comet') && normalized.includes('catcher')) return BAR_MAPS['comet-catcher'];
  if (normalized.includes('comet')) return BAR_MAPS['red-comet'];
  if (normalized.includes('horse') || normalized.includes('eight')) return BAR_MAPS['eight-horses'];
  if (normalized.includes('emperor') || normalized.includes('tears')) return BAR_MAPS['tears-of-the-emperor'];
  if (normalized.includes('hope') || normalized.includes('plains')) return BAR_MAPS['plains-of-hope'];
  if (normalized.includes('altair')) return BAR_MAPS['altair-crossing'];
  if (normalized.includes('desert') || normalized.includes('dsd')) return BAR_MAPS['desert-siege'];

  return BAR_MAP_LIST[0];
}
