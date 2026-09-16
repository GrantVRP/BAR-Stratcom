export interface MapData {
  id: string;
  name: string;
  dimensions: string;
  wind: {
    min: number;
    max: number;
    avg: number;
  };
  tidal: number;
  metalDensity: 'low' | 'medium' | 'high' | 'all-metal';
  chokePoints: string[];
  recommendedDoctrines: {
    faction: 'armada' | 'cortex' | 'both';
    name: string;
    description: string;
  }[];
  tacticalBriefing: string;
}

export const MAP_DATABASE: MapData[] = [
  {
    id: 'supreme-isthmus',
    name: 'Supreme Isthmus',
    dimensions: '16x16',
    wind: { min: 4, max: 18, avg: 11 },
    tidal: 18,
    metalDensity: 'medium',
    chokePoints: [
      'Central Land Bridge (Primary Armor Choke)',
      'Eastern Sea Lane (Submarine / Hover Infiltration)',
      'Western Cliff Plateau (Long-Range Plasma Emplacements)',
      'Twin Geo Vents (Midline Energy Contestation)',
    ],
    recommendedDoctrines: [
      {
        faction: 'both',
        name: 'Sea Choke Hold & Torpedo Grid',
        description: 'Secure coastal tidal generators (+18 E/s) and anchor defensive subs to halt amphibious flanks.',
      },
      {
        faction: 'armada',
        name: 'Hover Raider & Blitz Encirclement',
        description: 'Deploy amphibious hovercraft along eastern shallows to bypass the central fortress bridge.',
      },
      {
        faction: 'cortex',
        name: 'Heavy Artillery Plateau Fortification',
        description: 'Climb western highlands with heavy bot construction and establish high-ground plasma dominance.',
      },
    ],
    tacticalBriefing:
      'The defining competitive 8v8 frontline theater. The map is bisected by a tight center land bridge flanked by deep sea channels. Securing western geothermal vents unlocks immediate T2 transitions, while failure to monitor the eastern sea lane invites stealth amphibious raiding.',
  },
  {
    id: 'glitter',
    name: 'Glitter',
    dimensions: '18x18',
    wind: { min: 8, max: 26, avg: 17 },
    tidal: 0,
    metalDensity: 'high',
    chokePoints: [
      'North-South Open Flanking Flats',
      'Central Crystal Caldera (Dense Metal Deposit)',
      'Lateral Ridge Ramps (Radar High Ground)',
    ],
    recommendedDoctrines: [
      {
        faction: 'armada',
        name: 'Flash / Blitz High-Mobility Raider Swarm',
        description: 'Leverage expansive flat terrain and high wind efficiency to out-maneuver heavy enemy armor.',
      },
      {
        faction: 'cortex',
        name: 'Heavy Tank Frontline Steamroll',
        description: 'Push durable Raider/Stump columns down central highway supported by mobile jammer coverage.',
      },
      {
        faction: 'both',
        name: 'Rapid Wind-Turbine Macro Scaling',
        description: 'High wind velocity (avg 17 m/s) makes wind farms exponentially more cost-effective than solars.',
      },
    ],
    tacticalBriefing:
      'Massive open desert arena dominated by mineral-rich crystal flats and constant high wind. Low natural terrain chokes make static defense easily flanked; victory requires mobile screens, proactive radar coverage, and rapid factory scaling.',
  },
  {
    id: 'comet-catcher-redux',
    name: 'Comet Catcher Redux',
    dimensions: '16x16',
    wind: { min: 0, max: 30, avg: 15 },
    tidal: 0,
    metalDensity: 'high',
    chokePoints: [
      'Rim Crater Ridges (Natural Defense Ramparts)',
      'Sub-Basin Impact Valleys (Restricted Vehicle Movement)',
      'Perimeter Extraction Corridors',
    ],
    recommendedDoctrines: [
      {
        faction: 'both',
        name: 'Crater Defense & Solar Stabilization Grid',
        description: 'Dead calm wind drops down to 0 m/s require hybrid solar arrays to prevent fatal factory stalls.',
      },
      {
        faction: 'armada',
        name: 'Rocko / Hammer High-Arc Crater Skirmish',
        description: 'Exploit crater elevations to bombard enemy extractors from safety without exposing bot frames.',
      },
      {
        faction: 'cortex',
        name: 'Thug & Laser Turret Perimeter Creep',
        description: 'Anchor heavy shielding bots along the outer crater perimeter to seal access to high-yield metal nodes.',
      },
    ],
    tacticalBriefing:
      'Airless lunar topography characterized by steep crater rims and violent wind fluctuations (0 to 30 m/s). Extreme wind volatility poses severe economic stalling hazards; maintaining a solar baseline is critical before expanding turbine farms.',
  },
  {
    id: 'eight-horses',
    name: 'Eight Horses',
    dimensions: '16x16',
    wind: { min: 2, max: 12, avg: 7 },
    tidal: 0,
    metalDensity: 'medium',
    chokePoints: [
      'Eight Radial Canyon Conduits',
      'Central High Plateau Nexus',
      'Narrow Mountain Passes',
    ],
    recommendedDoctrines: [
      {
        faction: 'both',
        name: 'Solar-First Grid & Central Canyon Lockdown',
        description: 'Low average wind (7 m/s) demands solar collectors (+20 E) for reliable power before dropping factories.',
      },
      {
        faction: 'cortex',
        name: 'Narrow Canyon LLT & Storm Wall',
        description: 'Funnel enemy skirmishers into pre-sighted light laser towers and rocket bot salvos.',
      },
      {
        faction: 'armada',
        name: 'Lazarus Resurrection Reclamation Sweep',
        description: 'Cycle resurrection bots through narrow choke killzones to reclaim 100% of fallen enemy metal.',
      },
    ],
    tacticalBriefing:
      'Eight radial mountain canyons converge upon a contested central elevation. Low atmospheric wind forces players into disciplined solar openings. The labyrinthine canyon choke points heavily reward defensive preparation and artillery placement.',
  },
  {
    id: 'all-metal',
    name: 'All Metal / Speed Metal',
    dimensions: '12x12',
    wind: { min: 5, max: 20, avg: 12.5 },
    tidal: 0,
    metalDensity: 'all-metal',
    chokePoints: [
      'Universal Metal Floor (Omnidirectional Engagement)',
      'Corner Spawn Fortresses',
      'Center Zero-Cover Killzone',
    ],
    recommendedDoctrines: [
      {
        faction: 'both',
        name: 'Aggressive Metal Extractor Carpet & Factory Multiplication',
        description: 'Infinite metal extraction permits continuous dual/triple factory queues and non-stop unit fabrication.',
      },
      {
        faction: 'cortex',
        name: 'Brute-Force Heavy Armor Swarm',
        description: 'Flood the arena with high-density combat armor to overwhelm opposing defensive lines.',
      },
      {
        faction: 'armada',
        name: 'Stealth T2 Tactical Missile Barrage',
        description: 'Harness boundless metal income to sprint to advanced tech tiers and deploy long-range cruise strikes.',
      },
    ],
    tacticalBriefing:
      'Ultra-fast macro battlefield with a 100% metal surface. Metal extractors can be constructed anywhere. The economy bottleneck is exclusively energy and build power; immediate energy scaling and non-stop combat queues decide matches in under five minutes.',
  },
];

/**
 * Retrieves a map by its unique ID, falling back to Supreme Isthmus if not found.
 */
export function getMapById(id: string): MapData {
  const found = MAP_DATABASE.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase());
  return found || MAP_DATABASE[0];
}
