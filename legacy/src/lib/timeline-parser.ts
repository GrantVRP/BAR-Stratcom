import { type Faction, getScrapedUnit } from './game-data';

export interface ParsedBuildStep {
  id: string;
  raw: string;
  timestamp: string; // e.g. "00:00", "01:24"
  seconds: number; // e.g. 0, 84
  entityBadge: string; // "[CDR]", "[FAC]", "[CON]", "[DEF]", "[ECO]"
  entityType: 'commander' | 'factory' | 'constructor' | 'defense' | 'economy';
  count: string; // e.g. "1x", "2x"
  itemName: string; // e.g. "Solar Collector", "Flash", "Metal Extractor"
  tier?: string; // e.g. "T1", "T2", "T3"
  category?: string; // e.g. "Bots", "Vehicles", "Economy", "Defense", "Factories", "Reclaim"
  unitRole?: string; // e.g. "Fast Raider Bot", "Rocket Skirmisher"
  metalDelta?: string; // e.g. "+2.0 M", "-145 M", "+250 M"
  energyDelta?: string; // e.g. "+20 E", "-1250 E", "-70 E"
  metalCost?: number | null;
  energyCost?: number | null;
  buildTime?: number | null;
  estimatedBuildDuration?: string; // e.g. "~8s (CDR)"
  placementTag?: string; // e.g. "[BASE-INTERIOR]", "[FORWARD-CHOKE-RAMP]"
  priority?: 'CRITICAL' | 'CORE' | 'OPPORTUNISTIC' | 'MICRO';
  hotkey?: string; // e.g. "B -> E -> S", "Right-Click Drag", "ALT + Fight"
  proTip?: string; // Strategic micro tip
  explanation: string; // e.g. "Establishes base power grid to prevent stalling"
  phaseMarker?: string; // Section header
}

// Resource lookup dictionary for rapid delta estimation
const RESOURCE_DELTAS: Record<string, { metal: string; energy: string }> = {
  'solar collector': { metal: '-155 M', energy: '+20 E' },
  'solar': { metal: '-155 M', energy: '+20 E' },
  'advanced solar': { metal: '-350 M', energy: '+80 E' },
  'wind turbine': { metal: '-40 M', energy: '+14 E' },
  'wind generator': { metal: '-40 M', energy: '+14 E' },
  'turbine': { metal: '-40 M', energy: '+14 E' },
  'wind': { metal: '-40 M', energy: '+14 E' },
  'fusion reactor': { metal: '-3350 M', energy: '+750 E' },
  'fusion': { metal: '-3350 M', energy: '+750 E' },
  'advanced fusion': { metal: '-9700 M', energy: '+3000 E' },
  'afus': { metal: '-9700 M', energy: '+3000 E' },
  'metal extractor': { metal: '-50 M', energy: '-3 E' },
  'mex': { metal: '-50 M', energy: '-3 E' },
  'energy converter': { metal: '-1 M', energy: '-70 E' },
  'advanced energy converter': { metal: '-380 M', energy: '-3600 E' },
  'energy storage': { metal: '-170 M', energy: '+1000 E' },
  'metal storage': { metal: '-330 M', energy: '+0 E' },
  'vehicle plant': { metal: '-590 M', energy: '-1550 E' },
  'vplant': { metal: '-590 M', energy: '-1550 E' },
  'vehicle factory': { metal: '-590 M', energy: '-1550 E' },
  'bot lab': { metal: '-500 M', energy: '-950 E' },
  'botlab': { metal: '-500 M', energy: '-950 E' },
  'aircraft plant': { metal: '-650 M', energy: '-1100 E' },
  'aircraftplant': { metal: '-650 M', energy: '-1100 E' },
  'air plant': { metal: '-650 M', energy: '-1100 E' },
  'airplant': { metal: '-650 M', energy: '-1100 E' },
  'shipyard': { metal: '-450 M', energy: '-950 E' },
  'light laser tower': { metal: '-85 M', energy: '-680 E' },
  'llt': { metal: '-85 M', energy: '-680 E' },
  'flash': { metal: '-110 M', energy: '-900 E' },
  'stump': { metal: '-225 M', energy: '-2100 E' },
  'blitz': { metal: '-110 M', energy: '-900 E' },
  'raider': { metal: '-235 M', energy: '-2400 E' },
  'paw': { metal: '-54 M', energy: '-900 E' },
  'pawn': { metal: '-54 M', energy: '-900 E' },
  'grunt': { metal: '-43 M', energy: '-820 E' },
  'rocko': { metal: '-120 M', energy: '-1000 E' },
  'storm': { metal: '-110 M', energy: '-1150 E' },
  'hammer': { metal: '-130 M', energy: '-1300 E' },
  'thug': { metal: '-140 M', energy: '-1150 E' },
  'pyros': { metal: '-200 M', energy: '-3000 E' },
  'pyro': { metal: '-200 M', energy: '-3000 E' },
  'samson': { metal: '-150 M', energy: '-2100 E' },
  'slasher': { metal: '-170 M', energy: '-2300 E' },
  'wolverine': { metal: '-170 M', energy: '-2500 E' },
  'leveler': { metal: '-220 M', energy: '-2600 E' },
  'lazarus': { metal: '-130 M', energy: '-1400 E' },
  'necro': { metal: '-130 M', energy: '-1400 E' },
  'construction vehicle': { metal: '-135 M', energy: '-1950 E' },
  'construction bot': { metal: '-110 M', energy: '-1600 E' },
  'construction aircraft': { metal: '-140 M', energy: '-2200 E' },
  'construction ship': { metal: '-150 M', energy: '-2400 E' },
  'beaver': { metal: '-150 M', energy: '-3100 E' },
  'reclaim': { metal: '+250 M', energy: '+0 E' },
  'roach': { metal: '-69 M', energy: '-5800 E' },
  'bedbug': { metal: '-69 M', energy: '-5800 E' },
  'tick': { metal: '-21 M', energy: '-300 E' },
  'sparrow': { metal: '-52 M', energy: '-1550 E' },
  'finch': { metal: '-45 M', energy: '-1400 E' },
  'brawler': { metal: '-310 M', energy: '-6200 E' },
  'rapier': { metal: '-330 M', energy: '-6400 E' },
  'freedom fighter': { metal: '-73 M', energy: '-2900 E' },
  'valiant': { metal: '-73 M', energy: '-2900 E' },
  'avenger': { metal: '-73 M', energy: '-2800 E' },
  'valkyrie': { metal: '-74 M', energy: '-1450 E' },
  'atlas': { metal: '-68 M', energy: '-1300 E' },
  'bulldog': { metal: '-950 M', energy: '-13000 E' },
  'bull': { metal: '-950 M', energy: '-13000 E' },
  'tiger': { metal: '-850 M', energy: '-12000 E' },
  'tremor': { metal: '-1200 M', energy: '-16500 E' },
  'can': { metal: '-560 M', energy: '-9300 E' },
  'the can': { metal: '-560 M', energy: '-9300 E' },
  'sumo': { metal: '-2200 M', energy: '-35000 E' },
  'crasher': { metal: '-125 M', energy: '-1100 E' },
  'jethro': { metal: '-125 M', energy: '-1100 E' },
  'hound': { metal: '-320 M', energy: '-4200 E' },
  'sheldon': { metal: '-320 M', energy: '-4400 E' },
  'sharpshooter': { metal: '-480 M', energy: '-8900 E' },
  'penetrator': { metal: '-1100 M', energy: '-18000 E' },
  'welder': { metal: '-340 M', energy: '-4800 E' },
  'skuttle': { metal: '-260 M', energy: '-9000 E' },
  'graverobber': { metal: '-140 M', energy: '-1600 E' },
  'commando': { metal: '-480 M', energy: '-7200 E' },
  'epoch': { metal: '-5500 M', energy: '-52000 E' },
  'black hydra': { metal: '-5200 M', energy: '-48000 E' },
  'paladin': { metal: '-1500 M', energy: '-13000 E' },
  'buccaneer': { metal: '-1400 M', energy: '-12000 E' },
  'kraken': { metal: '-2100 M', energy: '-18000 E' },
  'serpent': { metal: '-1800 M', energy: '-15000 E' },
  'corsair': { metal: '-580 M', energy: '-5100 E' },
  'oppressor': { metal: '-560 M', energy: '-4800 E' },
  'dolphin': { metal: '-150 M', energy: '-1200 E' },
  'supporter': { metal: '-140 M', energy: '-1100 E' },
  'eel': { metal: '-320 M', energy: '-2900 E' },
  'orca': { metal: '-310 M', energy: '-2800 E' },
  'death cavalry': { metal: '-380 M', energy: '-4200 E' },
  'banshee': { metal: '-420 M', energy: '-8500 E' },
  'titan': { metal: '-1100 M', energy: '-16000 E' },
  'whirlwind': { metal: '-460 M', energy: '-9000 E' },
  'hurricane': { metal: '-480 M', energy: '-9200 E' },
  'advanced metal extractor': { metal: '-580 M', energy: '-4800 E' },
  'construction turret': { metal: '-210 M', energy: '-3200 E' },
  'nanotower': { metal: '-210 M', energy: '-3200 E' },
  'advanced bot lab': { metal: '-2400 M', energy: '-18000 E' },
  'advanced vehicle plant': { metal: '-2800 M', energy: '-22000 E' },
  'advanced aircraft plant': { metal: '-2900 M', energy: '-24000 E' },
  'advanced shipyard': { metal: '-2600 M', energy: '-20000 E' },
  'advanced construction bot': { metal: '-420 M', energy: '-6800 E' },
  'advanced construction vehicle': { metal: '-490 M', energy: '-7500 E' },
  'advanced construction aircraft': { metal: '-340 M', energy: '-12000 E' },
  'advanced construction ship': { metal: '-440 M', energy: '-7200 E' },
  'radar tower': { metal: '-60 M', energy: '-800 E' },
};

/**
 * Normalizes minutes and seconds into a 00:00 format
 */
function normalizeTimestamp(rawTime: string, index: number): string {
  if (!rawTime) {
    const mins = Math.floor((index * 25) / 60);
    const secs = (index * 25) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  const clean = rawTime.replace(/[[\]()]/g, '').trim();
  const parts = clean.split(':');
  if (parts.length === 2) {
    const min = parts[0].padStart(2, '0');
    const sec = parts[1].padStart(2, '0');
    return `${min}:${sec}`;
  }
  return clean;
}

/**
 * Parses an individual build step string from the LLM or rules engine
 * into an authoritative, structured Gantt-style timeline step.
 */
export function parseBuildStep(rawStep: string, index: number, _faction: Faction): ParsedBuildStep {
  if (!rawStep) {
    return {
      id: `step-${index}`,
      raw: '',
      timestamp: '00:00',
      seconds: 0,
      entityBadge: '[CDR]',
      entityType: 'commander',
      count: '1x',
      itemName: 'Queue Action',
      explanation: 'Action queued',
    };
  }

  let text = rawStep.trim();

  // 1. Extract Timestamp
  let timestamp = '';
  const timeMatch = text.match(/^\[?(\d{1,2}:\d{2})\]?\s*/);
  if (timeMatch) {
    timestamp = normalizeTimestamp(timeMatch[1], index);
    text = text.substring(timeMatch[0].length).trim();
  } else {
    timestamp = normalizeTimestamp('', index);
  }

  // 2. Extract Entity Type
  let entityBadge = '[CDR]';
  let entityType: ParsedBuildStep['entityType'] = 'commander';

  const entityMatch = text.match(/^([\w\s]+?):\s*/);
  if (entityMatch) {
    const actor = entityMatch[1].toLowerCase();
    text = text.substring(entityMatch[0].length).trim();

    if (actor.includes('commander') || actor.includes('cdr')) {
      entityBadge = '[CDR]';
      entityType = 'commander';
    } else if (
      actor.includes('factory') ||
      actor.includes('lab') ||
      actor.includes('plant') ||
      actor.includes('shipyard')
    ) {
      entityBadge = '[FAC]';
      entityType = 'factory';
    } else if (actor.includes('con') || actor.includes('constructor') || actor.includes('lazarus')) {
      entityBadge = '[CON]';
      entityType = 'constructor';
    } else if (actor.includes('tower') || actor.includes('defense') || actor.includes('llt')) {
      entityBadge = '[DEF]';
      entityType = 'defense';
    } else if (actor.includes('eco') || actor.includes('grid')) {
      entityBadge = '[ECO]';
      entityType = 'economy';
    } else if (
      actor.includes('strike') ||
      actor.includes('group') ||
      actor.includes('spearhead') ||
      actor.includes('column') ||
      actor.includes('fleet') ||
      actor.includes('aerial') ||
      actor.includes('citadel') ||
      actor.includes('apex') ||
      actor.includes('choke')
    ) {
      entityBadge = '[STK]';
      entityType = 'factory';
    } else {
      entityBadge = `[${actor.slice(0, 3).toUpperCase()}]`;
      entityType = 'factory';
    }
  } else {
    // Infer from action keywords
    const lower = text.toLowerCase();
    if (lower.includes('reclaim')) {
      entityBadge = '[CDR]';
      entityType = 'commander';
    } else if (lower.includes('lab') || lower.includes('factory') || lower.includes('plant')) {
      entityBadge = '[CDR]';
      entityType = 'commander';
    } else if (lower.includes('queue') || lower.includes('produce')) {
      entityBadge = '[FAC]';
      entityType = 'factory';
    }
  }

  // 3. Extract Parenthetical Explanations FIRST (so numbers like (+260 instant metal surge) aren't caught as unit count)
  let explanation = '';
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    explanation = parenMatch[1].trim();
    text = text.replace(/\([^)]+\)/g, '').trim();
  }

  // Check if step is a reclaim or salvage action
  const isReclaim =
    /reclaim|salvage/i.test(rawStep) ||
    /reclaim|salvage/i.test(text);

  // 4. Extract Count (e.g. 1x, 2x, 4-6x)
  let count = '1x';
  if (!isReclaim) {
    const countMatch = text.match(/(?:(?:queue|build|construct|deploy|produce)\s+)?(\d+(?:-\d+)?x?)\s+/i);
    if (countMatch) {
      count = countMatch[1].endsWith('x') ? countMatch[1] : `${countMatch[1]}x`;
    }
  }

  // 5. Clean up Item Name
  let cleanItem = '';
  if (isReclaim) {
    if (/rock|boulder|spawn/i.test(rawStep) || /rock|boulder|spawn/i.test(text)) {
      cleanItem = 'Natural Rock Boulder Field';
      if (!explanation) explanation = 'Reclaims spawn rock clusters for instant +250M surge into queue';
    } else if (/solar/i.test(rawStep) || /solar/i.test(text)) {
      cleanItem = 'Obsolete Solar Collector';
      if (!explanation) explanation = 'Reclaims initial solar collectors for 100% metal refund into T2 transition';
    } else if (/wreck|wreckage|scrap/i.test(rawStep) || /wreck|wreckage|scrap/i.test(text)) {
      cleanItem = 'Battlefield Wreckage';
      if (!explanation) explanation = 'Scavenges destroyed units for raw metal refund';
    } else {
      cleanItem = 'Field Mass Salvage';
      if (!explanation) explanation = 'Reclaims local terrain features for strategic resource surge';
    }
  } else {
    // Strip action verbs, movement directions, and complex prefixes
    cleanItem = text
      .replace(/^(?:queue|construct|build|deploy|produce|set|order|advance to forward choke and build|advance to forward choke and establish|advance to choke point and establish|advance to choke point and build|advance to|continuous queue of|continuous production of)\s+/i, '')
      .replace(/^\d+(?:-\d+)?x?\s+/i, '')
      .trim();

    // If step is an upgrade command, extract target unit
    if (/^upgrade/i.test(cleanItem)) {
      const targetUnitMatch = cleanItem.match(/to\s+([A-Za-z0-9\s]+?)(?:\s*\(|$)/i);
      if (targetUnitMatch) {
        cleanItem = targetUnitMatch[1].trim();
      }
    }

    // If compound step with multiple units separated by "+", pick the primary unit
    if (cleanItem.includes('+')) {
      cleanItem = cleanItem.split('+')[0].trim();
    }

    // If there's an "on ...", "for ...", "to ...", "at ...", "set to ...", extract secondary text if explanation was empty
    const trailingReasonMatch = cleanItem.match(/\s+(on|for|to|at|against|into|angled|oriented|set to|set)\s+(.*)$/i);
    if (trailingReasonMatch && !/advanced|moho|t2/i.test(trailingReasonMatch[2])) {
      if (!explanation) {
        explanation = `${trailingReasonMatch[1]} ${trailingReasonMatch[2]}`.trim();
      }
      cleanItem = cleanItem.substring(0, trailingReasonMatch.index).trim();
    }
  }

  // Cross-reference with our comprehensive 377-asset BAR database (Scavengers excluded)
  const matchedUnit = !isReclaim ? (getScrapedUnit(cleanItem, _faction) || getScrapedUnit(text, _faction)) : null;
  if (matchedUnit) {
    const targetMatch = cleanItem || text;
    const lowerTarget = targetMatch.toLowerCase();
    if (/\bt2 bot lab\b/i.test(targetMatch) || /\badvanced bot lab\b/i.test(targetMatch)) cleanItem = 'Advanced Bot Lab';
    else if (/\bt2 vehicle plant\b/i.test(targetMatch) || /\badvanced vehicle plant\b/i.test(targetMatch)) cleanItem = 'Advanced Vehicle Plant';
    else if (/\bt2 aircraft plant\b/i.test(targetMatch) || /\badvanced aircraft plant\b/i.test(targetMatch)) cleanItem = 'Advanced Aircraft Plant';
    else if (/\bt2 shipyard\b/i.test(targetMatch) || /\badvanced shipyard\b/i.test(targetMatch)) cleanItem = 'Advanced Shipyard';
    else if (/\badvanced construction bot\b/i.test(targetMatch) || /\bt2 con bot\b/i.test(targetMatch)) cleanItem = 'Advanced Construction Bot';
    else if (/\badvanced construction vehicle\b/i.test(targetMatch) || /\bt2 con vehicle\b/i.test(targetMatch)) cleanItem = 'Advanced Construction Vehicle';
    else if (/\badvanced construction aircraft\b/i.test(targetMatch) || /\bt2 con air\b/i.test(targetMatch)) cleanItem = 'Advanced Construction Aircraft';
    else if (/\badvanced construction ship\b/i.test(targetMatch) || /\bt2 con ship\b/i.test(targetMatch)) cleanItem = 'Advanced Construction Ship';
    else if (/\bconstruction bot\b/i.test(targetMatch)) cleanItem = 'Construction Bot';
    else if (/\bconstruction vehicle\b/i.test(targetMatch)) cleanItem = 'Construction Vehicle';
    else if (/\bconstruction aircraft\b/i.test(targetMatch)) cleanItem = 'Construction Aircraft';
    else if (/\bconstruction ship\b/i.test(targetMatch)) cleanItem = 'Construction Ship';
    else if (/\bconstruction turret\b/i.test(targetMatch) || /\bnanotower\b/i.test(targetMatch) || /\bnano turret\b/i.test(targetMatch)) cleanItem = 'Construction Turret';
    else if (/\bmoho\b/i.test(targetMatch) || /\badvanced metal extractor\b/i.test(targetMatch)) cleanItem = 'Advanced Metal Extractor';
    else if (/\badvanced fusion\b/i.test(targetMatch) || /\bafus\b/i.test(targetMatch)) cleanItem = 'Advanced Fusion Reactor';
    else if (/\bfusion reactor\b/i.test(targetMatch) || /\bfusion\b/i.test(targetMatch)) cleanItem = 'Fusion Reactor';
    else if (/\badvanced solar\b/i.test(targetMatch)) cleanItem = 'Advanced Solar Generator';
    else if (/\bradar tower\b/i.test(targetMatch) || /\bradar\b/i.test(targetMatch)) cleanItem = 'Radar Tower';
    else if (/\benergy converter\b/i.test(targetMatch)) cleanItem = 'Energy Converter';
    else if (/\benergy storage\b/i.test(targetMatch)) cleanItem = 'Energy Storage';
    else if (/\bhound\b/i.test(targetMatch)) cleanItem = 'Hound';
    else if (/\bsharpshooter\b/i.test(targetMatch)) cleanItem = 'Sharpshooter';
    else if (/\bpenetrator\b/i.test(targetMatch)) cleanItem = 'Penetrator';
    else if (/\bwelder\b/i.test(targetMatch)) cleanItem = 'Welder';
    else if (/\bsheldon\b/i.test(targetMatch)) cleanItem = 'Sheldon';
    else if (/\btiger\b/i.test(targetMatch)) cleanItem = 'Tiger';
    else if (/\bbulldog\b/i.test(targetMatch) || /\bbull\b/i.test(targetMatch)) cleanItem = 'Bull';
    else if (/\bepoch\b/i.test(targetMatch)) cleanItem = 'Epoch';
    else if (/\bblack hydra\b/i.test(targetMatch)) cleanItem = 'Black Hydra';
    else if (/\bpaladin\b/i.test(targetMatch)) cleanItem = 'Paladin';
    else if (/\bbuccaneer\b/i.test(targetMatch)) cleanItem = 'Buccaneer';
    else if (/\bserpent\b/i.test(targetMatch)) cleanItem = 'Serpent';
    else if (/\bkraken\b/i.test(targetMatch)) cleanItem = 'Kraken';
    else if (/\bcorsair\b/i.test(targetMatch)) cleanItem = 'Corsair';
    else if (/\boppressor\b/i.test(targetMatch)) cleanItem = 'Oppressor';
    else if (/\bdolphin\b/i.test(targetMatch)) cleanItem = 'Dolphin';
    else if (/\bsupporter\b/i.test(targetMatch)) cleanItem = 'Supporter';
    else if (/\beel\b/i.test(targetMatch)) cleanItem = 'Eel';
    else if (/\borca\b/i.test(targetMatch)) cleanItem = 'Orca';
    else if (/\bgrim reaper\b/i.test(targetMatch)) cleanItem = 'Grim Reaper';
    else if (/\bdeath cavalry\b/i.test(targetMatch)) cleanItem = 'Death Cavalry';
    else if (/\bbanshee\b/i.test(targetMatch)) cleanItem = 'Banshee';
    else if (/\bwhirlwind\b/i.test(targetMatch)) cleanItem = 'Whirlwind';
    else if (/\brocko\b/i.test(targetMatch)) cleanItem = 'Rocko';
    else if (/\bhammer\b/i.test(targetMatch)) cleanItem = 'Hammer';
    else if (/\bpawns?\b/i.test(targetMatch)) cleanItem = 'Pawn';
    else if (lowerTarget.includes('light laser tower') || /\bllt\b/i.test(targetMatch)) cleanItem = 'Light Laser Tower';
    else if (/\bstorm\b/i.test(targetMatch)) cleanItem = 'Storm';
    else if (/\bthug\b/i.test(targetMatch)) cleanItem = 'Thug';
    else if (/\blazarus\b/i.test(targetMatch)) cleanItem = 'Lazarus';
    else if (lowerTarget.includes('solar')) cleanItem = 'Solar Collector';
    else if (lowerTarget.includes('wind') || lowerTarget.includes('turbine')) cleanItem = 'Wind Turbine';
    else if (lowerTarget.includes('metal extractor') || /\bmex\b/i.test(targetMatch)) cleanItem = 'Metal Extractor';
    else if (lowerTarget.includes('bot lab') || lowerTarget.includes('botlab')) cleanItem = 'Bot Lab';
    else if (lowerTarget.includes('vehicle plant') || lowerTarget.includes('vplant')) cleanItem = 'Vehicle Plant';
    else if (lowerTarget.includes('aircraft plant') || lowerTarget.includes('airplant')) cleanItem = 'Aircraft Plant';
    else if (lowerTarget.includes('shipyard')) cleanItem = 'Shipyard';
    else if (/\batlas\b/i.test(targetMatch)) cleanItem = 'Atlas';
    else if (/\bvalkyrie\b/i.test(targetMatch)) cleanItem = 'Valkyrie';
    else if (/\bsparrow\b/i.test(targetMatch)) cleanItem = 'Sparrow';
    else if (/\bbrawler\b/i.test(targetMatch)) cleanItem = 'Brawler';
    else if (lowerTarget.includes('freedom fighter')) cleanItem = 'Freedom Fighter';
    else if (/\bshadow\b/i.test(targetMatch)) cleanItem = 'Shadow';
    else if (/\bavenger\b/i.test(targetMatch)) cleanItem = 'Avenger';
    else if (/\bblitz\b/i.test(targetMatch)) cleanItem = 'Blitz';
    else if (/\bflash\b/i.test(targetMatch)) cleanItem = 'Flash';
    else if (/\braider\b/i.test(targetMatch)) cleanItem = 'Raider';
    else if (/\bstump\b/i.test(targetMatch)) cleanItem = 'Stump';
    else if (/\bsamson\b/i.test(targetMatch)) cleanItem = 'Samson';
    else if (/\bwolverine\b/i.test(targetMatch)) cleanItem = 'Wolverine';
    else if (/\bleveler\b/i.test(targetMatch)) cleanItem = 'Leveler';
    else if (/\bslasher\b/i.test(targetMatch)) cleanItem = 'Slasher';
    else if (/\bpyros?\b/i.test(targetMatch)) cleanItem = 'Pyros';
    else if (/\bnecro\b/i.test(targetMatch)) cleanItem = 'Necro';
    else if (/\bcrasher\b/i.test(targetMatch)) cleanItem = 'Crasher';
    else if (/\broach\b/i.test(targetMatch)) cleanItem = 'Roach';
    else if (/\bbedbug\b/i.test(targetMatch)) cleanItem = 'Bedbug';
    else if (/\bskuttle\b/i.test(targetMatch)) cleanItem = 'Skuttle';
    else if (/\bcommando\b/i.test(targetMatch)) cleanItem = 'Commando';
    else if (/\bgraverobber\b/i.test(targetMatch)) cleanItem = 'Graverobber';
    else if (/\btremor\b/i.test(targetMatch)) cleanItem = 'Tremor';
    else if (/\bsumo\b/i.test(targetMatch)) cleanItem = 'Sumo';
    else if (/\bthe can\b/i.test(targetMatch) || /\bcan\b/i.test(targetMatch)) cleanItem = 'The Can';
    else if (/\bvaliant\b/i.test(targetMatch)) cleanItem = 'Valiant';
    else if (/\brapier\b/i.test(targetMatch)) cleanItem = 'Rapier';
    else if (/\bfinch\b/i.test(targetMatch)) cleanItem = 'Finch';
    else if (/\bhurricane\b/i.test(targetMatch)) cleanItem = 'Hurricane';
    else if (/\btitan\b/i.test(targetMatch)) cleanItem = 'Titan';
    else if (/\btumbleweed\b/i.test(targetMatch)) cleanItem = 'Tumbleweed';
    else cleanItem = matchedUnit.name;
  }

  // Capitalize properly
  if (!cleanItem || cleanItem.length < 2) {
    cleanItem = text || 'Strategic Unit';
  }

  // Check database for canonical item name & accurate costs
  const lowerItem = cleanItem.toLowerCase();
  const lowerRaw = rawStep.toLowerCase();
  let metalDelta = '-100 M';
  let energyDelta = '-1000 E';

  // 1. If step is a reclaim or salvage action
  if (lowerRaw.includes('reclaim') || lowerItem.includes('reclaim') || lowerRaw.includes('salvage')) {
    const mMatch = rawStep.match(/\+(\d+(?:\.\d+)?)\s*(?:m|metal)/i);
    metalDelta = mMatch ? `+${mMatch[1]} M` : '+250 M';
    energyDelta = '+0 E';
  } else if (matchedUnit && matchedUnit.metal !== undefined && matchedUnit.energy !== undefined) {
    // 2. Exact match in scraped Beyond All Reason unit database
    if (lowerItem.includes('solar collector') || lowerItem === 'solar') {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '+20 E';
    } else if (lowerItem.includes('advanced solar')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '+80 E';
    } else if (lowerItem.includes('wind') || lowerItem.includes('turbine')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '+14 E';
    } else if (lowerItem.includes('metal extractor') || lowerItem.includes('mex')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '-3 E';
    } else if (lowerItem.includes('advanced fusion') || lowerItem.includes('afus')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '+3000 E';
    } else if (lowerItem.includes('fusion')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = _faction === 'Cortex' ? '+850 E' : '+750 E';
    } else if (lowerItem.includes('energy storage')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '+1000 E';
    } else if (lowerItem.includes('energy converter')) {
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = '-70 E';
    } else {
      // Standard units, factories, defenses, etc.
      metalDelta = `-${matchedUnit.metal} M`;
      energyDelta = `-${matchedUnit.energy} E`;
    }
  } else {
    // 3. Fallback to dictionary
    for (const [key, delta] of Object.entries(RESOURCE_DELTAS)) {
      if (lowerItem.includes(key)) {
        metalDelta = delta.metal;
        energyDelta = delta.energy;
        break;
      }
    }
  }

  // If explanation is still empty, synthesize a tactical note
  if (!explanation) {
    if (lowerItem.includes('solar')) explanation = 'Guarantees steady baseline grid generation';
    else if (lowerItem.includes('fusion')) explanation = 'High-yield T2 thermonuclear reactor fueling late-game converter grid';
    else if (lowerItem.includes('mex') || lowerItem.includes('metal extractor')) explanation = 'Expands metal intake to support continuous queues';
    else if (lowerItem.includes('wind') || lowerItem.includes('turbine')) explanation = 'Capitalizes on map wind velocity spikes';
    else if (lowerItem.includes('factory') || lowerItem.includes('lab') || lowerItem.includes('plant')) explanation = 'Primary production facility for mobile vanguard';
    else if (lowerItem.includes('reclaim')) explanation = 'Instantly recycles local mass into army production';
    else if (lowerItem.includes('flash') || lowerItem.includes('blitz') || lowerItem.includes('pawn') || lowerItem.includes('grunt')) explanation = 'High-velocity skirmish unit for flanking and node denial';
    else explanation = 'Tactical deployment phase';
  }

  // Parse numerical seconds for live timer matching
  const timeParts = timestamp.split(':');
  const seconds = timeParts.length === 2 ? parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10) : index * 25;

  // Category determination
  let category = 'Combat Unit';
  if (lowerRaw.includes('reclaim') || lowerItem.includes('reclaim') || lowerRaw.includes('salvage')) {
    category = 'Reclaim';
  } else if (matchedUnit?.category) {
    category = matchedUnit.category;
  } else if (
    lowerItem.includes('solar') ||
    lowerItem.includes('wind') ||
    lowerItem.includes('mex') ||
    lowerItem.includes('metal extractor') ||
    lowerItem.includes('converter') ||
    lowerItem.includes('storage') ||
    lowerItem.includes('fusion') ||
    lowerItem.includes('afus')
  ) {
    category = 'Economy';
  } else if (
    lowerItem.includes('factory') ||
    lowerItem.includes('lab') ||
    lowerItem.includes('plant') ||
    lowerItem.includes('shipyard')
  ) {
    category = 'Factories';
  } else if (lowerItem.includes('tower') || lowerItem.includes('llt') || lowerItem.includes('defense')) {
    category = 'Defense';
  }

  // Unit role
  const unitRole = matchedUnit?.role || (
    category === 'Economy' ? 'Power & Metal Infrastructure' :
    category === 'Factories' ? 'Mobile Production Center' :
    category === 'Defense' ? 'Defensive Battery' :
    category === 'Reclaim' ? 'Field Mass Reclamation' :
    'Tactical Combat Force'
  );

  const tier = matchedUnit?.tier || (
    lowerItem.includes('afus') || lowerItem.includes('advanced') || lowerItem.includes('t2') || lowerItem.includes('lazarus') || lowerItem.includes('necro') ? 'T2' : 'T1'
  );

  // Tactical Placement Tag
  let placementTag = '[TACTICAL-STATION]';
  if (lowerItem.includes('solar')) placementTag = '[BASE-INTERIOR]';
  else if (lowerItem.includes('wind') || lowerItem.includes('turbine')) placementTag = '[SPACED-PERIMETER]';
  else if (lowerItem.includes('mex') || lowerItem.includes('metal extractor')) {
    placementTag = index < 3 ? '[BASE-NATURAL-VEIN]' : '[PERIMETER-EXPANSION]';
  } else if (lowerItem.includes('lab') || lowerItem.includes('plant') || lowerItem.includes('factory')) {
    placementTag = '[DEFENSIBLE-POCKET]';
  } else if (lowerItem.includes('shipyard')) placementTag = '[SHELTERED-COVE]';
  else if (lowerItem.includes('tower') || lowerItem.includes('llt')) placementTag = '[FORWARD-CHOKE-RAMP]';
  else if (lowerItem.includes('reclaim') || lowerRaw.includes('reclaim')) {
    placementTag = lowerRaw.includes('solar') ? '[BASE-RECYCLE-GRID]' : '[NATURAL-BOULDER-FIELD]';
  } else if (lowerItem.includes('flash') || lowerItem.includes('blitz') || lowerItem.includes('pawn') || lowerItem.includes('grunt')) {
    placementTag = '[OUTER-FLANK-LANE]';
  } else if (lowerItem.includes('rocko') || lowerItem.includes('storm') || lowerItem.includes('hammer') || lowerItem.includes('thug')) {
    placementTag = '[ELEVATED-RIDGE]';
  } else if (lowerItem.includes('lazarus') || lowerItem.includes('necro') || lowerItem.includes('reaper')) {
    placementTag = '[SALVAGE-CORRIDOR]';
  } else if (lowerItem.includes('afus') || lowerItem.includes('fusion')) {
    placementTag = '[DEEP-BASE-BACKLINE]';
  } else if (lowerItem.includes('roach') || lowerItem.includes('skuttle') || lowerItem.includes('tumbleweed')) {
    placementTag = '[CONCEALED-TRENCH]';
  } else if (lowerItem.includes('sparrow') || lowerItem.includes('tick') || lowerItem.includes('finch')) {
    placementTag = '[FORWARD-SCOUT-SCREEN]';
  } else if (lowerItem.includes('atlas') || lowerItem.includes('valkyrie')) {
    placementTag = '[FERRY-AIRLIFT-ROUTE]';
  }

  // Priority Level
  let priority: ParsedBuildStep['priority'] = 'CORE';
  if (index === 0 || lowerItem.includes('lab') || lowerItem.includes('plant') || lowerItem.includes('factory') || lowerItem.includes('afus')) {
    priority = 'CRITICAL';
  } else if (lowerItem.includes('flash') || lowerItem.includes('blitz') || lowerItem.includes('roach') || lowerItem.includes('skuttle') || lowerItem.includes('tumbleweed') || lowerItem.includes('atlas') || lowerItem.includes('valkyrie')) {
    priority = 'MICRO';
  } else if (lowerItem.includes('reclaim') || lowerItem.includes('lazarus') || lowerItem.includes('necro')) {
    priority = 'OPPORTUNISTIC';
  }

  // Hotkey / Tournament Pro Command
  let hotkey: string | undefined;
  if (lowerItem.includes('solar')) hotkey = 'B -> E -> S';
  else if (lowerItem.includes('wind')) hotkey = 'B -> E -> W';
  else if (lowerItem.includes('mex') || lowerItem.includes('metal extractor')) hotkey = 'W / Z (Area Mex)';
  else if (lowerItem.includes('tower') || lowerItem.includes('llt')) hotkey = 'B -> D -> L';
  else if (lowerItem.includes('lab') || lowerItem.includes('plant') || lowerItem.includes('factory')) hotkey = 'B -> F';
  else if (lowerItem.includes('reclaim') || lowerRaw.includes('reclaim')) hotkey = 'E (Reclaim)';
  else if (lowerItem.includes('flash') || lowerItem.includes('blitz') || lowerItem.includes('pawn') || lowerItem.includes('grunt')) hotkey = 'Right-Click Drag';
  else if (lowerItem.includes('rocko') || lowerItem.includes('storm') || lowerItem.includes('hammer')) hotkey = 'A / F (Fight-Move)';
  else if (lowerItem.includes('lazarus') || lowerItem.includes('necro')) hotkey = 'ALT + Fight';
  else if (lowerItem.includes('roach') || lowerItem.includes('skuttle') || lowerItem.includes('tumbleweed')) hotkey = 'K (Cloak) / D (Detonate)';
  else if (lowerItem.includes('atlas') || lowerItem.includes('valkyrie')) hotkey = 'F (Ferry Route)';
  else if (lowerItem.includes('afus') || lowerItem.includes('fusion')) hotkey = 'B -> E -> F';
  else if (lowerItem.includes('converter')) hotkey = 'B -> E -> C';
  else if (lowerItem.includes('samson') || lowerItem.includes('slasher') || lowerItem.includes('jethro')) hotkey = 'Maneuver Escort';

  // Pro Micro Advice
  let proTip: string | undefined;
  if (lowerItem.includes('solar')) {
    proTip = 'Space 3-4 tiles apart to avoid chain explosions. Reclaim at 03:30 for 100% metal refund into T2.';
  } else if (lowerItem.includes('wind')) {
    proTip = 'Deploy in spaced pairs. If map wind falls below 6, place a Solar Collector to prevent power brownouts.';
  } else if (lowerItem.includes('mex') || lowerItem.includes('metal extractor')) {
    proTip = 'Queue with area drag; never stall factory buildpower for distant perimeter nodes.';
  } else if (lowerItem.includes('lab') || lowerItem.includes('plant') || lowerItem.includes('factory')) {
    proTip = 'Ensure +60E is online before dropping factory to avoid cutting Commander build power.';
  } else if (lowerItem.includes('tower') || lowerItem.includes('llt')) {
    proTip = 'Anchor on high choke ramp. Outranges raiders (400 range) to halt counter-swarms.';
  } else if (lowerItem.includes('flash') || lowerItem.includes('blitz') || lowerItem.includes('pawn') || lowerItem.includes('grunt')) {
    proTip = 'Line-drag into enemy rear (+100% to +150% flank damage). Do not dive Commander D-Gun.';
  } else if (lowerItem.includes('rocko') || lowerItem.includes('storm') || lowerItem.includes('hammer')) {
    proTip = 'Outranges LLTs (420 vs 400). Pair with forward radar scout for 100% artillery accuracy.';
  } else if (lowerItem.includes('lazarus') || lowerItem.includes('necro')) {
    proTip = 'Recovers 100% metal, reanimates wrecks for 0 metal and 50% energy, cancels death explosions.';
  } else if (lowerItem.includes('reclaim') || lowerRaw.includes('reclaim')) {
    proTip = lowerRaw.includes('solar')
      ? 'Recovers 100% of the 155 metal cost per solar to slingshot directly into T2.'
      : 'Siphons spawn rocks (+250M+) to fuel continuous production queues without stalling.';
  } else if (lowerItem.includes('roach') || lowerItem.includes('skuttle') || lowerItem.includes('tumbleweed')) {
    proTip = 'Amphibious crawl through water/trenches; manual detonate on Commander or AFUS.';
  } else if (lowerItem.includes('atlas') || lowerItem.includes('valkyrie')) {
    proTip = 'Set pickup and drop beacons with F key; airlifts slow heavy fortresses over mountains.';
  } else if (lowerItem.includes('afus') || lowerItem.includes('fusion')) {
    proTip = 'Space 6+ tiles from base core. Powers 4+ Advanced Converters (+25M/s overflow to allies).';
  }

  // Estimated build duration
  let estimatedBuildDuration: string | undefined;
  if (matchedUnit?.buildTime) {
    if (entityType === 'commander') {
      const s = Math.max(1, Math.round(matchedUnit.buildTime / 300));
      estimatedBuildDuration = `~${s}s (CDR BP)`;
    } else if (entityType === 'constructor') {
      const s = Math.max(1, Math.round(matchedUnit.buildTime / 75));
      estimatedBuildDuration = `~${s}s (Con BP)`;
    } else if (entityType === 'factory') {
      const s = Math.max(1, Math.round(matchedUnit.buildTime / 150));
      estimatedBuildDuration = `~${s}s (Fac BP)`;
    }
  }

  return {
    id: `step-${index}-${timestamp.replace(':', '')}`,
    raw: rawStep,
    timestamp,
    seconds,
    entityBadge,
    entityType,
    count,
    itemName: cleanItem,
    tier,
    category,
    unitRole,
    metalDelta,
    energyDelta,
    metalCost: matchedUnit?.metal,
    energyCost: matchedUnit?.energy,
    buildTime: matchedUnit?.buildTime,
    estimatedBuildDuration,
    placementTag,
    priority,
    hotkey,
    proTip,
    explanation,
  };
}

/**
 * Adds strategic phase transition banners to steps based on timing and milestones
 * (No-op: returns steps as-is without phase markers)
 */
export function attachPhaseMarkers(steps: ParsedBuildStep[]): ParsedBuildStep[] {
  return steps;
}
