export interface StrategyRecommendation {
  faction: 'armada' | 'cortex' | 'both';
  name: string;
  description: string;
}

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
  recommendedDoctrines: StrategyRecommendation[];
  /** Alias for recommended strategies */
  recommendedStrategies?: StrategyRecommendation[];
  tacticalBriefing: string;
  author?: string;
  playerCount?: number;
  terrains?: string[];
  minimapUrl?: string;
}

export const MAP_DATABASE: MapData[] = [
  {
    "id": "supreme-isthmus",
    "name": "Supreme Isthmus",
    "dimensions": "24x24",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 21,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Land Bridge (Primary Armor Choke)",
      "Eastern Sea Lane (Submarine / Hover Infiltration)",
      "Western Cliff Plateau (Long-Range Plasma Emplacements)",
      "Twin Geo Vents (Midline Energy Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Sea Choke Hold & Torpedo Grid",
        "description": "Secure coastal tidal generators (+21 E/s) and anchor defensive subs to halt amphibious flanks."
      },
      {
        "faction": "armada",
        "name": "Hover Raider & Blitz Encirclement",
        "description": "Deploy amphibious hovercraft along eastern shallows to bypass the central fortress bridge."
      },
      {
        "faction": "cortex",
        "name": "Heavy Artillery Plateau Fortification",
        "description": "Climb western highlands with heavy bot construction and establish high-ground plasma dominance."
      }
    ],
    "tacticalBriefing": "The defining competitive 8v8 frontline theater. The map is bisected by a tight center land bridge flanked by deep sea channels. Securing western geothermal vents unlocks immediate T2 transitions, while failure to monitor the eastern sea lane invites stealth amphibious raiding.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "ice",
      "forests",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ACgCe99NC8yZFecMwRCm/photo/UqqPuTiEnwSHueRztAHk-supreme2.1mini.png"
  },
  {
    "id": "all-that-glitters",
    "name": "All That Glitters Extended",
    "dimensions": "30x20",
    "wind": {
      "min": 0,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 0,
    "metalDensity": "high",
    "chokePoints": [
      "Frontline High-Yield Caldera Ridges",
      "Western Flank Sand Highway",
      "Eastern Mountain Terrace (Radar Elevation)",
      "Midfield Metal Pocket Depression"
    ],
    "recommendedDoctrines": [
      {
        "faction": "armada",
        "name": "Blitz Raider & Aggressive Frontline Creep",
        "description": "Use Flash tanks and Blitz raiders to swarm forward mexes and secure high-value wreckage reclaim."
      },
      {
        "faction": "cortex",
        "name": "Heavy Armor Frontline Wall & T2 Transition",
        "description": "Form a solid line with Brutes and Thugs while eco player fast-techs into heavy plasma artillery."
      },
      {
        "faction": "both",
        "name": "High-Efficiency Wind Macro & Factory Stacking",
        "description": "Sustained high wind allows massive factory multiplication and rapid conversion to T2 economy."
      }
    ],
    "tacticalBriefing": "The flagship 8v8 open battleground. Characterized by expansive mineral-rich caldera flats and consistent wind. High metal density accelerates tech scaling; matches are won through tight lane coordination, rapid reclaim of combat wreckage, and coordinated T2 armor pushes.",
    "author": "Nikuksis",
    "playerCount": 48,
    "terrains": [
      "desert",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/KN5s2R7hTum3M9y1r7ry/photo/rBYvVNyfXLiAXorlgbyo-ATG101X%20mini.jpg"
  },
  {
    "id": "glitter",
    "name": "All That Glitters Extended",
    "dimensions": "30x20",
    "wind": {
      "min": 0,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 0,
    "metalDensity": "high",
    "chokePoints": [
      "North-South Open Flanking Flats",
      "Central Crystal Caldera (Dense Metal Deposit)",
      "Lateral Ridge Ramps (Radar High Ground)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "armada",
        "name": "Flash / Blitz High-Mobility Raider Swarm",
        "description": "Leverage expansive flat terrain and high wind efficiency to out-maneuver heavy enemy armor."
      },
      {
        "faction": "cortex",
        "name": "Heavy Tank Frontline Steamroll",
        "description": "Push durable Raider/Stump columns down central highway supported by mobile jammer coverage."
      },
      {
        "faction": "both",
        "name": "Rapid Wind-Turbine Macro Scaling",
        "description": "High wind velocity (avg 17 m/s) makes wind farms exponentially more cost-effective than solars."
      }
    ],
    "tacticalBriefing": "Massive open desert arena dominated by mineral-rich crystal flats and constant high wind. Low natural terrain chokes make static defense easily flanked; victory requires mobile screens, proactive radar coverage, and rapid factory scaling.",
    "author": "Nikuksis",
    "playerCount": 48,
    "terrains": [
      "desert",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/KN5s2R7hTum3M9y1r7ry/photo/rBYvVNyfXLiAXorlgbyo-ATG101X%20mini.jpg"
  },
  {
    "id": "comet-catcher-redux",
    "name": "Comet Catcher Redux",
    "dimensions": "16x16",
    "wind": {
      "min": 4.0,
      "max": 18.0,
      "avg": 11.0
    },
    "tidal": 0,
    "metalDensity": "high",
    "chokePoints": [
      "Rim Crater Ridges (Natural Defense Ramparts)",
      "Sub-Basin Impact Valleys (Restricted Vehicle Movement)",
      "Perimeter Extraction Corridors"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Crater Defense & Solar Stabilization Grid",
        "description": "Dead calm wind drops down to 0 m/s require hybrid solar arrays to prevent fatal factory stalls."
      },
      {
        "faction": "armada",
        "name": "Rocko / Hammer High-Arc Crater Skirmish",
        "description": "Exploit crater elevations to bombard enemy extractors from safety without exposing bot frames."
      },
      {
        "faction": "cortex",
        "name": "Thug & Laser Turret Perimeter Creep",
        "description": "Anchor heavy shielding bots along the outer crater perimeter to seal access to high-yield metal nodes."
      }
    ],
    "tacticalBriefing": "Airless lunar topography characterized by steep crater rims and violent wind fluctuations (0 to 30 m/s). Extreme wind volatility poses severe economic stalling hazards; maintaining a solar baseline is critical before expanding turbine farms.",
    "author": "BAR Community",
    "playerCount": 16,
    "terrains": [],
    "minimapUrl": ""
  },
  {
    "id": "eight-horses",
    "name": "Eight Horses",
    "dimensions": "24x20",
    "wind": {
      "min": 2,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 23,
    "metalDensity": "medium",
    "chokePoints": [
      "Eight Radial Canyon Conduits",
      "Central High Plateau Nexus",
      "Narrow Mountain Passes"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar-First Grid & Central Canyon Lockdown",
        "description": "Low average wind (7 m/s) demands solar collectors (+20 E) for reliable power before dropping factories."
      },
      {
        "faction": "cortex",
        "name": "Narrow Canyon LLT & Storm Wall",
        "description": "Funnel enemy skirmishers into pre-sighted light laser towers and rocket bot salvos."
      },
      {
        "faction": "armada",
        "name": "Lazarus Resurrection Reclamation Sweep",
        "description": "Cycle resurrection bots through narrow choke killzones to reclaim 100% of fallen enemy metal."
      }
    ],
    "tacticalBriefing": "Eight radial mountain canyons converge upon a contested central elevation. Low atmospheric wind forces players into disciplined solar openings. The labyrinthine canyon choke points heavily reward defensive preparation and artillery placement.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "desert",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/7pm2zaEOk8QaxaEeOnZJ/photo/sleyZLPZimdCReuNnIUO-eight_horses_1.2.jpg"
  },
  {
    "id": "all-metal",
    "name": "All Metal",
    "dimensions": "16x16",
    "wind": {
      "min": 4.0,
      "max": 18.0,
      "avg": 11.0
    },
    "tidal": 0,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Universal Metal Floor (Omnidirectional Engagement)",
      "Corner Spawn Fortresses",
      "Center Zero-Cover Killzone"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Aggressive Metal Extractor Carpet & Factory Multiplication",
        "description": "Infinite metal extraction permits continuous dual/triple factory queues and non-stop unit fabrication."
      },
      {
        "faction": "cortex",
        "name": "Brute-Force Heavy Armor Swarm",
        "description": "Flood the arena with high-density combat armor to overwhelm opposing defensive lines."
      },
      {
        "faction": "armada",
        "name": "Stealth T2 Tactical Missile Barrage",
        "description": "Harness boundless metal income to sprint to advanced tech tiers and deploy long-range cruise strikes."
      }
    ],
    "tacticalBriefing": "Ultra-fast macro battlefield with a 100% metal surface. Metal extractors can be constructed anywhere. The economy bottleneck is exclusively energy and build power; immediate energy scaling and non-stop combat queues decide matches in under five minutes.",
    "author": "BAR Community",
    "playerCount": 16,
    "terrains": [],
    "minimapUrl": ""
  },
  {
    "id": "eye-of-horus",
    "name": "Eye Of Horus",
    "dimensions": "12x14",
    "wind": {
      "min": 1,
      "max": 25,
      "avg": 18.6
    },
    "tidal": 18,
    "metalDensity": "high",
    "chokePoints": [
      "Central Eye Plateau (High-Yield Metal Core)",
      "Outer Radial Dune Corridors (Maneuver & Raiding)",
      "Perimeter Ridge Bluffs (Artillery & Radar Elevation)",
      "Basin Access Ramps (Key Bottlenecks)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Eye Core Fortification & Wind Turbine Scaling",
        "description": "Establish early dominance over the central metal nexus while scaling wind turbines (+11 avg m/s)."
      },
      {
        "faction": "armada",
        "name": "Fast Hover / Rover Dune Encirclement",
        "description": "Deploy agile mobile screens across outer sands to cut off reinforcements marching toward the center."
      },
      {
        "faction": "cortex",
        "name": "Heavy Plasma Ramp Lockdown",
        "description": "Anchor heavy bot constructions on ridge ramps to deny enemy ascent to the eye with overlapping fire."
      }
    ],
    "tacticalBriefing": "A contested desert theater centered on the famous elevated 'Eye' plateau. The central elevation holds a dense cluster of high-yield metal extractors and affords immense radar range. Controlling the ramps leading to the Eye determines the pace of the entire match.",
    "author": "IceXuick",
    "playerCount": 6,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/fvLhZp85DLroyv0Iozhe/photo/xadVx3D5ZkhwgzghtQEw-Eye_Of_Horus_1.7.jpg"
  },
  {
    "id": "boreal-falls",
    "name": "Boreal Falls",
    "dimensions": "14x14",
    "wind": {
      "min": 2,
      "max": 16,
      "avg": 12
    },
    "tidal": 13,
    "metalDensity": "medium",
    "chokePoints": [
      "Lower River Shallows & Waterfall Choke",
      "Twin High Ridge Bluffs (Line-of-Sight Dominance)",
      "Upper Plateau Expansion Shelf",
      "Central Valley Fording Pass"
    ],
    "recommendedDoctrines": [
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Skirmish",
        "description": "Seize the northern bluffs early with light bots to sight enemy crossings for artillery barrages."
      },
      {
        "faction": "cortex",
        "name": "Amphibious River Lockdown & Heavy Bot Creep",
        "description": "Anchor armored bots along the shallow river basin and reinforce with light laser defense."
      },
      {
        "faction": "both",
        "name": "Hybrid Wind-Solar Expansion",
        "description": "Moderate wind speeds require a solar anchor before expanding wind turbines across the elevated shelves."
      }
    ],
    "tacticalBriefing": "A picturesque subarctic valley bisected by cascading waterfalls and river shallows. Verticality is paramount: dominating the overlooking bluffs offers devastating fire superiority over units navigating the basin below.",
    "author": "pk76, Anka",
    "playerCount": 6,
    "terrains": [
      "ice",
      "forests",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/0jMFtrg8MuFKGgxmk6Nm/photo/CCrlJrjgVLcbz0b4Zh8Y-borealfallsmini.png"
  },
  {
    "id": "delta-siege-dry",
    "name": "Delta Siege Dry",
    "dimensions": "20x12",
    "wind": {
      "min": 1,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Riverbed Crossing & Armor Funnel",
      "Upper Plateau High-Ground Ramps",
      "Lateral Dune Raider Corridors",
      "Perimeter Choke Emplacements"
    ],
    "recommendedDoctrines": [
      {
        "faction": "cortex",
        "name": "Plateau Plasma Emplacement Creep",
        "description": "Advance heavy construction bots up central ramps and establish fortified artillery positions overlooking the flats."
      },
      {
        "faction": "armada",
        "name": "High-Mobility Raider Dune Flanking",
        "description": "Send high-speed Blitz squadrons along outer perimeter depressions to decapitate enemy energy grids."
      },
      {
        "faction": "both",
        "name": "Choke Fortification & Jammer Screen",
        "description": "Deploy radar jammers and heavy fortifications to prevent enemy long-range scouting of rear tech hubs."
      }
    ],
    "tacticalBriefing": "A time-tested competitive theater featuring a dried river delta enclosed by towering plateaus. The central low-ground is a deadly crossfire zone; players must secure the elevated ramps to dictate front-line combat.",
    "author": "IceXuick, Nikuksis",
    "playerCount": 16,
    "terrains": [
      "desert",
      "chokepoints",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ABBUHinh94O7299Php6p/photo/g3E7FssKIHMZ8jRxVOtT-DSDR57.jpg"
  },
  {
    "id": "seths-ravine",
    "name": "Seths Ravine",
    "dimensions": "16x12",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Ravine Crossing",
      "Overlooking Cliff Artillery Bluffs",
      "Lateral Mountain Flank Paths",
      "Base Plateau Approach Ramps"
    ],
    "recommendedDoctrines": [
      {
        "faction": "cortex",
        "name": "Cliffside Heavy Artillery Battery",
        "description": "Position plasma artillery along the ravine lip to shell enemy forces attempting to force the valley floor."
      },
      {
        "faction": "armada",
        "name": "High-Mobility Bot Ambush & Cliff Scaling",
        "description": "Use agile bots to rapidly navigate treacherous mountain inclines and bypass static forward defenses."
      },
      {
        "faction": "both",
        "name": "Ravine Choke Denial & Forward Radar Grid",
        "description": "Anchor perimeter defenses at the canyon choke to prevent enemy armor incursions while securing rear tech hubs."
      }
    ],
    "tacticalBriefing": "A severe geological trench splits the battlefield. The sheer cliffs offer immense range bonuses for artillery and radar, making direct traversal through the central ravine suicidal without smoke or overwhelming firepower.",
    "author": "IceXuick",
    "playerCount": 6,
    "terrains": [
      "desert",
      "wasteland",
      "ruins",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/0jMFtrg8MuFKGgxmk6No/photo/yWvndwIRIkO3jUwo8NUs-Seths_Ravine_Remake_1.3.jpg"
  },
  {
    "id": "thermal-shock",
    "name": "Thermal Shock",
    "dimensions": "20x20",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 0,
    "metalDensity": "high",
    "chokePoints": [
      "Midfield Geothermal Rift Basin",
      "Basalt Ridge Ramps",
      "Magma Canal Shallows",
      "Corner Caldera Expansion Hubs"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Aggressive Geothermal Expansion",
        "description": "Rush forward constructors to secure high-yield geo vents for an accelerated transition to T2 power."
      },
      {
        "faction": "cortex",
        "name": "Armored Bot Basalt Line Hold",
        "description": "Deploy heavy shielded bots along volcanic choke passes to protect high-value thermal generators."
      },
      {
        "faction": "armada",
        "name": "Agile Raider Geothermal Raid",
        "description": "Use fast wheeled vehicles to slip through lateral thermal vents and destroy isolated enemy power plants."
      }
    ],
    "tacticalBriefing": "Volcanic battlefield packed with abundant geothermal vents and magma fissures. Early energy parity is decided by whoever claims the midline geo nodes, making fast-moving skirmishers essential from the opening second.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "lava",
      "wasteland",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/0jMFtrg8MuFKGgxmk6Nn/photo/RxP6l8iDzf64UjquGzLd-thermal_shock_v1.1.jpg"
  },
  {
    "id": "folsom-dam",
    "name": "Folsom Dam",
    "dimensions": "20x14",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Dam Crest Highway Crossing",
      "Reservoir Water Approach & Shallows",
      "Lower Spillway Valley Funnel",
      "High Ridge Observation Bluffs"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Dam Crest Fortification & Tidal Harvesting",
        "description": "Fortify the narrow dam bridge while utilizing the reservoir for supplementary tidal and naval production."
      },
      {
        "faction": "armada",
        "name": "Hovercraft Reservoir Flank",
        "description": "Circumvent the heavily guarded dam crest by launching amphibious hovercraft across the open lake."
      },
      {
        "faction": "cortex",
        "name": "Spillway Heavy Defense & Artillery Anchor",
        "description": "Establish layered laser and rocket batteries overlooking the spillway floor to incinerate enemy armor columns."
      }
    ],
    "tacticalBriefing": "Centered on a colossal concrete hydro dam separating an expansive reservoir from a sunken spillway basin. The dam crest provides a direct high-speed armor conduit, while the vast reservoir invites amphibious and naval maneuvers.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "grassy",
      "ruins",
      "water",
      "shallows",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/20rGnfO4wwkmV5v2fXVZ/photo/n0Ihytq7bbOKgczeaL66-folsom-minimap-photo%20(1).jpg"
  },
  {
    "id": "red-river",
    "name": "Red River",
    "dimensions": "20x28",
    "wind": {
      "min": 5,
      "max": 10,
      "avg": 8
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central River Fording Shallows",
      "Riverbank Ridge Ramparts",
      "Island Mid-Stream Metal Deposits",
      "Lateral Delta Infiltration Channels"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "River Basin Line Hold & Tidal Support",
        "description": "Establish interlocking defensive arcs along the river embankments while deploying tidal turbines in the current."
      },
      {
        "faction": "armada",
        "name": "Amphibious Raider Rush & Island Grab",
        "description": "Rush amphibious tanks to secure rich mid-river sediment nodes before opposing defenses entrench."
      },
      {
        "faction": "cortex",
        "name": "Riverbank Plasma Barrage",
        "description": "Set up long-range plasma batteries behind the river bluffs to pulverize amphibious forces crossing open water."
      }
    ],
    "tacticalBriefing": "A wide, silt-laden river bisects opposing bases. River crossings slow conventional armor, leaving units vulnerable to crossfire. Dominating the central shallows with amphibious units or high-ground artillery secures the match.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "wasteland",
      "water",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/2foOuFOeWdmm1DkMqfJv/photo/3E5I1jnQTFaKNmMVZE3a-red_river_remake_v1.2.jpg"
  },
  {
    "id": "acidic-quarry",
    "name": "Acidic Quarry",
    "dimensions": "12x12",
    "wind": {
      "min": 2,
      "max": 24,
      "avg": 17.9
    },
    "tidal": 0,
    "metalDensity": "high",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 17.9 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "4 elevated islands amongst a sea of smaller islands. Version 5.17 with fixed metal. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features acidic, hills. Favorable atmospheric wind conditions (avg 17.9 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "BasiC",
    "playerCount": 4,
    "terrains": [
      "acidic",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/zzzzzzzzzzzzzzzzzzzx/photo/AEzy0dju5vzdMZPMnqjH-AcidicQuarry_5.16.jpg"
  },
  {
    "id": "adamantium-factory",
    "name": "Adamantium Factory",
    "dimensions": "24x24",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "64 manufacturing stations strewn on a factory floor. Resources are higher in the center stations. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features metal, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 64,
    "terrains": [
      "metal",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/MRCGsZ8eB04FPYmwheUi/photo/fMkJVniJHPR3oOzcqb63-Adamantium_Factory_V1.jpg"
  },
  {
    "id": "aethermoor-creek",
    "name": "Aethermoor Creek",
    "dimensions": "18x18",
    "wind": {
      "min": 0,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 16,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+16 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large map for teamplay up to 3v3 with one big chokepoint in the center. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, chokepoints. Abundant tidal currents (+16 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Takeo Kurita",
    "playerCount": 6,
    "terrains": [
      "forests",
      "chokepoints"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/CPq3JgpOYYEC7iMdCkgJ/photo/H5jadokuHXuNmnSJR53t-Minimap.jpg"
  },
  {
    "id": "all-that-glitters-extended",
    "name": "All That Glitters Extended",
    "dimensions": "30x20",
    "wind": {
      "min": 0,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 0,
    "metalDensity": "high",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Extended All That Glitters for event. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features desert, chokepoints, flat. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 48,
    "terrains": [
      "desert",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/KN5s2R7hTum3M9y1r7ry/photo/rBYvVNyfXLiAXorlgbyo-ATG101X%20mini.jpg"
  },
  {
    "id": "all-that-simmers",
    "name": "All That Simmers",
    "dimensions": "14x20",
    "wind": {
      "min": 0,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Warning! Enemy scouts will peek through the steam clouds. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, tropical, swamp, jungle, shallows, chokepoints, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "tropical",
      "swamp",
      "jungle",
      "shallows",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/raa5whdozdwuBRAWJkVu/photo/DXWdHM12JjNQ6oEM1lSI-simmers%201%201%20mini%20.jpg"
  },
  {
    "id": "all-that-smolders",
    "name": "All That Smolders",
    "dimensions": "12x20",
    "wind": {
      "min": 0,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Mesa with both flat and canyon areas. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, chokepoints, flat. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "desert",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/oX7eHI8mlpVvJUYs4v4Y/photo/gMNa1jqIjY0qBwbgnz5y-smolders%2012%20mini.jpg"
  },
  {
    "id": "altair-crossing",
    "name": "Altair Crossing",
    "dimensions": "8x8",
    "wind": {
      "min": 12,
      "max": 27,
      "avg": 20.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Optimal for 2 teams, up to 3 players each. Small map that lends itself for t1 fights. Reclaim the metal rocks quickly and fight over the scarce expansion options. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features grassy, chokepoints, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 6,
    "terrains": [
      "grassy",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/An6zReiqIWD15Yx7bZ3b/photo/heuM6R3jGDJawc5i0pwn-Altair_Crossing_V4.jpg"
  },
  {
    "id": "altored-divide",
    "name": "Altored Divide",
    "dimensions": "16x16",
    "wind": {
      "min": 4,
      "max": 19,
      "avg": 14.3
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.3 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large map that is optimal for 2 teams, up to 5 players each. Fight over and reclaim the metal rocks in center quickly. Build your base in relative safety behind high hills and secure the metal spots in the middle. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, chokepoints, flat, hills. Favorable atmospheric wind conditions (avg 14.3 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 10,
    "terrains": [
      "grassy",
      "chokepoints",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/9pCv5iZ1gaLWioi1A8KJ/photo/e6KcfYWnj72WunjwrEkD-altored_divide_bar_remake_1.6.jpg"
  },
  {
    "id": "ancient-bastion",
    "name": "Ancient Bastion",
    "dimensions": "32x16",
    "wind": {
      "min": 6,
      "max": 22,
      "avg": 16.7
    },
    "tidal": 18,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+18 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "An Ancient fortress, built to withstand an enemy long forgotten. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, grassy, ruins, asymmetrical, flat, hills. Abundant tidal currents (+18 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Russ838, Nikuksis",
    "playerCount": 12,
    "terrains": [
      "forests",
      "grassy",
      "ruins",
      "asymmetrical",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/xMrZBOap76goS3ri3pBk/photo/Pq2iz4IMLgtSRisXUgju-bastion.jpg"
  },
  {
    "id": "ancient-vault",
    "name": "Ancient Vault",
    "dimensions": "20x30",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "The forsaken vault still keeps its treasures. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features wasteland, ruins, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "wasteland",
      "ruins",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/WJBtRZ22UUHZi2GTQ2FQ/photo/6UpWvsm7pPO97cxeNgFQ-ancient_vault_v1.4.jpg"
  },
  {
    "id": "angel-crossing",
    "name": "Angel Crossing",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 23,
      "avg": 17.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Battle over land, sea and mountains at this crossing between continents. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, water, shallows, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Angelwing",
    "playerCount": 10,
    "terrains": [
      "forests",
      "grassy",
      "water",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/j3X9bepS3FrtzjLLNmmu/photo/iwyoPZitwfUUPhihaUsH-Angel_Crossing_1.5.jpg"
  },
  {
    "id": "archsimkats-valley",
    "name": "Archsimkats Valley",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across wasteland, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 12,
    "terrains": [
      "wasteland",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/2NeyVyHXbe13LF9P85pz/photo/g06Yq51TCS0wV6AdUP4Y-archsimkats_valley_v1.jpg"
  },
  {
    "id": "argent-strata",
    "name": "Argent Strata",
    "dimensions": "16x16",
    "wind": {
      "min": 3,
      "max": 23,
      "avg": 17.2
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 17.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A frozen island with icey plateaus and multiple pathways to the center. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, alien, island, chokepoints, flat. Favorable atmospheric wind conditions (avg 17.2 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, Beherith",
    "playerCount": 2,
    "terrains": [
      "ice",
      "alien",
      "island",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/6w2JE0kEjbty1F8ZgBo0/photo/0rm6ewNnPc1tFZfRY9s7-argentstratamini2.png"
  },
  {
    "id": "ascendancy",
    "name": "Ascendancy",
    "dimensions": "24x24",
    "wind": {
      "min": 0,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Acquire your supremacy on the ice mountain foothills. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features ice, water, hills. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "ice",
      "water",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/i0Wzo68Las9sWQk8O8CT/photo/rBSxTq4mU6MIboIdoP95-ascendancy_v2.2.jpg"
  },
  {
    "id": "asteroid-mines",
    "name": "Asteroid Mines",
    "dimensions": "12x12",
    "wind": {
      "min": 25,
      "max": 25,
      "avg": 25
    },
    "tidal": 1,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 25 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Full metal map: 4 zones connected. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features space, metal, chokepoints, flat. Favorable atmospheric wind conditions (avg 25 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 4,
    "terrains": [
      "space",
      "metal",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/NULeDCjbZw5azkUT66rZ/photo/MaIjEsuchC9mvMLlMQSa-Asteroid_Mines_V2.1.jpg"
  },
  {
    "id": "aurelia",
    "name": "Aurelia",
    "dimensions": "14x14",
    "wind": {
      "min": 3,
      "max": 16,
      "avg": 12
    },
    "tidal": 14,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+14 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight over the golden coast on land and water. Best suited for 1v1, 2v2. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features water, flat, hills. Abundant tidal currents (+14 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 4,
    "terrains": [
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ZvEmwr9QVP760qJOdBxh/photo/mOZSBIGa1CShzYATOSXD-Screenshot%20at%202024-05-23%2002-32-30.png"
  },
  {
    "id": "avalanche",
    "name": "Avalanche",
    "dimensions": "8x8",
    "wind": {
      "min": 3,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small map,optimal for 1v1. Keep the pressure on your opponent and fight for every metal spot while building your army to finish them off. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features ice, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 2,
    "terrains": [
      "ice",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XnCjzq4LvLB6mik5aib1/photo/zsZJEIhOImwEdhXIieKn-avalanche_3.4.jpg"
  },
  {
    "id": "azurite-shores",
    "name": "Azurite Shores",
    "dimensions": "18x16",
    "wind": {
      "min": 1,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 20,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Four islands across a blue bay divide sandy beaches and brilliant crystal plateaus. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, alien, water, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, 123v",
    "playerCount": 16,
    "terrains": [
      "ice",
      "alien",
      "water",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ddpsrgkYM0ujNqHiQKKm/photo/aPyfxrngmM8q3rncSrFD-screen_2023-12-12_02-38-23-242SAPP.png"
  },
  {
    "id": "barr",
    "name": "BarR",
    "dimensions": "8x8",
    "wind": {
      "min": 3,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small map, optimal for 1v1 or 2v2. The low resources and  interesting mountains and passes reward the more nimble Bots. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features wasteland, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 4,
    "terrains": [
      "wasteland",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/JWJVrROvEUieLeIfuS9a/photo/txnEKdN1myT3RgGXltOI-BarR_1.1.jpg"
  },
  {
    "id": "baryon-tar-lake",
    "name": "Baryon Tar Lake",
    "dimensions": "20x12",
    "wind": {
      "min": 0,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "The sticky tar lake is slowing down the units speed. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/7lBJDhvj1t0JYUNiCZED/photo/bJsDBYbvyKWMuYfGPGZ7-baryon11.jpg"
  },
  {
    "id": "bismuth-valley",
    "name": "Bismuth Valley",
    "dimensions": "24x16",
    "wind": {
      "min": 0,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 20,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Side hills are bots-only passable. Single mexes are richer. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/gEgiWXCvonENJseDsfjj/photo/B0iIFotS42HfTxFOLCzH-BV2_texture.jpg"
  },
  {
    "id": "black-star",
    "name": "Black Star",
    "dimensions": "16x16",
    "wind": {
      "min": 6,
      "max": 26,
      "avg": 19.4
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Medium sized Free For All map. Battle four other players till one remains. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, water, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 5,
    "terrains": [
      "grassy",
      "water",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/wQa6jdSr4HBUH6p21eI8/photo/NOENh00mFXrR6clgIy78-blackstar_v2.jpg"
  },
  {
    "id": "blindside",
    "name": "Blindside",
    "dimensions": "32x16",
    "wind": {
      "min": 7,
      "max": 17,
      "avg": 13.3
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 13.3 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "FFA map up to 16 players. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features ice, island, chokepoints, asymmetrical, hills. Favorable atmospheric wind conditions (avg 13.3 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis, Beherith",
    "playerCount": 16,
    "terrains": [
      "ice",
      "island",
      "chokepoints",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/mkBFR3xXMP9u8dhD8kFW/photo/EjHALmqpRaTvQ3zsNhI7-BSR_MINI.png"
  },
  {
    "id": "boulder-beach",
    "name": "Boulder Beach",
    "dimensions": "16x16",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Best for 5v5 Team games, where every factory type has a useful role. All units can cross the shallows and move along the center, while ships can bombard most coastal areas, and hovercraft can easily dominate the map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features tropical, sea, shallows, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 10,
    "terrains": [
      "tropical",
      "sea",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/UhGP9ish5WdFio1VfrU6/photo/WGvUXAwB1KRGcFUnOEUR-boulder_beach_v1.jpg"
  },
  {
    "id": "callisto",
    "name": "Callisto",
    "dimensions": "14x14",
    "wind": {
      "min": 2,
      "max": 13,
      "avg": 9.7
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (2 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small map, optimal for 1v1 or 2v2. The hills on the sides and the passable lake in middle present opportunities to bots while the flat terrain gives way to vehicles. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, water, flat. Severe wind troughs dropping to 2 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 4,
    "terrains": [
      "desert",
      "water",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Lpy4w1DTM7BjEfERE3wK/photo/KmG6Ksdr3HtuCZbX4Kda-Callisto_v3.jpg"
  },
  {
    "id": "canis-river",
    "name": "Canis River",
    "dimensions": "14x14",
    "wind": {
      "min": 4,
      "max": 14,
      "avg": 10.6
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Plateaus ridges are bots passable. Two shallow water crossings in the map corners unless +15m water level. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, chokepoints, flat, hills. Moderate wind dynamics (avg 10.6 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 8,
    "terrains": [
      "desert",
      "chokepoints",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/9jHSyg8smAwuk6d3HZgm/photo/D6aSxk25DPbFmhPo9uiD-canis_river_minimap.jpg"
  },
  {
    "id": "cape-violet",
    "name": "Cape Violet",
    "dimensions": "20x10",
    "wind": {
      "min": 8,
      "max": 20,
      "avg": 15.6
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Designed for 4v4 and PvE games vs. Chickens or Scavengers. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, water, shallows, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "alien",
      "water",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/veW9CUoQ0oV7OofQab4y/photo/GS3gIvbxMSN1PLLnMP4B-Cape_Violet_V1.jpg"
  },
  {
    "id": "carrot-mountains",
    "name": "Carrot Mountains",
    "dimensions": "24x24",
    "wind": {
      "min": 6,
      "max": 12,
      "avg": 9.7
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "The Red Planet mountain region. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features desert, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/oHTuEk42qfvZt8tddOnA/photo/zxj6bcGHfHCRNbkEH6D5-CARROT2.png"
  },
  {
    "id": "cells",
    "name": "Cells",
    "dimensions": "20x20",
    "wind": {
      "min": 3,
      "max": 12,
      "avg": 9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "You might want to build some radar cell towers. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/xzehc1xO45wtSJqrFRlD/photo/FjDy1oUdLuvPec6PrzNa-topdown.png"
  },
  {
    "id": "center-command",
    "name": "Center Command",
    "dimensions": "16x8",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 75,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+75 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Strong tides, build tidals in the little ponds!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, jungle, water, chokepoints, hills. Abundant tidal currents (+75 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 8,
    "terrains": [
      "grassy",
      "jungle",
      "water",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/NhuWJFWJBBS46Z1qsmBJ/photo/omFiv9dfTwZGVgQbjTII-center_command_bar_v1.0.jpg"
  },
  {
    "id": "centerrock",
    "name": "Centerrock",
    "dimensions": "16x16",
    "wind": {
      "min": 1,
      "max": 23,
      "avg": 17.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large map, optimal for 2 teams, up to 6 players each. Fight for the strategically important center hills or push through on the sides. Water around the center focuses fights while also providing amphibious options. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, water, chokepoints, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 10,
    "terrains": [
      "desert",
      "water",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XLh1oCb0Qdog1h40avFL/photo/RcEJbg53gqrr55G9ccp6-centerrock_remake_1.2.jpg"
  },
  {
    "id": "charlie-in-the-hills",
    "name": "Charlie In The Hills",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "4v4. Slug it out in the middle, but watch out for planes!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 8,
    "terrains": [
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/MIHFHzbaF3j4OMqvreh9/photo/sqFOoHqmGa1Ub2ZN1XVZ-q0ck3OVpPcmdNpc2z7qa-charlie_in_the_hills_remake_v1.1.jpg"
  },
  {
    "id": "cirolata",
    "name": "Cirolata",
    "dimensions": "16x16",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A subtropical island suitable for 4-way FFA. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, island, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 12,
    "terrains": [
      "grassy",
      "island",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/GT4UKIBCLBwdONdOMChl/photo/MQqPwx31SAoWlD7w63dq-Cirolata_1.02.jpg"
  },
  {
    "id": "claymore",
    "name": "Claymore",
    "dimensions": "24x24",
    "wind": {
      "min": 6,
      "max": 19,
      "avg": 14.5
    },
    "tidal": 10,
    "metalDensity": "low",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.5 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A volcanic island of black sand and sparse vegetation. 5-10-15 player FFA. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features lava, grassy, island, hills. Favorable atmospheric wind conditions (avg 14.5 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, Beherith",
    "playerCount": 15,
    "terrains": [
      "lava",
      "grassy",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/UpcuKVvMurtZNynDnqiW/photo/yHbfUhbzVcGkl0eH5fSv-claymoremini.png"
  },
  {
    "id": "cloud9",
    "name": "Cloud9",
    "dimensions": "18x18",
    "wind": {
      "min": 25,
      "max": 25,
      "avg": 25
    },
    "tidal": 1,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 25 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Battle in orbit among asteroids conected by girders. Metal can be extracted from the structures anywhere, and the strong solar winds bolster energy production. Naval units cannot be built, and only aircraft can pass over the void. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features space, metal, chokepoints, flat. Favorable atmospheric wind conditions (avg 25 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 9,
    "terrains": [
      "space",
      "metal",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/c8VOLOtft95bMvYUg60R/photo/5oYKAyg7B30SfNbSo61I-Cloud9_V2.jpg"
  },
  {
    "id": "coast-to-coast",
    "name": "Coast To Coast",
    "dimensions": "12x8",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 16,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+16 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small sea map for 2-4 players. Weak tidals. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features tropical, sea. Abundant tidal currents (+16 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 4,
    "terrains": [
      "tropical",
      "sea"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ER2B5mT2LU864k1f0UeH/photo/Jny8IWIsgemKzwK1HWGb-coast_to_coast_bar_v1.0.jpg"
  },
  {
    "id": "coastlines-dry",
    "name": "Coastlines Dry",
    "dimensions": "20x14",
    "wind": {
      "min": 3,
      "max": 14,
      "avg": 10.5
    },
    "tidal": 21,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+21 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large map with start positions supporting up to 9 players per team. Variations of more and less open terrain with small hills. Securing hills helps to control parts of the map. Both kbots and vehicles are valid options to win. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, flat, hills. Abundant tidal currents (+21 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 18,
    "terrains": [
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/oBOBWCmenCo2tbkwYNJt/photo/jPxWxCx0pdby27KfJ2X8-Coastlines_minimap.jpg"
  },
  {
    "id": "colorado",
    "name": "Colorado",
    "dimensions": "18x12",
    "wind": {
      "min": 3,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Optimal for large teamgames with up to 7 players per team. High hills and deep canyons provide several strategic points to capture. Be sure to reclaim the many metal rocks early on. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, grassy, shallows, chokepoints, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 14,
    "terrains": [
      "desert",
      "grassy",
      "shallows",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/E17BdeDITeBMZ8YwcBie/photo/UoIK0rrY5wc4E1q1OKQp-Colorado_V2_1.1.jpg"
  },
  {
    "id": "comet-catcher",
    "name": "Comet Catcher",
    "dimensions": "16x12",
    "wind": {
      "min": 1,
      "max": 4,
      "avg": 3
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (1 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "Large, mostly flat, map that can be played both east-west as north-south. Interesting for anything from 1v1 to 8v8. Vehicles do have the upper hand. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features asteroid, flat. Severe wind troughs dropping to 1 m/s demand disciplined solar backup to prevent economic stalls. Securing North-South Open Maneuver Corridor provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 8,
    "terrains": [
      "asteroid",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ggVDNTLRh7HNk4mf9mf6/photo/0u9WQsfVCdtocdhGZD00-Comet_Catcher_Remake_1.8.jpg"
  },
  {
    "id": "copper-hill",
    "name": "Copper Hill",
    "dimensions": "10x10",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Smallish map dominated by a hill in the middle. For 1v1, small teamgames also doable. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features hills. Favorable atmospheric wind conditions (avg 14.2 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 4,
    "terrains": [
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/xn2aVcKlkpTQAakCC3Z8/photo/x7WGKkpAanMbKVbNLBkQ-copper_hill_v1.jpg"
  },
  {
    "id": "crater-islands",
    "name": "Crater Islands",
    "dimensions": "12x10",
    "wind": {
      "min": 0,
      "max": 14,
      "avg": 10.4
    },
    "tidal": 17,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+17 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Remake of Cavedog map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, water, asymmetrical, hills. Abundant tidal currents (+17 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 4,
    "terrains": [
      "forests",
      "grassy",
      "water",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/9enrMlkiT7SwhG3D35LB/photo/UudMg7yKSUnpboIl3sFI-Crater_Islands_Remake_v1.0.jpg"
  },
  {
    "id": "crescent-bay",
    "name": "Crescent Bay",
    "dimensions": "24x24",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large map optimal for 4 way Team Free For All but just as suitable for large FFAs or teamgames with 16 players (or more). Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features tropical, water, island, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "tropical",
      "water",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/1kGT39gW0lJEkp6VxeZU/photo/w4zplBbAHkPxm60DQOYY-Crescent_Bay_V2.jpg"
  },
  {
    "id": "crimson-bay",
    "name": "Crimson Bay",
    "dimensions": "24x24",
    "wind": {
      "min": 5,
      "max": 14,
      "avg": 10.8
    },
    "tidal": 21,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+21 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large assymetric map with roads and ruins. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features grassy, ruins, water, asymmetrical, hills. Abundant tidal currents (+21 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "grassy",
      "ruins",
      "water",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/rC0RO0MGRS9ckbGJdGG1/photo/i2GSUAymJxZXshSntPDp-crimson1.1.jpg"
  },
  {
    "id": "crubick-plains",
    "name": "Crubick Plains",
    "dimensions": "16x16",
    "wind": {
      "min": 0,
      "max": 21,
      "avg": 15.7
    },
    "tidal": 24,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+24 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Baobab trees on grassy plateaus rise above the sands of a happy isle. 1v1 or 2v2. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features island, hills. Abundant tidal currents (+24 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "DavetheBrave",
    "playerCount": 6,
    "terrains": [
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/QaENCgzeDrnkRnRsgnVT/photo/Up1evxLvSvM6C40lVqTY-crubick_preview.jpg"
  },
  {
    "id": "crystallized-plains",
    "name": "Crystallized Plains",
    "dimensions": "12x14",
    "wind": {
      "min": 2,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 20,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Flat 1vs1 map with many small pillars. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, wasteland, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 4,
    "terrains": [
      "alien",
      "wasteland",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/g7NeIaS3XxFSn2KcrCiL/photo/n2pJT5svY3Z0PnYbv6Cg-crystalmini.png"
  },
  {
    "id": "darkside",
    "name": "Darkside",
    "dimensions": "24x24",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight over the terminator. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features asteroid, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "asteroid",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/GuTvi5G3QCGO8KASbbs1/photo/U9PkCHCekBsKZrhNTHNp-darkside_v3.0.jpg"
  },
  {
    "id": "death-valley",
    "name": "Death Valley",
    "dimensions": "12x14",
    "wind": {
      "min": 4,
      "max": 14,
      "avg": 10.6
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small map, optimal for 1v1 - 3v3. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, water, flat, hills. Moderate wind dynamics (avg 10.6 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 6,
    "terrains": [
      "desert",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Gydc5ydDuhV4hS7cyJJm/photo/MF0nEzcLsXEEZ9QpIrA9-death%20valley.jpg"
  },
  {
    "id": "deeploria-fields",
    "name": "Deeploria Fields",
    "dimensions": "20x20",
    "wind": {
      "min": 1,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large flat map with small hills. Ideally for flooding with waterlevel 200. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features sea. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "sea"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/bLBXDWyEuUqG825WYzHj/photo/bOuoBPW05Ya1jm2cTrnJ-deeploria_fields_v1.5.jpg"
  },
  {
    "id": "desolation",
    "name": "Desolation",
    "dimensions": "10x12",
    "wind": {
      "min": 4,
      "max": 14,
      "avg": 10.6
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small map, optimal for 3 way Free For All. Players start on hills that are traversable by kbots. Reclaim the metal rocks and fight for the metal spots in the middle. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat, hills. Moderate wind dynamics (avg 10.6 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 6,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/LutAHarULFOEKKA21AvQ/photo/jjRW4AyXRw6f17KpYBGz-Desolation_v1.jpg"
  },
  {
    "id": "devils-postpiles",
    "name": "Devil's Postpiles",
    "dimensions": "12x12",
    "wind": {
      "min": 6,
      "max": 14,
      "avg": 11
    },
    "tidal": 12,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+12 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A competitive one versus one map. Towering basalt-like structures carry crucial resources at the top, while the murky shallows prevent most construction. Army positioning and movement will be paramount. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, swamp, chokepoints, hills. Abundant tidal currents (+12 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "AidanNaut",
    "playerCount": 8,
    "terrains": [
      "grassy",
      "swamp",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/K2GZu2RxxpwQBJmCqd90/photo/9spUFKDJwx6FggcC9gpl-preview.PNG"
  },
  {
    "id": "digsite",
    "name": "Digsite",
    "dimensions": "16x16",
    "wind": {
      "min": 1,
      "max": 25,
      "avg": 18.6
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fields of flowers and purple forests surround an abandoned excavation site. 5v5 NE vs SW. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, forests, grassy, asymmetrical, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, IceXuick",
    "playerCount": 10,
    "terrains": [
      "alien",
      "forests",
      "grassy",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/jFAPuh7Ymqyq0YD4n5e1/photo/btXqmXxxnVub3MPPsP4D-digsitemini.png"
  },
  {
    "id": "ditched",
    "name": "Ditched",
    "dimensions": "16x8",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "One of the smallest, large playercount maps with a 20% speed boost to all units in the central trench. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Ydjj7Fy4NpaLHdkvhsIn/photo/c8wxgQ68uTk9aFTMR4gh-Ditched_V1.jpg"
  },
  {
    "id": "downs-of-destruction",
    "name": "Downs of Destruction",
    "dimensions": "16x16",
    "wind": {
      "min": 9,
      "max": 19,
      "avg": 15.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "4-10 players, ships and subs can pass shallows. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, sea, shallows, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 10,
    "terrains": [
      "grassy",
      "sea",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/z7TZ4CbeIBJtjEjNAwer/photo/b1yPvZjikM6OLTYsfWbs-Downs_of_Destruction_V2.jpg"
  },
  {
    "id": "dsd-8-way",
    "name": "DSD 8 Way",
    "dimensions": "20x20",
    "wind": {
      "min": 5,
      "max": 16,
      "avg": 12.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large Free For All map. Lots of metal. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, grassy, island, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 8,
    "terrains": [
      "desert",
      "grassy",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/UywijIj1uPuFeoV231kL/photo/wR01lxorxZn0nT5VZZTD-dsd_8_way_1.1.jpg"
  },
  {
    "id": "dworld",
    "name": "DWorld",
    "dimensions": "28x28",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 13,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+13 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large Free For All map that supports up to 16 players. Lots of metal and geothermal spot. Be aware that kbots can traverse most hills so attacks can come from any direction. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features island, asymmetrical, flat, hills. Abundant tidal currents (+13 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "island",
      "asymmetrical",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ZeOLwTAgEU10BGvcdQ45/photo/ca69Hzqvj103N6u4IjHV-dworld_v4.jpg"
  },
  {
    "id": "eclipsed",
    "name": "Eclipsed",
    "dimensions": "14x14",
    "wind": {
      "min": 0,
      "max": 10,
      "avg": 7.5
    },
    "tidal": 18,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+18 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A macro style map. 1v1 recommended. 2v2s to 5v5s are playable. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, desert, grassy, hills. Abundant tidal currents (+18 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "AidanNaut",
    "playerCount": 10,
    "terrains": [
      "alien",
      "desert",
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/9laQQGzxGwnsLE3CgFQ5/photo/8IKv91OWQc0wAT7Nxnsv-EclipsedOverheadPhoto.PNG"
  },
  {
    "id": "emain-macha",
    "name": "Emain Macha",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, shallows, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "IceXuick",
    "playerCount": 10,
    "terrains": [
      "grassy",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/U8PJYIPdYQoMXGJND2Kg/photo/D9wTn9oFZOXb8Xz4fqea-EmainMacha_Remake_2.1.jpg"
  },
  {
    "id": "entrenched-plains",
    "name": "Entrenched Plains",
    "dimensions": "24x12",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers situated across grassy, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 20,
    "terrains": [
      "grassy",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/frJOFVdgDIROpNVzgDed/photo/BOIqRlkT58MQkJp0km86-Entrenched_Plains_V2.jpg"
  },
  {
    "id": "erebos-lakes",
    "name": "Erebos Lakes",
    "dimensions": "20x20",
    "wind": {
      "min": 2,
      "max": 16,
      "avg": 12
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Tips for water level settings : -20 for no shallow waters, -200 for no water, +30 max for navy only. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features sea, shallows, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "sea",
      "shallows",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/2NlrSE2CMUyFpxlComtj/photo/8FEQycvtDunBdXWLrthU-Erebos_minimap.jpg"
  },
  {
    "id": "esker-creek",
    "name": "Esker Creek",
    "dimensions": "24x16",
    "wind": {
      "min": 3,
      "max": 14,
      "avg": 10.5
    },
    "tidal": 23,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+23 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "8v8 lane map. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, grassy, hills. Abundant tidal currents (+23 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/bunTXErE1ZLWV9t8jFHw/photo/KJ84XQbADQfdVSuwpeNq-minimap.png"
  },
  {
    "id": "eternal-consequences",
    "name": "Eternal Consequences",
    "dimensions": "16x16",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Up to 4v4 map. The beginnings of the ridges are bot passable. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 8,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Eternal%20Consequences%20v1/photo/xjg67VGjQEygkPx1gVlx-EC_Minimap.jpg"
  },
  {
    "id": "evad-river-confluence",
    "name": "Evad River Confluence",
    "dimensions": "10x10",
    "wind": {
      "min": 3,
      "max": 13,
      "avg": 9.8
    },
    "tidal": 16,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+16 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Intermittent winds. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features water, flat. Abundant tidal currents (+16 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "NOiZE",
    "playerCount": 3,
    "terrains": [
      "water",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/vTVisQEv3JM2pa0TvUHy/photo/L3jmPAmRhXoMk2bBzE4Y-Evad_River_Confluence_V2.jpg"
  },
  {
    "id": "factions-and-factious",
    "name": "Factions and Factious",
    "dimensions": "20x20",
    "wind": {
      "min": 0,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Up to 10 players FFA map. Good luck, Commander!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, asymmetrical, flat. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 10,
    "terrains": [
      "alien",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/t85qIzP8X1hqJ5gWEPGM/photo/em9o00PK57b0DGw6ogFS-factions_minimap.jpg"
  },
  {
    "id": "failed-negotiations",
    "name": "Failed Negotiations",
    "dimensions": "24x24",
    "wind": {
      "min": 2,
      "max": 17,
      "avg": 12.7
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Original map by AidanNaut. Ticks cannot cross water. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features island, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/DUxqUMUDGiYr1y5jx3sq/photo/nsNdaTlOvKWk5zsVvOEA-fn_minimap.jpg"
  },
  {
    "id": "fallendell",
    "name": "Fallendell",
    "dimensions": "12x10",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Medium small map for 4 players. Interesting terrain and multiple viable strategies are possible. Enjoy. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features swamp, shallows, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 4,
    "terrains": [
      "swamp",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/etCTTwexgYVGMV63rOWy/photo/ImLSdU3DQgDs5RFubq77-Fallendell_V4.jpg"
  },
  {
    "id": "faster-than-light",
    "name": "Faster Than Light",
    "dimensions": "12x12",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (0 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "A deep space battle arena; used as a secret final testing ground for upcoming commanders. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features space, chokepoints, flat. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "ShaunJS",
    "playerCount": 4,
    "terrains": [
      "space",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/mzdkzzTL3zgPanW6zQx4/photo/ipAhkXQGdeX0kYWcEHoj-faster_than_light_1.1.jpg"
  },
  {
    "id": "feast-of-hades",
    "name": "Feast of Hades",
    "dimensions": "16x16",
    "wind": {
      "min": 4,
      "max": 14,
      "avg": 10.6
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "3v3-6v6 map, up to 8v8 with left vs right starting boxes. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 12,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/wADO80q9xacu6SAV1cZU/photo/PyrV7ld5ctHxrv6lfcGi-Feast_of_Hades_minimap.jpg"
  },
  {
    "id": "flats-and-forests",
    "name": "Flats and Forests",
    "dimensions": "24x24",
    "wind": {
      "min": 4,
      "max": 12,
      "avg": 9.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large flat map for team games up to 8 v 8. Expands are the way to victory. Fight for the territory and its metal. Bots are better in the hills/forests while vehicles perform better on the plains. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, grassy, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 20,
    "terrains": [
      "forests",
      "grassy",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/kesPeWO0ScnmWF2An8qA/photo/gMLbch0XYbcC3ytggvgD-Flats_and_Forests_v2.1.jpg"
  },
  {
    "id": "flooded-valley",
    "name": "Flooded Valley",
    "dimensions": "10x10",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 14,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+14 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fast-paced compact arena featuring instant engagement corridors and early raider dominance situated across grassy, sea, hills. Abundant tidal currents (+14 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "BasiC",
    "playerCount": 2,
    "terrains": [
      "grassy",
      "sea",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/aUhyiiVDKaRECJfqPBAo/photo/gBaBpjiZOrEdPRlChXDL-Flooded_Valley_V5.jpg"
  },
  {
    "id": "forge",
    "name": "Forge",
    "dimensions": "18x18",
    "wind": {
      "min": 6,
      "max": 12,
      "avg": 9.7
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "This is a crucible to forge your victory. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features lava, flat, hills. Moderate wind dynamics (avg 9.7 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "lava",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/PiT4WHNB94kc8vlAZtot/photo/ayplONs21TjVSac6UgZX-forge_v2.3.jpg"
  },
  {
    "id": "frozen-ford",
    "name": "Frozen Ford",
    "dimensions": "12x12",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Narrow, metal-rich crevasse between two large ice flues. Easily defendable starting positions, and center ford is vulnerable to artillery. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 4,
    "terrains": [
      "ice",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/I7GpETWic750BOdwvkdh/photo/I8Ql4gunXlKI8HklE8yP-Frozen_Ford_V2.jpg"
  },
  {
    "id": "full-metal-plate",
    "name": "Full Metal Plate",
    "dimensions": "24x24",
    "wind": {
      "min": 25,
      "max": 25,
      "avg": 25
    },
    "tidal": 1,
    "metalDensity": "all-metal",
    "chokePoints": [
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 25 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "A simple full metal plate. Relive your childhood battles on this TA-inspired map. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features metal, flat. Favorable atmospheric wind conditions (avg 25 m/s) strongly reward early wind turbine farms. Securing North-South Open Maneuver Corridor provides decisive tactical leverage across the theater.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "metal",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/bjT21UjhlZ3s2nrZ850V/photo/ZEHKvCAEy9CupGfm91Qc-fullmetalscreen.png"
  },
  {
    "id": "gasbag-grabens",
    "name": "Gasbag Grabens",
    "dimensions": "18x12",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "The terraforming mission in Sector 026G has failed. Destroy all opposition before the acid claims you.\n\n1v1 recommended. 2v2s and 3v3s playable. Texture resources provided by Nikuksis. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features acidic, island, chokepoints. Moderate wind dynamics (avg 12.1 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "AidanNaut",
    "playerCount": 6,
    "terrains": [
      "acidic",
      "island",
      "chokepoints"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/621pQeCRmxhbgvz3lDzS/photo/lI99kjLLSlXlCowRcebk-GasbagGrabensThumb4.png"
  },
  {
    "id": "gecko-isle",
    "name": "Gecko Isle",
    "dimensions": "16x18",
    "wind": {
      "min": 2,
      "max": 16,
      "avg": 12
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "2-6 player island map. Great tidals. Beware of hovers. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features flat, hills. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis (original by qray)",
    "playerCount": 12,
    "terrains": [
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/iq0vEBrVv1ZudgcWr2ST/photo/KFioSWYgeuSQCiF8k7N6-Gecko_Isle_Remake_v1.2.jpg"
  },
  {
    "id": "geyser-plains",
    "name": "Geyser Plains",
    "dimensions": "8x8",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "1v1 assymetric tournament map remake. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features alien, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 4,
    "terrains": [
      "alien",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/BCDbKYnQqHT1PE5lo8Es/photo/RMU1rNTpWzFivKmsWwcc-geyser_plains_bar_v1.2.jpg"
  },
  {
    "id": "ghenna-rising",
    "name": "Ghenna Rising",
    "dimensions": "16x16",
    "wind": {
      "min": 13,
      "max": 17,
      "avg": 15.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 15.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Fight on a dangerous molten lava island, where the lava will rise and drop. The lava will temporarily save you from ground assaults, but beware, it will drop again. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features lava, hills. Favorable atmospheric wind conditions (avg 15.2 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "lava",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/byucseTLrpgU0J70dFC0/photo/FnQtxUYk7b2dU4VNw087-ghenna_rising_4.0.jpg"
  },
  {
    "id": "glacial-gap",
    "name": "Glacial Gap",
    "dimensions": "28x16",
    "wind": {
      "min": 0,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 23,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+23 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Strong winds blow through the frozen valley. Dual gap BAR Remake. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features ice, water, chokepoints, flat. Abundant tidal currents (+23 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "ice",
      "water",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/aDu1H6XNI6Jh5OZUcagp/photo/Mw2Vb5zj8lXIz3XQO9Ri-glacial_gap11.jpg"
  },
  {
    "id": "glacier-pass",
    "name": "Glacier Pass",
    "dimensions": "10x10",
    "wind": {
      "min": 4,
      "max": 18,
      "avg": 13.5
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight on small, barren and cold glacier pass.\n\nBots have a slight advantage and can traverse cliffs on multiple points.\n\nIdeal for 1v1 or 2v2 games. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features ice, chokepoints, asymmetrical, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 4,
    "terrains": [
      "ice",
      "chokepoints",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/4FOX0gezL8gapbMPNmKH/photo/iXB6JADCVzq9rwVDmGAM-glacier_pass_1.2.jpg"
  },
  {
    "id": "gods-of-war",
    "name": "Gods of War",
    "dimensions": "12x12",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Small asymmetric island map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features sea, asymmetrical. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 5,
    "terrains": [
      "sea",
      "asymmetrical"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/RDAUlsjOhgAH2fDvAEmI/photo/GoMUsvsau8A4aHWF4s97-gods_of_war_remake_v1.3.jpg"
  },
  {
    "id": "great-divide",
    "name": "Great Divide",
    "dimensions": "6x8",
    "wind": {
      "min": 0,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 16,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+16 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight through a mountain pass. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features grassy, chokepoints, asymmetrical, flat. Abundant tidal currents (+16 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "NOiZE",
    "playerCount": 4,
    "terrains": [
      "grassy",
      "chokepoints",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/iQZFWB7rheiOseoQXihq/photo/7ykBk15Flx1FXaV0djj3-great-divide-minimap.png"
  },
  {
    "id": "greenest-fields",
    "name": "Greenest Fields",
    "dimensions": "16x16",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight on a calm and peaceful looking rural area, with nothing more than some old dirt-roads, trees and some rocks.\n\nBut with no metal spots.\nSo you're entire economy is based on Energy Converters.\n\nGood luck Commander!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/vryCgnmiXKEfnJuBLobP/photo/QSkH6k0AtA19U6Odo6Aq-Greenest_Fields_1.3.jpg"
  },
  {
    "id": "greenhaven",
    "name": "Greenhaven",
    "dimensions": "14x14",
    "wind": {
      "min": 5,
      "max": 10,
      "avg": 8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Up to 3v3 map with many green hills. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 6,
    "terrains": [
      "forests",
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XR0Czafa4dwZRh0r3fTy/photo/1w1z8IAHJ9VQDXKDxOr8-greenhaven_v1.1.jpg"
  },
  {
    "id": "hades-ponds",
    "name": "Hades Ponds",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 14,
      "avg": 10.5
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "4v4 to 8v8 map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, water, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "alien",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/4WiZnMfXPyjUARuQumRM/photo/BpwVNhTcDKyexq8276Le-hades_ponds_v1_minimap.jpg"
  },
  {
    "id": "heartbreak-hill",
    "name": "Heartbreak Hill",
    "dimensions": "14x12",
    "wind": {
      "min": 3,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight over the numerous ridges leading to the central hill. A good fit for 1v1-3v3 games, inspired by the Starcraft map Heartbreak Ridge. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, hills. Moderate wind dynamics (avg 11.2 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 6,
    "terrains": [
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/44vuVzD9DD5wyzZz0L7i/photo/aM9vt5DiowJMZqxOJJBf-Heartbreak%20Hill.jpg"
  },
  {
    "id": "hellas-basin",
    "name": "Hellas Basin",
    "dimensions": "24x24",
    "wind": {
      "min": 5,
      "max": 15,
      "avg": 11.5
    },
    "tidal": 21,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+21 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Two seas, one bridge. Prove your skills and win on this red planet battlefield. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, sea, island, chokepoints, hills. Abundant tidal currents (+21 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "alien",
      "sea",
      "island",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/5qY4GxEPrIG1wfxBkbQ0/photo/DQe09QWG9gAULuT6Kjwh-hellas1.4.png"
  },
  {
    "id": "hera-planum",
    "name": "Hera Planum",
    "dimensions": "20x16",
    "wind": {
      "min": 0,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Ancient eroded craters leave narrow paths on a vast plateau. Some geothermal activity remains in this barren environment. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/jyQlMYahZbQYgC1ZGRmd/photo/6epaxLgiqHrPgEcRGD8g-hera_planum_minimap.jpg"
  },
  {
    "id": "hide-and-seek",
    "name": "Hide and Seek",
    "dimensions": "14x14",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 15.1 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Map for 1v1 - 3v3. Start locations are relatively close for a 14x14 map. Watch your back, start points are surrounded by hills. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, jungle, chokepoints, hills. Favorable atmospheric wind conditions (avg 15.1 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, FlorisXIV",
    "playerCount": 6,
    "terrains": [
      "forests",
      "grassy",
      "jungle",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/RTxWSdffMT8Mb8ixqKdL/photo/QaFzrHYPu8z00as8TseH-hideseekmini3.png"
  },
  {
    "id": "high-noon",
    "name": "High Noon",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 12,
      "avg": 9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, sea, shallows, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Phalange",
    "playerCount": 8,
    "terrains": [
      "desert",
      "sea",
      "shallows",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/kovRjd67kdlVUNN4szAP/photo/zT5llnnzUXnQjoTjoPEk-High_Noon_Remake_1.0.jpg"
  },
  {
    "id": "hooked",
    "name": "Hooked",
    "dimensions": "6x4",
    "wind": {
      "min": 0,
      "max": 8,
      "avg": 6
    },
    "tidal": 80,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+80 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fast-paced compact arena featuring instant engagement corridors and early raider dominance situated across desert, flat. Abundant tidal currents (+80 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Raghna",
    "playerCount": 2,
    "terrains": [
      "desert",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/rQ8v6BePPrXIaQaaQjam/photo/MmfXe44hf11iDl8b7R9k-Hooked_1.1.jpg"
  },
  {
    "id": "hotlips",
    "name": "Hotlips",
    "dimensions": "22x18",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Nikuksis (original by BA_Baracus)",
    "playerCount": 16,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/uZq5zZ1FTcdZ7FS4k3lc/photo/u14Vq80l0O65Ey3q19oH-Hotlips3.2%20mini.jpg"
  },
  {
    "id": "hotstepper-5",
    "name": "Hotstepper 5",
    "dimensions": "8x8",
    "wind": {
      "min": 13,
      "max": 17,
      "avg": 15.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 15.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Fast-paced compact arena featuring instant engagement corridors and early raider dominance situated across lava, flat, hills. Favorable atmospheric wind conditions (avg 15.2 m/s) strongly reward early wind turbine farms. Success hinges on controlling Central Canyon Corridor (Primary Armor Bottleneck) while defending flank access points against raider incursions.",
    "author": "IceXuick",
    "playerCount": 5,
    "terrains": [
      "lava",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/RT3Y6Qyjvt3pTGXWjWPK/photo/84dvIGI3vOp6IcaK8XIO-hotstepper_5_1.2.jpg"
  },
  {
    "id": "houses-of-tripolis",
    "name": "Houses of Tripolis",
    "dimensions": "24x24",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 1,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (0 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "Did you build your house out of straw or metal?. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features asteroid, space, metal. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Midfield Tactical Nexus (Contested Metal Core) provides decisive tactical leverage across the theater.",
    "author": "RebelNode, TradeMark",
    "playerCount": 16,
    "terrains": [
      "asteroid",
      "space",
      "metal"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/EnstsecbggtzPl6Im1aU/photo/Tqm7HNzV9E5Qv1f6x83U-top.png"
  },
  {
    "id": "hyperion-shale",
    "name": "Hyperion Shale",
    "dimensions": "22x22",
    "wind": {
      "min": 1,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Lava surrounds an island bearing a massive fossil that divides 5 ways. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features lava, ice, alien, chokepoints, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 16,
    "terrains": [
      "lava",
      "ice",
      "alien",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XyspXgig1fp54pmAcYIo/photo/Cv4mXTcrgacjR88fWOGH-hypermini.png"
  },
  {
    "id": "ice-scream",
    "name": "Ice Scream",
    "dimensions": "30x10",
    "wind": {
      "min": 5,
      "max": 10,
      "avg": 8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Screaming won\"t be all you do on this forgotten world. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features ice, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "ice",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/PlmJPs87RuAnAlL6inG1/photo/cl6aOGXREvjdJnoV4ojI-ice_scream_v2.5.jpg"
  },
  {
    "id": "incandescence",
    "name": "Incandescence",
    "dimensions": "16x16",
    "wind": {
      "min": 13,
      "max": 17,
      "avg": 15.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 15.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "A very dynamic team map with many ways to victory!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features lava, flat, hills. Favorable atmospheric wind conditions (avg 15.2 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 10,
    "terrains": [
      "lava",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Yhwa2neMfDTUXyAiSJXC/photo/cVt2sPXh7Yl4SgLhpn1C-incandescence_remake_3.3.jpg"
  },
  {
    "id": "industrial-revolution",
    "name": "Industrial Revolution",
    "dimensions": "20x14",
    "wind": {
      "min": 6,
      "max": 13,
      "avg": 10.3
    },
    "tidal": 17,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+17 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across industrial, water, flat, hills. Abundant tidal currents (+17 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 12,
    "terrains": [
      "industrial",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/fivY9RQRkefErWygMT09/photo/f703Hp4ng5o7sfd6hRId-Industrial_Revolution_V2.jpg"
  },
  {
    "id": "into-battle-redux",
    "name": "Into Battle Redux",
    "dimensions": "12x12",
    "wind": {
      "min": 5,
      "max": 14,
      "avg": 10.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Johannes",
    "playerCount": 4,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/4onApLu0oFbtFuY9up67/photo/Y4VoGlxQhGKtczeLAVHQ-Into_Battle_Redux_v3.jpg"
  },
  {
    "id": "iron-isle",
    "name": "Iron Isle",
    "dimensions": "24x12",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers situated across metal, island, chokepoints, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "metal",
      "island",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/5MwuaG7iaqfPXeKCKhUD/photo/2Fx2veofN4rKzi7HS4tD-Iron_Isle_V1.jpg"
  },
  {
    "id": "isidis-crack",
    "name": "Isidis crack",
    "dimensions": "14x14",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.9 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Up to 4v4 map. Lower plateaus ridges are bots passable. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat, hills. Favorable atmospheric wind conditions (avg 14.9 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 8,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/CXD1uv9uv28szDdk3dFR/photo/aCb9bywB8OmaCBgEn3KE-Isidis%20crack%201.0.jpg"
  },
  {
    "id": "jade-empress",
    "name": "Jade Empress",
    "dimensions": "32x32",
    "wind": {
      "min": 0,
      "max": 12,
      "avg": 9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Huge island battlefield to fight on the mountains, beaches, grassland, and sea. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, island, shallows, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Ambulatory Cortex",
    "playerCount": 16,
    "terrains": [
      "forests",
      "island",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/cQbwmwbhWrWyD1bhZNEn/photo/2g349coyx3qFS06eDGEf-Jade%20Empress%201.41.png"
  },
  {
    "id": "kings-assault",
    "name": "Kings Assault",
    "dimensions": "20x16",
    "wind": {
      "min": 4,
      "max": 12,
      "avg": 9.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Let experience dictate power, the king and his most loyal will shoulder your burdens. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features lava, alien, wasteland, hills. Moderate wind dynamics (avg 9.2 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "HotshotGG, Nikuksis",
    "playerCount": 16,
    "terrains": [
      "lava",
      "alien",
      "wasteland",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/FEkKsVrHELjFh7HQstFq/photo/c6e9hqx63zcmheJqUgxj-kingassault1.3.jpg"
  },
  {
    "id": "knockout",
    "name": "Knockout",
    "dimensions": "18x18",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 18.8 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, ruins, hills. Favorable atmospheric wind conditions (avg 18.8 m/s) strongly reward early wind turbine farms. Success hinges on controlling Central Canyon Corridor (Primary Armor Bottleneck) while defending flank access points against raider incursions.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "grassy",
      "ruins",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/3XVaIgjKnh120KPs7fv0/photo/O4fORVz0DqzhSga3OH1p-KnockoutR_1.5.jpg"
  },
  {
    "id": "kolmogorov",
    "name": "Kolmogorov",
    "dimensions": "20x20",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Massive Canyon for big battles.\n\nBeware that bots can traverse all center hills, while vehicles can only move through the canyons.\n\nOnly the shoreline cliffs are too steep for bots.\n\nAlso the canyons have superb grip and offer a 20% speed bonus.\n\nThe water is however treacherous with strong currents, making movement their harder and 20% slower.\n\nThanks to Bacon for the canyon detail textures and Beherith for the original map!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, water, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "desert",
      "water",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/UeeBymo7RdXE5ty3amFw/photo/3hqflPxPOFrZSv9HzdBd-Kolmogorov_Remake_3.0.jpg"
  },
  {
    "id": "koom-valley",
    "name": "Koom Valley",
    "dimensions": "24x16",
    "wind": {
      "min": 5,
      "max": 10,
      "avg": 8
    },
    "tidal": 21,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+21 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Remake from the original from Beherith.\n\nAwesomely big map, with lots of room to fight. Metal in the center is more rich, so expansion is key. Wind is flakey, so beware.\n\nEnjoy!. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features desert, grassy, flat, hills. Abundant tidal currents (+21 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "desert",
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/cQ5LLQmNqCPCnYFiTlcb/photo/WB7BxJQfCrOhyNUMKAEu-KoomValley_Bar%201.5_minimap.jpg"
  },
  {
    "id": "krakatoa",
    "name": "Krakatoa",
    "dimensions": "28x28",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "16-way FFA map. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, grassy, island, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/WuwJQPBtwMfJR9czmWuQ/photo/kA5BgLKSES8X4ArAhxFj-krakatoa_v2.0.jpg"
  },
  {
    "id": "lake-carne",
    "name": "Lake Carne",
    "dimensions": "12x10",
    "wind": {
      "min": 3,
      "max": 14,
      "avg": 10.5
    },
    "tidal": 13,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+13 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Survival map. Perfect against Chickens or Scavengers. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, water, flat, hills. Abundant tidal currents (+13 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 4,
    "terrains": [
      "desert",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/yhOJI5yH4yGFmx9PMt9T/photo/b5ED97PkmZEFfzpdjH0N-Lake_Carne_v2.jpg"
  },
  {
    "id": "lavender-bender",
    "name": "Lavender Bender",
    "dimensions": "14x14",
    "wind": {
      "min": 1,
      "max": 30,
      "avg": 20.7
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "1v1-4v4 map inspired by the classic map Blue Bend. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, desert, flat. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 8,
    "terrains": [
      "alien",
      "desert",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/KAQ69kPLvMZgMuLXIoyU/photo/whPysupyZ1FViJL3yHRr-Screenshot%20at%202023-08-13%2023-03-50.png"
  },
  {
    "id": "lv412",
    "name": "LV412",
    "dimensions": "16x16",
    "wind": {
      "min": 8,
      "max": 20,
      "avg": 15.6
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Survival map. Perfect against Chickens or Scavengers. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, wasteland, chokepoints, asymmetrical, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 4,
    "terrains": [
      "alien",
      "wasteland",
      "chokepoints",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Zy8Ha3O3lHl7mUMvM8Gs/photo/mLBbiUdlIdZRFAQ25ku0-LV412_1.3.jpg"
  },
  {
    "id": "mariposa-island",
    "name": "Mariposa Island",
    "dimensions": "18x18",
    "wind": {
      "min": 6,
      "max": 12,
      "avg": 9.7
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "18x18 suitable for 8v8 hybrid map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, island, shallows, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "island",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/WOlmGcTZXUtV5iy57Kc9/photo/cgP4uDSbKeEYFBt0TD06-Mariposa_Island_v2.4.jpg"
  },
  {
    "id": "mediterraneum",
    "name": "Mediterraneum",
    "dimensions": "32x32",
    "wind": {
      "min": 1,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Enourmous free-for-all map with roads connecting the major resource points. All units can pass the shallow land bridges. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features ice, desert, forests, grassy, water, asymmetrical, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 32,
    "terrains": [
      "ice",
      "desert",
      "forests",
      "grassy",
      "water",
      "asymmetrical",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ZJNeHQG2ls2h2Xq1hHUy/photo/4ApsuHeiEa4NO9691x0v-Mediterraneum_V1.jpg"
  },
  {
    "id": "melting-glacier",
    "name": "Melting Glacier",
    "dimensions": "20x20",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fight across the melting ice. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, island, asymmetrical, hills. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "ice",
      "island",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/DyHExxTkkRB4DweNDViM/photo/wBvtLEP7XXJpM37Dui5L-melting_glacier_v1.1.jpg"
  },
  {
    "id": "mescaline",
    "name": "Mescaline",
    "dimensions": "20x12",
    "wind": {
      "min": 1,
      "max": 17,
      "avg": 12.7
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Mescaline v2, for up to 8-16 players. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, wasteland, flat, hills. Severe wind troughs dropping to 1 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "desert",
      "wasteland",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ZxFS2VuODjyLH5V8mHfR/photo/kw8042B8sM19rwgVnEbK-Mescaline_V2_Minimap-large.jpg"
  },
  {
    "id": "mithril-mountain",
    "name": "Mithril Mountain",
    "dimensions": "12x12",
    "wind": {
      "min": 2,
      "max": 17,
      "avg": 12.7
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, flat, hills. Severe wind troughs dropping to 2 m/s demand disciplined solar backup to prevent economic stalls. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Johannes",
    "playerCount": 4,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/2sZ9PltxKHn43NG3OA2y/photo/1zE82SBmugwxdCdzDeHT-Mithril_Mountain_V2.jpg"
  },
  {
    "id": "moonq20xr2",
    "name": "MoonQ20XR2",
    "dimensions": "20x10",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 30,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+30 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Wide Moon with many craters, which hold more dense metal spots. Use the craters to your advantage. Good Luck!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features asteroid, asymmetrical, hills. Abundant tidal currents (+30 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 8,
    "terrains": [
      "asteroid",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/s7nrY1vJEItDuPwHAKEO/photo/bcCNl8hxKsvgCnhkDOmC-MoonQ20%203.jpg"
  },
  {
    "id": "moonshine-run",
    "name": "Moonshine Run",
    "dimensions": "24x16",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (0 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Shine boldly so that all might find you when the night falls. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features asteroid, hills. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "asteroid",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/pFTrUA4OGRNoSNpSAzx2/photo/yFfV69YNNrapTLICCRDR-moonshine1.0.1.png"
  },
  {
    "id": "neurope",
    "name": "Neurope",
    "dimensions": "32x16",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers situated across forests, grassy, water, asymmetrical, flat. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "water",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/2Jm1E7F819zbEWOr2Bwc/photo/Q0c0xJDxHPO8jm1t9Yrj-Neurope_Remake_4.2.jpg"
  },
  {
    "id": "nine-metal-islands",
    "name": "Nine Metal Islands",
    "dimensions": "32x32",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A large sea with small industrial islands. The islands are very metal rich. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features metal, island, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 18,
    "terrains": [
      "metal",
      "island",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/x3jIjnV9aipWzVVWjZlL/photo/oUpHXmuczl0CapP8x7xg-Nine_Metal_Islands_V1.jpg"
  },
  {
    "id": "nuclear-winter",
    "name": "Nuclear Winter",
    "dimensions": "20x10",
    "wind": {
      "min": 4,
      "max": 18,
      "avg": 13.5
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Remake of the original Nuclear Winter V3 - though a tiny bit smaller.\n\nUnique feature is the ice in the middle, which speeds up vehicles and hovercraft, but is slippery/slow for bots.\n\nThe snow is pretty soft, so cratering and terrain deformation will happen.\n\nGood luck!!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 16,
    "terrains": [
      "ice",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/zvTEXnewG2G8LaMjFq4o/photo/Dcy428KUfev8nIT60nBj-nuclear_winter_bar_1.1_minimap.jpg"
  },
  {
    "id": "odderon-strandflats",
    "name": "Odderon Strandflats",
    "dimensions": "20x30",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "16 players free for all. Flagships and subs can pass shallows, remake of mearth map made by [teh]Beherith, concept by JRRT. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, water, asymmetrical, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "alien",
      "water",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ASieUn5uvk5eyZz6KhUt/photo/66TD2osrC3HOFF27xtbQ-odderon1.1.jpg"
  },
  {
    "id": "omega-valley",
    "name": "Omega Valley",
    "dimensions": "16x16",
    "wind": {
      "min": 3,
      "max": 12,
      "avg": 9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "PeaceFighter, Nikuksis",
    "playerCount": 4,
    "terrains": [
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/zfA6sKjimXZO5kz0jtz1/photo/6k0eXx0BpP5TgYIqyJPJ-Omega.jpg"
  },
  {
    "id": "onyx-cauldron",
    "name": "Onyx Cauldron",
    "dimensions": "16x16",
    "wind": {
      "min": 1,
      "max": 29,
      "avg": 20.4
    },
    "tidal": 20,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "An arena of dark crystal plateaus rise above a winding river. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, wasteland, shallows, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, Beherith, Johannes",
    "playerCount": 2,
    "terrains": [
      "grassy",
      "wasteland",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/MDi3gNqaTj3H1DkzpPfz/photo/U9IKe30WYnKQaM7J07j4-onyxmini.png"
  },
  {
    "id": "oort-cloud",
    "name": "Oort Cloud",
    "dimensions": "24x24",
    "wind": {
      "min": 25,
      "max": 25,
      "avg": 25
    },
    "tidal": 1,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 25 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Metal map with strong solar wind, with impassable empty space between the metal structures. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features space, metal, chokepoints, flat. Favorable atmospheric wind conditions (avg 25 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "space",
      "metal",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/lJQnSRqDN7rNPS5pe80C/photo/Tna3awRgScCouq7rL174-Oort_Cloud_V2.jpg"
  },
  {
    "id": "otago",
    "name": "Otago",
    "dimensions": "18x12",
    "wind": {
      "min": 2,
      "max": 30,
      "avg": 20.7
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Valleys of dense forest and dry grassland. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 6,
    "terrains": [
      "forests",
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/4egdlg54rpZQh1bvbS8p/photo/s8x0aJbzRlLlzJb2VnWj-otagoscreen1.png"
  },
  {
    "id": "painted-desert",
    "name": "Painted Desert",
    "dimensions": "18x18",
    "wind": {
      "min": 0,
      "max": 12,
      "avg": 9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Battle in the Many Mesas area. OTA classic. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 8,
    "terrains": [
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Ti8kGjiegotB9EdlC2co/photo/ULRAHOFJnzXdQkVzbVux-PD%20mini.jpg"
  },
  {
    "id": "paradise-lost",
    "name": "Paradise Lost",
    "dimensions": "20x10",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across tropical, sea, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "tropical",
      "sea",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/eR6j6L2F2OSP7QeCfW8O/photo/0T5Xhn7aNDFnRBE1jI43-ParadiseLost%20minimap.jpg"
  },
  {
    "id": "pawn-retreat",
    "name": "Pawn Retreat",
    "dimensions": "20x20",
    "wind": {
      "min": 3,
      "max": 12,
      "avg": 9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Team game map capable of 8v8. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, forests, grassy, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "desert",
      "forests",
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Z7wmue7EsjaTNpsdBuyx/photo/rOjHpHjs0v2pwDkFlXr3-pawn_retreat_1.2.jpg"
  },
  {
    "id": "pentos",
    "name": "Pentos",
    "dimensions": "20x20",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across tropical, island, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 5,
    "terrains": [
      "tropical",
      "island",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/HdwZWKydw2luEc8EascR/photo/gUxRcnq8izgR45LLNyFX-Pentos_V1.jpg"
  },
  {
    "id": "pillar-of-doom",
    "name": "Pillar of Doom",
    "dimensions": "12x12",
    "wind": {
      "min": 2,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 14,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+14 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, island, hills. Abundant tidal currents (+14 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 3,
    "terrains": [
      "grassy",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/8NJ4dy6hrSPsrezNmczE/photo/t4w4oj4YXpfORr3v7VUi-Pillar_of_Doom_v1.jpg"
  },
  {
    "id": "pinch-point",
    "name": "Pinch Point",
    "dimensions": "32x20",
    "wind": {
      "min": 6,
      "max": 20,
      "avg": 15.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "An island pair set in a tropical biome featuring a large central crossing and supporting islands to create tactical opportunities for all unit types. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features tropical, sea, water, island, shallows, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Pinchy",
    "playerCount": 16,
    "terrains": [
      "tropical",
      "sea",
      "water",
      "island",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Z8YOFQmH2Aic7MsPihzr/photo/PalVnR8tM3kfyYznMmzV-pinch_point_1.03_screenshot.png"
  },
  {
    "id": "pinewood-derby",
    "name": "Pinewood Derby",
    "dimensions": "12x6",
    "wind": {
      "min": 2,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A fun and good map for new players. Though when you already know how to play BAR, please revisit, there are multiple viable strategies possible here. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, water, chokepoints, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 4,
    "terrains": [
      "forests",
      "grassy",
      "water",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/zvBCoDF2TaUPp7AwfCUr/photo/oMimWbbWSn2z8FB1PsJ1-Pinewood_Derby_V1.jpg"
  },
  {
    "id": "plains-and-passes",
    "name": "Plains and Passes",
    "dimensions": "20x20",
    "wind": {
      "min": 1,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Up to 8v8 map with many green hills. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/cIMaYX0u2fprp7Qk78wK/photo/FTf911HfF4x5GXKBYc1e-PaP.jpg"
  },
  {
    "id": "plethora-of-ponds",
    "name": "Plethora of Ponds",
    "dimensions": "20x20",
    "wind": {
      "min": 3,
      "max": 27,
      "avg": 19.7
    },
    "tidal": 1,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 19.7 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Many ponds make this a good map for hovercraft. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, swamp, water, flat. Favorable atmospheric wind conditions (avg 19.7 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "NOiZE",
    "playerCount": 8,
    "terrains": [
      "grassy",
      "swamp",
      "water",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/zoXOP8VC1sNWpsP41IYV/photo/sQxsoxaDb7kqDdYCwjF9-Plethora_of_Ponds_V1.jpg"
  },
  {
    "id": "point-of-no-return",
    "name": "Point of No Return",
    "dimensions": "16x24",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "PVE / FFA map. Try to not pass away on this grim alien planet. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, water, asymmetrical, hills. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 10,
    "terrains": [
      "alien",
      "water",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/uV4t5gveu4Ru1Lrm1e1l/photo/e2gX3GLbupH3YOSmoGHl-point_of_no_return_v1.0.jpg"
  },
  {
    "id": "pools-of-ilys",
    "name": "Pools of Ilys",
    "dimensions": "14x14",
    "wind": {
      "min": 6,
      "max": 16,
      "avg": 12.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Crucial geothermal vents were discovered on the surface of Ilys. Make landfall and secure. Designed for 1v1 - 3v3, up to 5v5 possible. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, alien, water, chokepoints, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "neb_",
    "playerCount": 6,
    "terrains": [
      "ice",
      "alien",
      "water",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/baVFh1flukl12cYIXLMl/photo/SR2wLrtdCiGS81YA3qLR-SolidSlate_minimap.png"
  },
  {
    "id": "prismatic-anomaly",
    "name": "Prismatic Anomaly",
    "dimensions": "16x16",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (0 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "Flat terrain with a bunch of tall obstacles. North vs South. Optimal 3vs3 or duel. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, asteroid, space, flat. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing North-South Open Maneuver Corridor provides decisive tactical leverage across the theater.",
    "author": "Zagupi",
    "playerCount": 6,
    "terrains": [
      "alien",
      "asteroid",
      "space",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/YBTyf6TkjFK9l910vyvg/photo/RS8QuMWvPkVuDAIlWbVE-topdown.jpg"
  },
  {
    "id": "project-sd-129",
    "name": "Project SD-129",
    "dimensions": "28x28",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (0 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "A little space to glaze. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features asteroid, space. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Midfield Tactical Nexus (Contested Metal Core) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 32,
    "terrains": [
      "asteroid",
      "space"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/cZDvGpmzKFHbAS6LTqh7/photo/d0I2S7EHPzkW8XoBWoa0-SD129%20Mini.jpg"
  },
  {
    "id": "proving-grounds",
    "name": "Proving Grounds",
    "dimensions": "28x28",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Prove yourself. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features asteroid, space. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "asteroid",
      "space"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/rZ07lZgj17RUrIMsIuWj/photo/k4Asmh8PHfjNU4YKT83t-PGmini.jpg"
  },
  {
    "id": "quicksilver",
    "name": "Quicksilver",
    "dimensions": "14x14",
    "wind": {
      "min": 3,
      "max": 17,
      "avg": 12.7
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A remake of a great map Quicksilver. This version has slightly more erosion, and vegetation has become tropical. Also the island is the same size as the original, but the map is increased slightly for better area around the island. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, island, flat. Moderate wind dynamics (avg 12.7 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 2,
    "terrains": [
      "grassy",
      "island",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Jdb4pZyLQPb0IkSmaVrO/photo/ITwy4hNgCKfIhqaKztjZ-Quicksilver_Remake_1.24.jpg"
  },
  {
    "id": "raptor-crater",
    "name": "Raptor Crater",
    "dimensions": "24x24",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A major spawning ground for Raptors. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features wasteland, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "wasteland",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/3vZwcbM0FH7v0TrkIoKV/photo/U2g3lE3VEpV49uUkq9bd-screen00194.jpg"
  },
  {
    "id": "ravaged",
    "name": "Ravaged",
    "dimensions": "10x10",
    "wind": {
      "min": 5,
      "max": 15,
      "avg": 11.5
    },
    "tidal": 21,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+21 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "10x10 Duel 1v1/2v2 map. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features wasteland, hills. Abundant tidal currents (+21 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": " (original by Beherith)",
    "playerCount": 2,
    "terrains": [
      "wasteland",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Cs5xNBZyuBzWCmPJKDbO/photo/1rE2SG34EfyDL9wswhfm-ravaged_remake_v1.2.jpg"
  },
  {
    "id": "red-comet",
    "name": "Red Comet",
    "dimensions": "12x8",
    "wind": {
      "min": 1,
      "max": 4,
      "avg": 3
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (1 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "A classic when it comes to strategy maps. A relative small map, though with lots of room to maneuver and it can hold up to 10 players.\n\nThe large craters can be accessed by bots, for staging area's, or refuge when being chased by Bulldogs or a Goliath.\n\nTrue to the original, with subtle extra details in heighmap and a completely revamped texture, typemap, specular, DNTS splatmap and normalmap.\n\nOriginal map i used for heightmap was from NoiZe!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features asteroid, desert, flat. Severe wind troughs dropping to 1 m/s demand disciplined solar backup to prevent economic stalls. Securing North-South Open Maneuver Corridor provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 4,
    "terrains": [
      "asteroid",
      "desert",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Xut8FRCmn2h5DuUqzF26/photo/XKJOASLUXgY6k9muVOGp-Red%20Comet%20Remaker%201.8%20Minimap.jpg"
  },
  {
    "id": "red-river-estuary",
    "name": "Red River Estuary",
    "dimensions": "20x20",
    "wind": {
      "min": 5,
      "max": 15,
      "avg": 11.5
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Red planet river estuary map for 8v8 hybrid gameplay. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features wasteland, water, hills. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "wasteland",
      "water",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/RLZ07b2DZS9vYPn5dvFX/photo/i1WaN03OlPHZzW13uvWl-red_river_estuary_v1.1.jpg"
  },
  {
    "id": "red-rock-desert",
    "name": "Red Rock Desert",
    "dimensions": "14x16",
    "wind": {
      "min": 4,
      "max": 15,
      "avg": 11.3
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "1v1-5v5 map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features water, flat. Moderate wind dynamics (avg 11.3 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 10,
    "terrains": [
      "water",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/9Z3VnJ2cFcGhcaq6z1bJ/photo/hjVTf6pDN4hTwy1jQ6RR-Red_Rock_Desert_v1.jpg"
  },
  {
    "id": "red-triangle",
    "name": "Red Triangle",
    "dimensions": "18x18",
    "wind": {
      "min": 0,
      "max": 15,
      "avg": 11.2
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Red planet triangle. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, water, island. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 3,
    "terrains": [
      "alien",
      "water",
      "island"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XMFpTWsDjFSPjJ4nOZSO/photo/3iPL1Vc0wy5b0FRaUylY-red_triangle_remake_v1.3.jpg"
  },
  {
    "id": "requiem-outpost",
    "name": "Requiem Outpost",
    "dimensions": "24x12",
    "wind": {
      "min": 1,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 18,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+18 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Survival map. Ideal for asymmetrical strength team. Strong team on the right (team 2). Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features desert, ruins, chokepoints, asymmetrical, flat. Abundant tidal currents (+18 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 6,
    "terrains": [
      "desert",
      "ruins",
      "chokepoints",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/F40FJFEjKm3hcVzdnIvA/photo/wGRkjzEWDGvyY3oTJ4oI-Requiem_Outpost_1.0.jpg"
  },
  {
    "id": "reraghnarok",
    "name": "ReRaghnarok",
    "dimensions": "20x20",
    "wind": {
      "min": 0,
      "max": 10,
      "avg": 7.5
    },
    "tidal": 28,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+28 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across alien, flat, hills. Abundant tidal currents (+28 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Raghna",
    "playerCount": 14,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/wyCcSCcx7UYOY5bT4d5P/photo/msstjnxjQQk6VNjbqFqt-ReRaghnarok_1.jpg"
  },
  {
    "id": "rifted",
    "name": "Rifted",
    "dimensions": "16x16",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Inspired by League of Legends.\n\nWith unexpectedly good and diverse gameplay!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, water, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "forests",
      "grassy",
      "water",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/SHA84LfmzYbxT8iIyTtU/photo/Lfq7Vb90oXDH2kYbZybf-Rifted_V2.jpg"
  },
  {
    "id": "ring-atoll",
    "name": "Ring Atoll",
    "dimensions": "18x18",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Midfield Tactical Nexus (Contested Metal Core)",
      "Lateral Ridge Ramps (Flanking Access)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Ring of small islands with shallow middle. Up to 10 players. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features island. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 10,
    "terrains": [
      "island"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/GxjYgcmTFdC3JivNsghb/photo/6WfM2kgIb7cfYP8ObUwm-ring_atoll_remake_v2.0.jpg"
  },
  {
    "id": "riverdale",
    "name": "Riverdale",
    "dimensions": "12x20",
    "wind": {
      "min": 1,
      "max": 17,
      "avg": 12.7
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Remake of the rather interesting asymmetrical map River Dale V2. This time, a little bit more rocky edges, but still the same special metal lay-out and also asymmetrical values for North and South.\n\nGood for team games 1v1 or 2v2\nEnjoy the rolling hills and unique map-design.\n\nOriginal from Secure. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, asymmetrical, flat, hills. Severe wind troughs dropping to 1 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 4,
    "terrains": [
      "forests",
      "grassy",
      "asymmetrical",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/x0Y6f1ou7U5tF3S9xllC/photo/hXyKXfrI1KQBHZUsSruB-Riverdale_Remake_2.1.jpg"
  },
  {
    "id": "riverrun",
    "name": "Riverrun",
    "dimensions": "24x24",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers situated across forests, grassy, shallows, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ZrnTf20mPzbrMjtHa9Wg/photo/sFr9Rlw0Y9l52luQ1qoF-Riverrun_V1.jpg"
  },
  {
    "id": "rosetta",
    "name": "Rosetta",
    "dimensions": "20x16",
    "wind": {
      "min": 0,
      "max": 10,
      "avg": 7.5
    },
    "tidal": 20,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "This desolate asteroid is fought over only for the rich metal deposits. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features asteroid, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 16,
    "terrains": [
      "asteroid",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/3QOjI5FJqvQEJElcRgTQ/photo/yrKgw55AuDtEjTQNqKXn-rosettamini.png"
  },
  {
    "id": "rustcrown-canyon",
    "name": "Rustcrown Canyon",
    "dimensions": "20x10",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A lush river cuts through the bottom of this deep chasm. East vs West. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, water, shallows, hills. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, PtaQ",
    "playerCount": 12,
    "terrains": [
      "forests",
      "water",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Y5e7sl891wO5G2ttwjmr/photo/FQWRrFiv5hLEuXdayRnD-rustcrownmini.png"
  },
  {
    "id": "sailaway",
    "name": "SailAway",
    "dimensions": "20x20",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Islands of forests and wildflowers above the sea. 8v8 N vs S. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, tropical, jungle, sea, water, island, chokepoints, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, IceXuick",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "tropical",
      "jungle",
      "sea",
      "water",
      "island",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/0jMFtrg8MuFKGgxmk6Nl/photo/OEbBHDyGJnyON3efSsbU-SailAwayMini.png"
  },
  {
    "id": "salmiakki",
    "name": "Salmiakki",
    "dimensions": "20x16",
    "wind": {
      "min": 2,
      "max": 16,
      "avg": 12
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Salmiakki is both salty and sweet. Which one will it be for you?. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, shallows, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "shallows",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/qrpwI83FonOR43KTBxZE/photo/kiLyeQuUB0Cv9UiqPdI8-salmiakki_topdown.png"
  },
  {
    "id": "salt-reef",
    "name": "Salt Reef",
    "dimensions": "20x16",
    "wind": {
      "min": 4,
      "max": 14,
      "avg": 10.6
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "4v4-8v8 map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/B8dWp2FEAk7BY2XCOAYt/photo/q02azkJPPP9j56lw5VcM-salt_reef_minimap.jpg"
  },
  {
    "id": "sand-crowns",
    "name": "Sand Crowns",
    "dimensions": "20x20",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Sand crowns surrounding secluted sharp rocky peaks. Up to 4v4v4v4 map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/suiptWi42AOG8o7p6OHw/photo/c0OLOuhcFTrsF8tOejKr-Sand_Crowns_minimap.jpg"
  },
  {
    "id": "scylla-and-charybdis",
    "name": "Scylla and Charybdis",
    "dimensions": "16x20",
    "wind": {
      "min": 5,
      "max": 13,
      "avg": 10.1
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "4v4-8v8 map. The large pits with 2 geothermals are unreachable by land. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, wasteland, flat. Moderate wind dynamics (avg 10.1 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "desert",
      "wasteland",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/WrkVFQS8BedaqPg5SeB7/photo/elWZ1O5N6WfTelQYf4ek-scylla_minimap.jpg"
  },
  {
    "id": "sector-318c",
    "name": "Sector 318C",
    "dimensions": "20x16",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Low metal values, acidic lakes. Welcome to the Sector 318C. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features acidic, desert, hills. Moderate wind dynamics (avg 12.1 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "acidic",
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/mAD4ToJrMg6xGHEM18qN/photo/076mZRA86BPxru7cxMzF-sector_318C_v1.0.jpg"
  },
  {
    "id": "serene-caldera",
    "name": "Serene Caldera",
    "dimensions": "30x30",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 23,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+23 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Huge sea map with lots of small islands. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features tropical, island, flat. Abundant tidal currents (+23 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 40,
    "terrains": [
      "tropical",
      "island",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Gkh9KVgCUNbGTXWBjPoV/photo/Gc1CatZdwYFPZXKqo9et-serene_caldera_v1.3.jpg"
  },
  {
    "id": "sertagatta",
    "name": "Sertagatta",
    "dimensions": "16x12",
    "wind": {
      "min": 2,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 16.4 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Small desert map, middle hills are passable by bots, up to 8 players. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat, hills. Favorable atmospheric wind conditions (avg 16.4 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 8,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/1JL7kMOT8mYsx2OEQnv8/photo/fhpxCL7Y1qCS9C47xgME-sertagatta_v6.0.jpg"
  },
  {
    "id": "sertaleina",
    "name": "Sertaleina",
    "dimensions": "12x8",
    "wind": {
      "min": 2,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 16.4 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "Small 1v1 high wind desert map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat. Favorable atmospheric wind conditions (avg 16.4 m/s) strongly reward early wind turbine farms. Securing North-South Open Maneuver Corridor provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 6,
    "terrains": [
      "desert",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/bX4YxbtQ8YCc6G0yMumJ/photo/rkJyQASXYwFwj5x5zYLL-sertaleina_v9.0.jpg"
  },
  {
    "id": "seven-rivers",
    "name": "Seven Rivers",
    "dimensions": "24x16",
    "wind": {
      "min": 0,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 25,
    "metalDensity": "low",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large desert hills are separated by wide river. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features desert, shallows, hills. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "desert",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/J8V3PInQjJJ2KERt9A1F/photo/m1dSOREyl3cswUBPlaUt-seven_rivers.jpg"
  },
  {
    "id": "shallow-straits",
    "name": "Shallow Straits",
    "dimensions": "12x12",
    "wind": {
      "min": 2,
      "max": 16,
      "avg": 12
    },
    "tidal": 12,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+12 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, water. Abundant tidal currents (+12 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Johannes",
    "playerCount": 6,
    "terrains": [
      "grassy",
      "water"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/sKu3wAd6qfR5jG8fC6KU/photo/UxrBBnJbYDI1B9EIWyYo-Shallow_Straits_v1.jpg"
  },
  {
    "id": "shore-to-shore",
    "name": "Shore to Shore",
    "dimensions": "30x6",
    "wind": {
      "min": 2,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers situated across sea, asymmetrical, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "sea",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/MuFsIEswFS9FbuamCfbS/photo/IDnsPXeTVxsS53VCpDD2-shore-to-shore-minimap.jpg"
  },
  {
    "id": "silent-sea",
    "name": "Silent Sea",
    "dimensions": "14x14",
    "wind": {
      "min": 3,
      "max": 18,
      "avg": 13.5
    },
    "tidal": 11,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 13.5 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, island, hills. Favorable atmospheric wind conditions (avg 13.5 m/s) strongly reward early wind turbine farms. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Johannes",
    "playerCount": 6,
    "terrains": [
      "desert",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/fkhBIvsAdLiL9CvVlp2l/photo/Np5wxgfUELY0C07nyo2x-Silent_Sea_v1.jpg"
  },
  {
    "id": "silveridge",
    "name": "Silveridge",
    "dimensions": "20x20",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A large map for big battles, can be fought either East vs West or North vs South. Also works for 4-way FFA. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, hills. Favorable atmospheric wind conditions (avg 14.2 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Johannes",
    "playerCount": 16,
    "terrains": [
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/cvpud6KzRzucgumjiBgk/photo/sfvXuiMEVeTMtyODXqSD-Silveridge_v1.jpg"
  },
  {
    "id": "sinkhole-network",
    "name": "Sinkhole Network",
    "dimensions": "20x20",
    "wind": {
      "min": 1,
      "max": 14,
      "avg": 10.4
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Solar Baseline & Wind Hybrid Grid",
        "description": "Dead calm wind troughs (1 m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Large network of stone pillars and bridges. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat, hills. Severe wind troughs dropping to 1 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/A9eqjOzH3trguY66HGmH/photo/umX17QsPQQzMm8TRwT4K-network.jpg"
  },
  {
    "id": "sky-isle",
    "name": "Sky Isle",
    "dimensions": "16x16",
    "wind": {
      "min": 8,
      "max": 10,
      "avg": 9.1
    },
    "tidal": 5,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Fog of Death surrounding this odd island. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, hills. Moderate wind dynamics (avg 9.1 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 6,
    "terrains": [
      "alien",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/TBlG9YF5CxIvchMI0DZX/photo/8NKvwzrJyHIXfIqSIcpy-sky_isle_v1.1.jpg"
  },
  {
    "id": "small-supreme-battlefield",
    "name": "Small Supreme Battlefield",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across forests, grassy, sea, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "forests",
      "grassy",
      "sea",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/j29MVJU3ctlnvyEQ6HNb/photo/UtaFrIo8gcGulk5zfvhI-Small_Supreme_Battlefield_V3.jpg"
  },
  {
    "id": "special-creek",
    "name": "Special Creek",
    "dimensions": "32x24",
    "wind": {
      "min": 3,
      "max": 14,
      "avg": 10.5
    },
    "tidal": 23,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+23 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "50v50 map for events. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, hills. Abundant tidal currents (+23 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "RebelNode",
    "playerCount": 16,
    "terrains": [
      "forests",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/PridcMZhggu4EwEbMOJn/photo/Q9fXuk9SLJrudXk7QGTT-topdown.png"
  },
  {
    "id": "special-hotstepper",
    "name": "Special Hotstepper",
    "dimensions": "32x32",
    "wind": {
      "min": 8,
      "max": 17,
      "avg": 13.6
    },
    "tidal": 0,
    "metalDensity": "low",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 13.6 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "A special event map made for the 50k Discord Member event, held in June 2025. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features lava, hills. Favorable atmospheric wind conditions (avg 13.6 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "AidanNaut",
    "playerCount": 100,
    "terrains": [
      "lava",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/wel448H7SXzi96dEl5Qt/photo/XFOS1ZjPM5CDwEnlbrKB-Preview.PNG"
  },
  {
    "id": "special-reef",
    "name": "Special Reef",
    "dimensions": "20x24",
    "wind": {
      "min": 5,
      "max": 15,
      "avg": 11.5
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Salt Reef 40v40 version for the 40k special event. Ramps on messas and large craters are bots passable only, and few more on the plateaus. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "alien",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/jWIjHBYEHstYSyrSstVr/photo/KcQKKXoka9oS1UASfsDB-Special_Reef_minimap.jpg"
  },
  {
    "id": "speedmetal",
    "name": "SpeedMetal",
    "dimensions": "26x4",
    "wind": {
      "min": 30,
      "max": 30,
      "avg": 30
    },
    "tidal": 0,
    "metalDensity": "all-metal",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 30 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "The renown Fast Speed Metal map. Great for fast and intense battles.\n\nBuild your extractors, anywhere!\n\nBeware of the Lava. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, metal, chokepoints. Favorable atmospheric wind conditions (avg 30 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 4,
    "terrains": [
      "alien",
      "metal",
      "chokepoints"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/bkIRTcsnvtmQVsm3SsNJ/photo/CJB9syGlsB5i4hSLM2aR-speedmetal-minimap.png"
  },
  {
    "id": "sphagnum-bog",
    "name": "Sphagnum Bog",
    "dimensions": "12x16",
    "wind": {
      "min": 4,
      "max": 12,
      "avg": 9.2
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A lot of shallow rivers flow across this mossy hills. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features swamp, flat. Moderate wind dynamics (avg 9.2 m/s) support hybrid solar-wind energy scaling. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 6,
    "terrains": [
      "swamp",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/0rkuPKU4nx2GuhlUC8sH/photo/3QFsvRpz7psmFzZsKKAP-sphagnum_bog_v1.1.jpg"
  },
  {
    "id": "starwatcher",
    "name": "Starwatcher",
    "dimensions": "24x16",
    "wind": {
      "min": 4,
      "max": 12,
      "avg": 9.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Sandy slopes are vehicle passable. Most ridges are bots passable. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features desert, flat, hills. Moderate wind dynamics (avg 9.2 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/vFNwoJJ3cCMzSaAAQPvR/photo/5kDQevxl6WZGONr07SNH-starwatcher_v1.0.jpg"
  },
  {
    "id": "stronghold",
    "name": "Stronghold",
    "dimensions": "16x16",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 12,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+12 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across wasteland, flat, hills. Abundant tidal currents (+12 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Nikuksis, Beherith",
    "playerCount": 16,
    "terrains": [
      "wasteland",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/snRldJIaPiKTiNiEAPEg/photo/z3vsITECzMJXa2dyYueh-atronghold5.png"
  },
  {
    "id": "sulphur-springs",
    "name": "Sulphur Springs",
    "dimensions": "24x24",
    "wind": {
      "min": 5,
      "max": 15,
      "avg": 11.5
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "West vs South team game map. A lot of hot geysers spread here. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, water, shallows, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "alien",
      "water",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/Cz4OYo0Z2yht9PUP8vcN/photo/ofMDo329YT9AZXhjA7lY-sulphur_springs_v1.1.jpg"
  },
  {
    "id": "sunderance",
    "name": "Sunderance",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Rugged mountains and grassy plains. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features forests, grassy, flat, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/gf2s52iInoEKNyK1vA19/photo/Bb2OJnltHK40gH8KMvdM-Sunderance_V1.3.jpg"
  },
  {
    "id": "supreme-crossing",
    "name": "Supreme Crossing",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across forests, grassy, sea, shallows, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "forests",
      "grassy",
      "sea",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/pZko6a1Lqs5ZYeVO0BqS/photo/vuzJhK6oTcjcDXqvuY4Y-Supreme_Crossing_V1.jpg"
  },
  {
    "id": "supreme-crossing-2",
    "name": "Supreme Crossing 2",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A slightly different eroded map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, sea, shallows, flat. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 8,
    "terrains": [
      "desert",
      "sea",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XAYu2CrwVdR5GlcpOxL0/photo/3WEjStNWVSaUyrXCCB1O-Supreme_Crossing_2.2.jpg"
  },
  {
    "id": "swirly-rock",
    "name": "Swirly Rock",
    "dimensions": "24x16",
    "wind": {
      "min": 2,
      "max": 12,
      "avg": 9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large valley to swirl your way to victory. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, wasteland, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "alien",
      "wasteland",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/7qvZYwphKlrDjOcDOVLj/photo/5yNtU5sE5A8iVbioPmRy-swirly_rock_v1.1.jpg"
  },
  {
    "id": "tabula",
    "name": "Tabula",
    "dimensions": "16x14",
    "wind": {
      "min": 1,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A classic famous map with many possible strategies. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, water, shallows, flat, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Hunterw, IceXuick",
    "playerCount": 8,
    "terrains": [
      "grassy",
      "water",
      "shallows",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/QlanwpEXsYOy3ZYYp3iu/photo/EG9ZHJ3p3xQjqvMGX98W-Tabula_Remake_1.5.jpg"
  },
  {
    "id": "taldarim",
    "name": "Taldarim",
    "dimensions": "24x18",
    "wind": {
      "min": 2,
      "max": 13,
      "avg": 9.7
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers situated across forests, grassy, island, chokepoints, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "forests",
      "grassy",
      "island",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/XipxkGywEz3REbHKrvP6/photo/dnuDiBcbzquAG5o4Bx4d-taldarim_photo_shot.png"
  },
  {
    "id": "talus",
    "name": "Talus",
    "dimensions": "16x16",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, grassy, shallows, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 14,
    "terrains": [
      "desert",
      "grassy",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/1D03UHTgJ5axEHRPrjzh/photo/wHTfmpydRIXwwEinapAa-Talus_V2.jpg"
  },
  {
    "id": "tangerine",
    "name": "Tangerine",
    "dimensions": "16x16",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, tropical, water, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "ShoX",
    "playerCount": 10,
    "terrains": [
      "grassy",
      "tropical",
      "water",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/BHxtx4DPxKgPkUTkRg9e/photo/3qlS02qEv0213d0Kvcwr-Tangerine_Remake_1.0.jpg"
  },
  {
    "id": "tau",
    "name": "Tau",
    "dimensions": "16x16",
    "wind": {
      "min": 3,
      "max": 20,
      "avg": 15
    },
    "tidal": 17,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+17 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across grassy, water, shallows, flat, hills. Abundant tidal currents (+17 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 12,
    "terrains": [
      "grassy",
      "water",
      "shallows",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/OgYCeZrIVMN1b9sUbweo/photo/zc4138j6fDu20DBqTKnR-Tau12.jpg"
  },
  {
    "id": "tempest",
    "name": "Tempest",
    "dimensions": "20x20",
    "wind": {
      "min": 1,
      "max": 25,
      "avg": 18.6
    },
    "tidal": 18,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+18 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A large, open map with a resource rich lake in the center. All units can pass in the shallows along the shore. You can set the map to dry with the mapoption WaterLevel 1, and set it to almost completely flooded with WaterLevel 2. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, water, shallows, flat. Abundant tidal currents (+18 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "desert",
      "water",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/kgpwvzDGdXoVcD6whG3C/photo/7bl3Pxk69JimaFOLX431-Tempest_V3.jpg"
  },
  {
    "id": "tetrad",
    "name": "Tetrad",
    "dimensions": "12x12",
    "wind": {
      "min": 1,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across forests, grassy, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "forests",
      "grassy",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/T9CfXfwVVubXUcJbMNra/photo/RTeYQoM3sqz3nZeS0J0e-tetrad_v2.jpg"
  },
  {
    "id": "the-barrier-reef",
    "name": "The Barrier Reef",
    "dimensions": "20x20",
    "wind": {
      "min": 5,
      "max": 15,
      "avg": 11.5
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Body of water separates two land masses. Great underwater starts!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features sea, flat. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "sea",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/LSbOSBM6bqPCs5heCJ9X/photo/S72iDK1l4MKUrYyhOnXs-the_barrier_reef_remake_v1.0.jpg"
  },
  {
    "id": "the-cold-place",
    "name": "The Cold Place",
    "dimensions": "20x16",
    "wind": {
      "min": 10,
      "max": 25,
      "avg": 19.5
    },
    "tidal": 25,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+25 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fighting on an ice sheet with very strong winds. BAR Remake. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, water, flat, hills. Abundant tidal currents (+25 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 6,
    "terrains": [
      "ice",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/te9bV2b9aiw8w9qgzTJg/photo/3kS3nwib1cFpLNeozUQt-the_cold_place_BAR_v1.1.jpg"
  },
  {
    "id": "the-desert-triad",
    "name": "The Desert Triad",
    "dimensions": "8x8",
    "wind": {
      "min": 0,
      "max": 12,
      "avg": 9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Fighting on 3 mesas. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features desert, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 3,
    "terrains": [
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/5dy2Thg5cVT6FT1s5n0y/photo/GRTrJtqsaZFwwtDJJCvR-Triad_Mini.jpg"
  },
  {
    "id": "the-halite-maze",
    "name": "The Halite Maze",
    "dimensions": "12x8",
    "wind": {
      "min": 5,
      "max": 20,
      "avg": 15.1
    },
    "tidal": 23,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+23 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Duel map. Small rocky maze and sparse metal. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, wasteland, hills. Abundant tidal currents (+23 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 6,
    "terrains": [
      "alien",
      "wasteland",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/hC5Ic7adKaK6YBA68mKY/photo/vhes5B1eRLndPPHPPYiY-the_halite_maze_v1.4.jpg"
  },
  {
    "id": "the-rock",
    "name": "The Rock",
    "dimensions": "20x16",
    "wind": {
      "min": 2,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across wasteland, shallows, hills. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "wasteland",
      "shallows",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/EiT2c89HcHhHeuZxXako/photo/MVUXHKeoWSURhqcdKsY9-The-Rock-minimap.jpg"
  },
  {
    "id": "the-rock-jungle",
    "name": "The Rock Jungle",
    "dimensions": "20x16",
    "wind": {
      "min": 2,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 22,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+22 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A lush jungle with a large river contains dense vegetation and many shallows. East vs West. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features grassy, swamp, jungle, shallows, chokepoints, hills. Abundant tidal currents (+22 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, SirArtturi",
    "playerCount": 16,
    "terrains": [
      "grassy",
      "swamp",
      "jungle",
      "shallows",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/PekWgagUAJmWoOua3BKS/photo/6PYgbtniAi8Q2MapnxG6-rockjunglemini2.png"
  },
  {
    "id": "the-tartar-steppe",
    "name": "The Tartar Steppe",
    "dimensions": "24x24",
    "wind": {
      "min": 2,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 20,
    "metalDensity": "low",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Friday afternoon tar. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features swamp, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "swamp",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/taMTVVZKAKbYywe7tyRb/photo/ckRvAIMg4yqNaT3CDPSp-TARTAR1.1.png"
  },
  {
    "id": "theta-crystals",
    "name": "Theta Crystals",
    "dimensions": "14x14",
    "wind": {
      "min": 0,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 10,
    "metalDensity": "high",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Team map. 3 metal spots only reachable by air. Color palette based on Crystallized Plains by Moose. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features alien, desert, water, flat, hills. Severe wind troughs dropping to 0 m/s demand disciplined solar backup to prevent economic stalls. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 8,
    "terrains": [
      "alien",
      "desert",
      "water",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/u17mWZp6jqx5b5s0Or5z/photo/BihearCCwPoZuUBIePkp-theta_crystals_minimap.jpg"
  },
  {
    "id": "throne",
    "name": "Throne",
    "dimensions": "24x24",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Massive Free for All map. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features forests, grassy, island, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Beherith",
    "playerCount": 16,
    "terrains": [
      "forests",
      "grassy",
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/SYB0blENn3hqhEyLC24B/photo/YF4HSzBHaipGgq4R3cNq-Throne_V8.jpg"
  },
  {
    "id": "timna-island",
    "name": "Timna Island",
    "dimensions": "20x12",
    "wind": {
      "min": 1,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 18,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+18 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A fresh, though unbalanced and asymmetrical island to wage war on.\n\nWest has a tad more metal, or at least easier access to it. East has a better defendable position due to the high ground.\n\nGreat for new players to start east. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, island, asymmetrical, hills. Abundant tidal currents (+18 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 8,
    "terrains": [
      "desert",
      "island",
      "asymmetrical",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/xbJTsdeXIKFQmuvBHW3d/photo/tDliYQN5TMsMVdahqcha-Timna_Island_1.0.jpg"
  },
  {
    "id": "titan",
    "name": "Titan",
    "dimensions": "18x12",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.4 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across desert, hills. Favorable atmospheric wind conditions (avg 14.4 m/s) strongly reward early wind turbine farms. Success hinges on controlling Central Canyon Corridor (Primary Armor Bottleneck) while defending flank access points against raider incursions.",
    "author": "SirArtturi",
    "playerCount": 8,
    "terrains": [
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/eLHwUEMIb0S3qLy0OT6G/photo/oPksUi3nzzROhlpBDFsN-titan-v31-minimap.jpg"
  },
  {
    "id": "titan-duel",
    "name": "Titan Duel",
    "dimensions": "10x10",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.4 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "Fast-paced compact arena featuring instant engagement corridors and early raider dominance situated across desert, flat. Favorable atmospheric wind conditions (avg 14.4 m/s) strongly reward early wind turbine farms. Success hinges on controlling North-South Open Maneuver Corridor while defending flank access points against raider incursions.",
    "author": "SirArtturi",
    "playerCount": 4,
    "terrains": [
      "desert",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/pqGeTK0PB1xPJ6A1u6CO/photo/8nfaUN9dUFhDnvAK6r5k-TitanDuel_V3.jpg"
  },
  {
    "id": "tma20x",
    "name": "TMA20X",
    "dimensions": "20x20",
    "wind": {
      "min": 0,
      "max": 0,
      "avg": 0
    },
    "tidal": 30,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+30 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "A remake and rescale of the popular TMA map from Beherith.\n\nA reduction from 32x32 to 20x20 and a new look.\n\nThis is the improved version of TMA20, and also now back in Space!\n\nPerfect for FFA games for 5-7 players, but you can play from 2-8 players. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features asteroid, space, wasteland, asymmetrical, flat. Abundant tidal currents (+30 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 7,
    "terrains": [
      "asteroid",
      "space",
      "wasteland",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/QsD0vDtYMgk8ATraKoNI/photo/JapTghABM3TOuBy0GSSP-tma20x_1.8.jpg"
  },
  {
    "id": "to-kill-the-middle",
    "name": "To Kill The Middle",
    "dimensions": "24x24",
    "wind": {
      "min": 4,
      "max": 16,
      "avg": 12.1
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Armored Frontline Steamroll & Jammer Screen",
        "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
      }
    ],
    "tacticalBriefing": "16-way FFA or teams map. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features lava, wasteland, flat. Moderate wind dynamics (avg 12.1 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "lava",
      "wasteland",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/fzRTg60xfSVnG44Zw42D/photo/W4g2LLT11PPz70wVoR5R-to_kill_the_middle_v1.0.jpg"
  },
  {
    "id": "trefoil",
    "name": "Trefoil",
    "dimensions": "16x16",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Full remake from of this dynamic map with multiple possible strategies. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features tropical, island, shallows, chokepoints, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 6,
    "terrains": [
      "tropical",
      "island",
      "shallows",
      "chokepoints",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/GPSFfpSd1wtmx4CZRGA6/photo/MdA8kk63cbQbnOQJWaj7-Trefoil_Remake_2.20.jpg"
  },
  {
    "id": "tropical-assault",
    "name": "Tropical Assault",
    "dimensions": "18x20",
    "wind": {
      "min": 0,
      "max": 20,
      "avg": 14.9
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across tropical, island, shallows, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Nikuksis",
    "playerCount": 16,
    "terrains": [
      "tropical",
      "island",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/1FfJKeljSZeWodN5FZsW/photo/Fd2UJv7r7nm3j44ymV5B-tropical_assault_v3.0.jpg"
  },
  {
    "id": "tumult",
    "name": "Tumult",
    "dimensions": "14x14",
    "wind": {
      "min": 5,
      "max": 13,
      "avg": 10.1
    },
    "tidal": 1,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Blitz & Flash High-Mobility Raider Swarm",
        "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "4v4 map where only bots can pass side hills. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, flat, hills. Moderate wind dynamics (avg 10.1 m/s) support hybrid solar-wind energy scaling. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "Nikuksis (original by Hunterw)",
    "playerCount": 8,
    "terrains": [
      "desert",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/MqDO00JzJMESdzVDkkT5/photo/ppl1uBCIqn6z3ievxZBe-tumult_remake_v1.0.jpg"
  },
  {
    "id": "tundra",
    "name": "Tundra",
    "dimensions": "16x16",
    "wind": {
      "min": 4,
      "max": 14,
      "avg": 10.6
    },
    "tidal": 9,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Contested Core Control & Wreckage Reclaim",
        "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions situated across wasteland, shallows, flat. Moderate wind dynamics (avg 10.6 m/s) support hybrid solar-wind energy scaling. Success hinges on controlling Central Sea Lane & Deepwater Channel while defending flank access points against raider incursions.",
    "author": "Beherith",
    "playerCount": 8,
    "terrains": [
      "wasteland",
      "shallows",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ljx3Fdz1TLbewjyAIoVw/photo/lxAbvb4fC6mncreiUXuY-Tundra_V2.jpg"
  },
  {
    "id": "tundra-continents",
    "name": "Tundra Continents",
    "dimensions": "20x24",
    "wind": {
      "min": 1,
      "max": 16,
      "avg": 11.9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large map, optimal for 2 teams, up to 10 players each. Fight for the strategically important center continents or push through the middle water passage. Early fights for reclaim on the middle ridges. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features wasteland, sea, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Nikuksis",
    "playerCount": 20,
    "terrains": [
      "wasteland",
      "sea",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/pzZ5zAyferpDePxtC2hG/photo/0CAb9kEtVoZ8KyiL4ahV-Tundra_Continents_v2.3.jpg"
  },
  {
    "id": "twin-lakes-park",
    "name": "Twin Lakes Park",
    "dimensions": "24x20",
    "wind": {
      "min": 2,
      "max": 18,
      "avg": 13.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Large mountains and many passes. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features alien, desert, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose",
    "playerCount": 16,
    "terrains": [
      "alien",
      "desert",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/X0N11knnIS4fWqkoFPBC/photo/XZrG25z9ZDik3X84wQQj-tlpmini.png"
  },
  {
    "id": "valles-marineris",
    "name": "Valles Marineris",
    "dimensions": "16x12",
    "wind": {
      "min": 1,
      "max": 22,
      "avg": 16.4
    },
    "tidal": 18,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+18 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Official remake of the Valles Marineris map from SirArrturi. Inspired by the official canyon-range on Mars.\n\nBots have paths to climb all cliffs, though some are harder to traverse. So bots have many evasive possibilities compared to vehicles. Though the reasonable shallow and wide ramps will give vehicles access to almost every location. Choose wisely!\n\nEnjoy. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features desert, wasteland, flat, hills. Abundant tidal currents (+18 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "IceXuick",
    "playerCount": 10,
    "terrains": [
      "desert",
      "wasteland",
      "flat",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/cYgRxanQzvg7Bx9xXk1H/photo/PLGdCe5NFsZgi30hWW2u-valles_marineris_2.6.jpg"
  },
  {
    "id": "vittra",
    "name": "Vittra",
    "dimensions": "10x10",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 10,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.4 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Close quarters combat over grassy plateaus and cliffs. 1v1 - 2v2 N vs S. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features forests, grassy, shallows, chokepoints, hills. Favorable atmospheric wind conditions (avg 14.4 m/s) strongly reward early wind turbine farms. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, Beherith",
    "playerCount": 4,
    "terrains": [
      "forests",
      "grassy",
      "shallows",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/qTLInrgvg9m3tXyqPbLy/photo/CjP9Qy1KmTml5hedZyR2-vittramini.png"
  },
  {
    "id": "wanderlust",
    "name": "Wanderlust",
    "dimensions": "10x8",
    "wind": {
      "min": 5,
      "max": 19,
      "avg": 14.4
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Grassy lowlands on the sides and dry upper plateaus in the center. 1v1 to 3v3. Fast-paced compact arena featuring instant engagement corridors and early raider dominance. Topography features desert, grassy, chokepoints, hills. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Moose, FlorisXIV",
    "playerCount": 6,
    "terrains": [
      "desert",
      "grassy",
      "chokepoints",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/FmRZtQ8Wvce6HgKj1uyZ/photo/TNbhW1s0Q2x3H2GDhQ6b-wandermini3.png"
  },
  {
    "id": "white-fire",
    "name": "White Fire",
    "dimensions": "16x16",
    "wind": {
      "min": 2,
      "max": 14,
      "avg": 10.5
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Up to 8v8 map. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features ice, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Phalange",
    "playerCount": 16,
    "terrains": [
      "ice",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/igcp0iDB12WAKPdtBDna/photo/VZW7Ul5Cf5kk4uuZ4TpD-White%20Fire%20Remake%201.1.jpg"
  },
  {
    "id": "why-did-i-let-ptaq-talk-me-into-this",
    "name": "Why did I let PtaQ talk me into this",
    "dimensions": "32x32",
    "wind": {
      "min": 0,
      "max": 12,
      "avg": 9
    },
    "tidal": 15,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+15 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Huge island battlefield to fight on the mountains, beaches, grassland, and sea. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features island, hills. Abundant tidal currents (+15 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Ambulatory Cortex",
    "playerCount": 16,
    "terrains": [
      "island",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/mzKwuWFz1VASHj9M4xeV/photo/3D24qvD6lUCYYGxtkWX2-screen_2025-02-01_13-43-09-129.png"
  },
  {
    "id": "world-in-flames",
    "name": "World In Flames",
    "dimensions": "32x16",
    "wind": {
      "min": 5,
      "max": 25,
      "avg": 18.8
    },
    "tidal": 20,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Sea Lane & Deepwater Channel",
      "Coastal Landing Shallows & Island Reefs",
      "North-South Open Maneuver Corridor",
      "Perimeter Dunes Depression (Raider Infiltration)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "Naval Tidal Array & Submersible Screen",
        "description": "Harness stable coastal tidal current (+20 E/s) for dependable power while establishing early torpedo and sub pickets."
      },
      {
        "faction": "armada",
        "name": "Hover Raider Coastal Harassment",
        "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
      },
      {
        "faction": "cortex",
        "name": "Heavy Destroyer Line & Coastal Fortification",
        "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
      }
    ],
    "tacticalBriefing": "Geographical map of Earth. Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers. Topography features sea, water, asymmetrical, flat. Abundant tidal currents (+20 E/s) make coastal water production exceptionally lucrative. Securing Central Sea Lane & Deepwater Channel provides decisive tactical leverage across the theater.",
    "author": "Soaptastesok",
    "playerCount": 16,
    "terrains": [
      "sea",
      "water",
      "asymmetrical",
      "flat"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/PU301WL4OzdofkHuT9N9/photo/7jgDMFcKpvzT0Dk2VCFe-topdown.png"
  },
  {
    "id": "zed",
    "name": "Zed",
    "dimensions": "12x12",
    "wind": {
      "min": 3,
      "max": 19,
      "avg": 14.2
    },
    "tidal": 0,
    "metalDensity": "medium",
    "chokePoints": [
      "Central Canyon Corridor (Primary Armor Bottleneck)",
      "Elevated Ridge Bluff (Artillery & Radar Lookout)",
      "Central Plateau Overlook (Key Fire Support Position)",
      "Perimeter Expansion Pockets (Early Mex Contestation)"
    ],
    "recommendedDoctrines": [
      {
        "faction": "both",
        "name": "High-Efficiency Wind Farm Scaling",
        "description": "Strong consistent wind (avg 14.2 m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
      },
      {
        "faction": "armada",
        "name": "High-Ground Radar & Starlight Artillery Skirmish",
        "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
      },
      {
        "faction": "cortex",
        "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
        "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
      }
    ],
    "tacticalBriefing": "The ultimate Alien 1V1 Experience!. Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions. Topography features lava, alien, hills. Favorable atmospheric wind conditions (avg 14.2 m/s) strongly reward early wind turbine farms. Securing Central Canyon Corridor (Primary Armor Bottleneck) provides decisive tactical leverage across the theater.",
    "author": "IceXuick, Moose",
    "playerCount": 2,
    "terrains": [
      "lava",
      "alien",
      "hills"
    ],
    "minimapUrl": "https://maps-metadata.beyondallreason.dev/i/fit-in/640x640/filters:format(webp):quality(85)/rowy-1f075.appspot.com/maps/ACgCe99NC8yZFecMwRCn/photo/28JjEDk0ysfb5y4Eou36-Zed_Remake_3.3.jpg"
  }
];

// O(1) slug and name index lookup dictionary
const MAP_LOOKUP = new Map<string, MapData>();

for (const map of MAP_DATABASE) {
  MAP_LOOKUP.set(map.id.toLowerCase(), map);
  MAP_LOOKUP.set(map.name.toLowerCase(), map);
}

/**
 * Retrieves a map by its unique ID, falling back to Supreme Isthmus if not found.
 */
export function getMapById(id: string): MapData {
  if (!id) return MAP_DATABASE[0];
  const query = id.toLowerCase().trim();
  const direct = MAP_LOOKUP.get(query);
  if (direct) return direct;

  // Fuzzy substring match fallback
  const found = MAP_DATABASE.find(
    (m) =>
      m.name.toLowerCase().includes(query) ||
      query.includes(m.name.toLowerCase()) ||
      m.id.includes(query) ||
      query.includes(m.id)
  );

  return found || MAP_DATABASE[0];
}
