import { type Faction, getScrapedUnit } from './game-data';

export interface ParsedBuildStep {
  id: string;
  raw: string;
  timestamp: string; // e.g. "00:00", "01:24"
  entityBadge: string; // "[CDR]", "[FAC]", "[CON]", "[DEF]", "[ECO]"
  entityType: 'commander' | 'factory' | 'constructor' | 'defense' | 'economy';
  count: string; // e.g. "1x", "2x"
  itemName: string; // e.g. "Solar Collector", "Flash", "Metal Extractor"
  metalDelta?: string; // e.g. "+2.0 M", "-145 M", "+250 M"
  energyDelta?: string; // e.g. "+20 E", "-1250 E", "-70 E"
  explanation: string; // e.g. "Establishes base power grid to prevent stalling before factory deployment"
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
  'beaver': { metal: '-150 M', energy: '-3100 E' },
  'reclaim': { metal: '+250 M', energy: '+0 E' },
  'roach': { metal: '-69 M', energy: '-5800 E' },
  'tick': { metal: '-21 M', energy: '-300 E' },
  'sparrow': { metal: '-52 M', energy: '-1550 E' },
  'brawler': { metal: '-310 M', energy: '-6200 E' },
  'freedom fighter': { metal: '-73 M', energy: '-2900 E' },
  'avenger': { metal: '-73 M', energy: '-2800 E' },
  'valkyrie': { metal: '-74 M', energy: '-1450 E' },
  'atlas': { metal: '-68 M', energy: '-1300 E' },
  'bulldog': { metal: '-950 M', energy: '-13000 E' },
  'can': { metal: '-560 M', energy: '-9300 E' },
  'sumo': { metal: '-2200 M', energy: '-35000 E' },
  'crasher': { metal: '-125 M', energy: '-1100 E' },
  'jethro': { metal: '-125 M', energy: '-1100 E' },
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
    } else {
      entityBadge = `[${actor.slice(0, 3).toUpperCase()}]`;
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

  // 3. Extract Count (e.g. 1x, 2x, 4-6x)
  let count = '1x';
  const countMatch = text.match(/(?:(?:queue|build|construct|deploy|produce)\s+)?(\d+(?:-\d+)?x?)\s+/i);
  if (countMatch) {
    count = countMatch[1].endsWith('x') ? countMatch[1] : `${countMatch[1]}x`;
  }

  // 4. Extract Parenthetical Explanations
  let explanation = '';
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    explanation = parenMatch[1].trim();
    text = text.replace(/\([^)]+\)/g, '').trim();
  }

  // 5. Clean up Item Name
  // Strip action verbs, movement directions, and complex prefixes
  let cleanItem = text
    .replace(/^(?:queue|construct|build|deploy|produce|set|order|advance to forward choke and build|advance to forward choke and establish|advance to choke point and establish|advance to choke point and build|advance to|continuous queue of|continuous production of)\s+/i, '')
    .replace(/^\d+(?:-\d+)?x?\s+/i, '')
    .trim();

  // If compound step with multiple units separated by "+", pick the primary unit
  if (cleanItem.includes('+')) {
    cleanItem = cleanItem.split('+')[0].trim();
  }

  // If there's an "on ...", "for ...", "to ...", "at ...", "set to ...", extract secondary text if explanation was empty
  const trailingReasonMatch = cleanItem.match(/\s+(on|for|to|at|against|into|angled|oriented|set to|set)\s+(.*)$/i);
  if (trailingReasonMatch) {
    if (!explanation) {
      explanation = `${trailingReasonMatch[1]} ${trailingReasonMatch[2]}`.trim();
    }
    cleanItem = cleanItem.substring(0, trailingReasonMatch.index).trim();
  }

  // Cross-reference with our comprehensive 377-asset BAR database (Scavengers excluded)
  const matchedUnit = getScrapedUnit(cleanItem, _faction) || getScrapedUnit(text, _faction);
  if (matchedUnit) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('rocko')) cleanItem = 'Rocko';
    else if (lowerText.includes('hammer')) cleanItem = 'Hammer';
    else if (lowerText.includes('paw')) cleanItem = 'Pawn';
    else if (lowerText.includes('light laser tower') || lowerText.includes('llt')) cleanItem = 'Light Laser Tower';
    else if (lowerText.includes('storm')) cleanItem = 'Storm';
    else if (lowerText.includes('thug')) cleanItem = 'Thug';
    else if (lowerText.includes('lazarus')) cleanItem = 'Lazarus';
    else if (lowerText.includes('solar')) cleanItem = 'Solar Collector';
    else if (lowerText.includes('wind') || lowerText.includes('turbine')) cleanItem = 'Wind Turbine';
    else if (lowerText.includes('metal extractor') || lowerText.includes('mex')) cleanItem = 'Metal Extractor';
    else if (lowerText.includes('bot lab') || lowerText.includes('botlab')) cleanItem = 'Bot Lab';
    else if (lowerText.includes('vehicle plant') || lowerText.includes('vplant')) cleanItem = 'Vehicle Plant';
    else if (lowerText.includes('aircraft plant') || lowerText.includes('airplant')) cleanItem = 'Aircraft Plant';
    else if (lowerText.includes('atlas')) cleanItem = 'Atlas';
    else if (lowerText.includes('valkyrie')) cleanItem = 'Valkyrie';
    else if (lowerText.includes('sparrow')) cleanItem = 'Sparrow';
    else if (lowerText.includes('brawler')) cleanItem = 'Brawler';
    else if (lowerText.includes('freedom fighter')) cleanItem = 'Freedom Fighter';
    else if (lowerText.includes('shadow')) cleanItem = 'Shadow';
    else if (lowerText.includes('avenger')) cleanItem = 'Avenger';
    else if (lowerText.includes('bulldog')) cleanItem = 'Bulldog';
    else if (lowerText.includes('blitz')) cleanItem = 'Blitz';
    else if (lowerText.includes('flash')) cleanItem = 'Flash';
    else if (lowerText.includes('raider')) cleanItem = 'Raider';
    else if (lowerText.includes('stump')) cleanItem = 'Stump';
    else if (lowerText.includes('samson')) cleanItem = 'Samson';
    else if (lowerText.includes('wolverine')) cleanItem = 'Wolverine';
    else if (lowerText.includes('leveler')) cleanItem = 'Leveler';
    else if (lowerText.includes('slasher')) cleanItem = 'Slasher';
    else if (lowerText.includes('pyros') || lowerText.includes('pyro')) cleanItem = 'Pyros';
    else if (lowerText.includes('necro')) cleanItem = 'Necro';
    else if (lowerText.includes('crasher')) cleanItem = 'Crasher';
    else if (lowerText.includes('roach')) cleanItem = 'Roach';
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
    else if (lowerItem.includes('flash') || lowerItem.includes('blitz') || lowerItem.includes('paw') || lowerItem.includes('grunt')) explanation = 'High-velocity skirmish unit for flanking and node denial';
    else explanation = 'Tactical deployment phase';
  }

  return {
    id: `step-${index}-${timestamp.replace(':', '')}`,
    raw: rawStep,
    timestamp,
    entityBadge,
    entityType,
    count,
    itemName: cleanItem,
    metalDelta,
    energyDelta,
    explanation,
  };
}
