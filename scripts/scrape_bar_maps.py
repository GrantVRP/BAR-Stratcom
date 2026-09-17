import urllib.request
import json
import re
import os

URL = "https://maps-metadata.beyondallreason.dev/latest/webflow_rowy_data.json"

req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
raw_data = urllib.request.urlopen(req).read().decode("utf-8")
data = json.loads(raw_data)
maps_dict = data.get("mapsInfo", {})

print(f"Scraped {len(maps_dict)} map records from BAR metadata service.")

# Pre-defined bespoke tactical profiles for premier BAR maps
PREMIER_PROFILES = {
    "supreme-isthmus": {
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
        "tacticalBriefing": "The defining competitive 8v8 frontline theater. The map is bisected by a tight center land bridge flanked by deep sea channels. Securing western geothermal vents unlocks immediate T2 transitions, while failure to monitor the eastern sea lane invites stealth amphibious raiding."
    },
    "all-that-glitters": {
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
        "tacticalBriefing": "The flagship 8v8 open battleground. Characterized by expansive mineral-rich caldera flats and consistent wind. High metal density accelerates tech scaling; matches are won through tight lane coordination, rapid reclaim of combat wreckage, and coordinated T2 armor pushes."
    },
    "glitter": {
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
        "tacticalBriefing": "Massive open desert arena dominated by mineral-rich crystal flats and constant high wind. Low natural terrain chokes make static defense easily flanked; victory requires mobile screens, proactive radar coverage, and rapid factory scaling."
    },
    "comet-catcher-redux": {
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
        "tacticalBriefing": "Airless lunar topography characterized by steep crater rims and violent wind fluctuations (0 to 30 m/s). Extreme wind volatility poses severe economic stalling hazards; maintaining a solar baseline is critical before expanding turbine farms."
    },
    "eight-horses": {
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
        "tacticalBriefing": "Eight radial mountain canyons converge upon a contested central elevation. Low atmospheric wind forces players into disciplined solar openings. The labyrinthine canyon choke points heavily reward defensive preparation and artillery placement."
    },
    "all-metal": {
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
        "tacticalBriefing": "Ultra-fast macro battlefield with a 100% metal surface. Metal extractors can be constructed anywhere. The economy bottleneck is exclusively energy and build power; immediate energy scaling and non-stop combat queues decide matches in under five minutes."
    },
    "eye-of-horus": {
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
        "tacticalBriefing": "A contested desert theater centered on the famous elevated 'Eye' plateau. The central elevation holds a dense cluster of high-yield metal extractors and affords immense radar range. Controlling the ramps leading to the Eye determines the pace of the entire match."
    },
    "boreal-falls": {
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
        "tacticalBriefing": "A picturesque subarctic valley bisected by cascading waterfalls and river shallows. Verticality is paramount: dominating the overlooking bluffs offers devastating fire superiority over units navigating the basin below."
    },
    "delta-siege-dry": {
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
        "tacticalBriefing": "A time-tested competitive theater featuring a dried river delta enclosed by towering plateaus. The central low-ground is a deadly crossfire zone; players must secure the elevated ramps to dictate front-line combat."
    },
    "seths-ravine": {
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
        "tacticalBriefing": "A severe geological trench splits the battlefield. The sheer cliffs offer immense range bonuses for artillery and radar, making direct traversal through the central ravine suicidal without smoke or overwhelming firepower."
    },
    "thermal-shock": {
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
        "tacticalBriefing": "Volcanic battlefield packed with abundant geothermal vents and magma fissures. Early energy parity is decided by whoever claims the midline geo nodes, making fast-moving skirmishers essential from the opening second."
    },
    "folsom-dam": {
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
        "tacticalBriefing": "Centered on a colossal concrete hydro dam separating an expansive reservoir from a sunken spillway basin. The dam crest provides a direct high-speed armor conduit, while the vast reservoir invites amphibious and naval maneuvers."
    },
    "red-river": {
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
        "tacticalBriefing": "A wide, silt-laden river bisects opposing bases. River crossings slow conventional armor, leaving units vulnerable to crossfire. Dominating the central shallows with amphibious units or high-ground artillery secures the match."
    }
}

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", s)

def derive_metal_density(m: dict) -> str:
    name = (m.get("name") or "").lower()
    desc = (m.get("description") or "").lower()
    terrains = [t.lower() for t in (m.get("mapTerrains") or [])]
    
    if "all-metal" in name or "speed metal" in name or "metal" in terrains or "100% metal" in desc or "all metal" in desc:
        return "all-metal"
    if any(k in name or k in desc for k in ["glitter", "crystal", "quarry", "adamantium", "rich", "dense metal", "bismuth", "mineral"]):
        return "high"
    if any(k in name or k in desc for k in ["desert", "wasteland", "barren", "sparse", "vast", "steppe"]) and (m.get("width", 16) >= 24 or m.get("height", 16) >= 24):
        return "low"
    return "medium"

def generate_chokepoints(m: dict) -> list[str]:
    terrains = [t.lower() for t in (m.get("mapTerrains") or [])]
    tidal = m.get("tidalStrength", 0)
    is_naval = tidal > 5 or any(t in terrains for t in ["water", "sea", "island", "shallows"])
    
    chokes = []
    if is_naval:
        chokes.append("Central Sea Lane & Deepwater Channel")
        chokes.append("Coastal Landing Shallows & Island Reefs")
    if any(t in terrains for t in ["hills", "mountains", "canyon", "chokepoints", "wasteland"]):
        chokes.append("Central Canyon Corridor (Primary Armor Bottleneck)")
        chokes.append("Elevated Ridge Bluff (Artillery & Radar Lookout)")
    elif any(t in terrains for t in ["desert", "flat", "plains", "grass", "grassy"]):
        chokes.append("North-South Open Maneuver Corridor")
        chokes.append("Perimeter Dunes Depression (Raider Infiltration)")
    elif any(t in terrains for t in ["lava", "acidic", "industrial"]):
        chokes.append("Industrial Slag Bottleneck & Pipe Bridge")
        chokes.append("Hazard Basin Perimeter Ramps")
    else:
        chokes.append("Midfield Tactical Nexus (Contested Metal Core)")
        chokes.append("Lateral Ridge Ramps (Flanking Access)")

    if len(chokes) < 3:
        chokes.append("Central Plateau Overlook (Key Fire Support Position)")
    if len(chokes) < 4:
        chokes.append("Perimeter Expansion Pockets (Early Mex Contestation)")

    return chokes[:4]

def generate_doctrines(m: dict, metal_density: str) -> list[dict]:
    wind_min = round(m.get("windMin", 5), 1)
    wind_avg = round(m.get("windAvg", 10), 1)
    tidal = round(m.get("tidalStrength", 0), 1)
    terrains = [t.lower() for t in (m.get("mapTerrains") or [])]
    is_naval = tidal > 8 or any(t in terrains for t in ["water", "sea", "island"])

    doctrines = []

    # Both doctrine (energy and macro)
    if tidal >= 12:
        both_doc = {
            "faction": "both",
            "name": "Naval Tidal Array & Submersible Screen",
            "description": f"Harness stable coastal tidal current (+{tidal} E/s) for dependable power while establishing early torpedo and sub pickets."
        }
    elif wind_avg >= 13.0:
        both_doc = {
            "faction": "both",
            "name": "High-Efficiency Wind Farm Scaling",
            "description": f"Strong consistent wind (avg {wind_avg} m/s) delivers rapid ROI on wind generators, enabling continuous factory expansion."
        }
    elif wind_min <= 2.0 and wind_avg < 11.0:
        both_doc = {
            "faction": "both",
            "name": "Solar Baseline & Wind Hybrid Grid",
            "description": f"Dead calm wind troughs ({wind_min} m/s) risk factory brownouts; anchor with solar collectors before building wind turbines."
        }
    elif metal_density == "all-metal":
        both_doc = {
            "faction": "both",
            "name": "Boundless Metal Eco & Continuous Combat Queues",
            "description": "Infinite metal availability shifts the strategic bottleneck entirely to energy infrastructure and build power multiplication."
        }
    else:
        both_doc = {
            "faction": "both",
            "name": "Contested Core Control & Wreckage Reclaim",
            "description": "Aggressively dispute the center metal nodes and deploy resurrection/reclaim constructors to recycle combat debris."
        }
    doctrines.append(both_doc)

    # Armada doctrine (speed, micro, raiders, hover, tech)
    if is_naval:
        armada_doc = {
            "faction": "armada",
            "name": "Hover Raider Coastal Harassment",
            "description": "Leverage fast amphibious hovercraft to strike exposed coastal metal extractors and flank entrenched land bastions."
        }
    elif any(t in terrains for t in ["flat", "desert", "plains", "grassy"]):
        armada_doc = {
            "faction": "armada",
            "name": "Blitz & Flash High-Mobility Raider Swarm",
            "description": "Exploit wide open flats with high-speed raiders to encircle opposing forces and sever unprotected energy pylons."
        }
    else:
        armada_doc = {
            "faction": "armada",
            "name": "High-Ground Radar & Starlight Artillery Skirmish",
            "description": "Occupy overlooking elevation with agile bot squads to grant line-of-sight for pinpoint high-arc artillery salvos."
        }
    doctrines.append(armada_doc)

    # Cortex doctrine (durability, brute armor, heavy plasma, chokes)
    if is_naval:
        cortex_doc = {
            "faction": "cortex",
            "name": "Heavy Destroyer Line & Coastal Fortification",
            "description": "Lock down chokepoints with durable battleships and coastal plasma emplacements to dominate the sea lanes."
        }
    elif any(t in terrains for t in ["hills", "mountains", "canyon", "chokepoints"]):
        cortex_doc = {
            "faction": "cortex",
            "name": "Narrow Choke LLT Creep & Heavy Plasma Anchor",
            "description": "Funnel opposing skirmishers into pre-sighted light laser towers backed by resilient Thug and Mace fireteams."
        }
    else:
        cortex_doc = {
            "faction": "cortex",
            "name": "Armored Frontline Steamroll & Jammer Screen",
            "description": "Advance heavy armored columns under mobile radar jammer coverage to crush opposing raider screens."
        }
    doctrines.append(cortex_doc)

    return doctrines

def generate_briefing(m: dict, metal_density: str, chokes: list[str]) -> str:
    width = m.get("width", 16)
    height = m.get("height", 16)
    wind_min = round(m.get("windMin", 5), 1)
    wind_avg = round(m.get("windAvg", 10), 1)
    tidal = round(m.get("tidalStrength", 0), 1)
    terrains = ", ".join(m.get("mapTerrains") or ["varied terrain"])
    desc = m.get("description") or ""

    if width <= 10 and height <= 10:
        scale_desc = "Fast-paced compact arena featuring instant engagement corridors and early raider dominance"
    elif width >= 24 or height >= 24:
        scale_desc = "Grand-scale macro theater accommodating extensive expansion, multi-lane defense, and late-game tech tiers"
    else:
        scale_desc = "Standard tactical theater balancing early-game skirmishes with strategic mid-game lane transitions"

    eco_summary = ""
    if tidal >= 12:
        eco_summary = f"Abundant tidal currents (+{tidal} E/s) make coastal water production exceptionally lucrative."
    elif wind_avg >= 13:
        eco_summary = f"Favorable atmospheric wind conditions (avg {wind_avg} m/s) strongly reward early wind turbine farms."
    elif wind_min <= 2:
        eco_summary = f"Severe wind troughs dropping to {wind_min} m/s demand disciplined solar backup to prevent economic stalls."
    else:
        eco_summary = f"Moderate wind dynamics (avg {wind_avg} m/s) support hybrid solar-wind energy scaling."

    if desc and len(desc.strip()) > 10:
        clean_desc = desc.strip()
        if not clean_desc.endswith('.'):
            clean_desc += '.'
        briefing = f"{clean_desc} {scale_desc}. Topography features {terrains}. {eco_summary} Securing {chokes[0]} provides decisive tactical leverage across the theater."
    else:
        briefing = f"{scale_desc} situated across {terrains}. {eco_summary} Success hinges on controlling {chokes[0]} while defending flank access points against raider incursions."

    return briefing

# Process and deduplicate all maps
processed_maps = []
seen_slugs = set()

# Process premier maps first to preserve exact IDs
for slug, profile in PREMIER_PROFILES.items():
    match = None
    for m in maps_dict.values():
        if slugify(m.get("name", "")) == slug or slug in slugify(m.get("name", "")):
            match = m
            break
    
    if match:
        name = match.get("name", slug.replace("-", " ").title())
        width = match.get("width", 16)
        height = match.get("height", 16)
        wind_min = round(match.get("windMin", 4), 1)
        wind_max = round(match.get("windMax", 18), 1)
        wind_avg = round(match.get("windAvg", 11), 1)
        tidal = round(match.get("tidalStrength", 0), 1)
        author = match.get("author", "BAR Community")
        player_count = match.get("maxPlayers", 16)
        terrains = match.get("mapTerrains", [])
        minimap = match.get("minimapThumbUrl") or match.get("minimapUrl") or ""
    else:
        name = slug.replace("-", " ").title()
        width, height = 16, 16
        wind_min, wind_max, wind_avg = 4.0, 18.0, 11.0
        tidal = 0
        author = "BAR Community"
        player_count = 16
        terrains = []
        minimap = ""

    entry = {
        "id": slug,
        "name": name,
        "dimensions": f"{width}x{height}",
        "wind": {
            "min": wind_min,
            "max": wind_max,
            "avg": wind_avg
        },
        "tidal": tidal,
        "metalDensity": profile["metalDensity"],
        "chokePoints": profile["chokePoints"],
        "recommendedDoctrines": profile["recommendedDoctrines"],
        "tacticalBriefing": profile["tacticalBriefing"],
        "author": author,
        "playerCount": player_count,
        "terrains": terrains,
        "minimapUrl": minimap
    }
    processed_maps.append(entry)
    seen_slugs.add(slug)

# Process the remaining maps from maps_dict
other_maps = []
for m in maps_dict.values():
    raw_name = m.get("name", "").strip()
    if not raw_name:
        continue
    
    slug = slugify(raw_name)
    if slug in seen_slugs:
        continue
    seen_slugs.add(slug)

    width = m.get("width", 16)
    height = m.get("height", 16)
    wind_min = round(m.get("windMin", 5), 1)
    wind_max = round(m.get("windMax", 15), 1)
    wind_avg = round(m.get("windAvg", 10), 1)
    tidal = round(m.get("tidalStrength", 0), 1)
    author = m.get("author") or "BAR Community"
    player_count = m.get("maxPlayers", 8)
    terrains = m.get("mapTerrains") or []
    minimap = m.get("minimapThumbUrl") or m.get("minimapUrl") or ""

    metal_density = derive_metal_density(m)
    chokes = generate_chokepoints(m)
    doctrines = generate_doctrines(m, metal_density)
    briefing = generate_briefing(m, metal_density, chokes)

    entry = {
        "id": slug,
        "name": raw_name,
        "dimensions": f"{width}x{height}",
        "wind": {
            "min": wind_min,
            "max": wind_max,
            "avg": wind_avg
        },
        "tidal": tidal,
        "metalDensity": metal_density,
        "chokePoints": chokes,
        "recommendedDoctrines": doctrines,
        "tacticalBriefing": briefing,
        "author": author,
        "playerCount": player_count,
        "terrains": terrains,
        "minimapUrl": minimap
    }
    other_maps.append(entry)

other_maps.sort(key=lambda x: x["name"].lower())
all_maps = processed_maps + other_maps
print(f"Total processed maps: {len(all_maps)}")

# Now generate src/lib/map-data.ts
output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "lib", "map-data.ts")

ts_code = '''export interface MapData {
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
  author?: string;
  playerCount?: number;
  terrains?: string[];
  minimapUrl?: string;
}

export const MAP_DATABASE: MapData[] = ''' + json.dumps(all_maps, indent=2) + ''';

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
'''

with open(output_path, "w", encoding="utf-8") as f:
    f.write(ts_code)

print(f"Successfully generated {output_path} with {len(all_maps)} maps!")
