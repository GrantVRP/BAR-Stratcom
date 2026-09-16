import { type Faction } from './game-data';

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
  'solar collector': { metal: '-145 M', energy: '+20 E' },
  'solar': { metal: '-145 M', energy: '+20 E' },
  'wind turbine': { metal: '-35 M', energy: '+14 E' },
  'wind generator': { metal: '-35 M', energy: '+14 E' },
  'turbine': { metal: '-35 M', energy: '+14 E' },
  'wind': { metal: '-35 M', energy: '+14 E' },
  'fusion reactor': { metal: '-4600 M', energy: '+1050 E' },
  'fusion': { metal: '-4600 M', energy: '+1050 E' },
  'metal extractor': { metal: '+2.0 M', energy: '-3 E' },
  'mex': { metal: '+2.0 M', energy: '-3 E' },
  'energy converter': { metal: '+5.7 M', energy: '-70 E' },
  'energy storage': { metal: '-110 M', energy: '+1000 E' },
  'metal storage': { metal: '+1000 M', energy: '-0 E' },
  'vehicle plant': { metal: '-680 M', energy: '-1250 E' },
  'vplant': { metal: '-680 M', energy: '-1250 E' },
  'vehicle factory': { metal: '-680 M', energy: '-1250 E' },
  'bot lab': { metal: '-600 M', energy: '-1100 E' },
  'botlab': { metal: '-600 M', energy: '-1100 E' },
  'aircraft plant': { metal: '-720 M', energy: '-1500 E' },
  'aircraftplant': { metal: '-720 M', energy: '-1500 E' },
  'air plant': { metal: '-720 M', energy: '-1500 E' },
  'airplant': { metal: '-720 M', energy: '-1500 E' },
  'shipyard': { metal: '-650 M', energy: '-1300 E' },
  'light laser tower': { metal: '-90 M', energy: '-950 E' },
  'llt': { metal: '-90 M', energy: '-950 E' },
  'flash': { metal: '-110 M', energy: '-1200 E' },
  'stump': { metal: '-210 M', energy: '-1800 E' },
  'blitz': { metal: '-135 M', energy: '-1400 E' },
  'raider': { metal: '-225 M', energy: '-1950 E' },
  'paw': { metal: '-45 M', energy: '-450 E' },
  'grunt': { metal: '-50 M', energy: '-500 E' },
  'rocko': { metal: '-115 M', energy: '-980 E' },
  'storm': { metal: '-120 M', energy: '-1020 E' },
  'hammer': { metal: '-140 M', energy: '-1100 E' },
  'thug': { metal: '-155 M', energy: '-1250 E' },
  'pyros': { metal: '-165 M', energy: '-1350 E' },
  'samson': { metal: '-125 M', energy: '-1100 E' },
  'slasher': { metal: '-130 M', energy: '-1150 E' },
  'wolverine': { metal: '-180 M', energy: '-1600 E' },
  'leveler': { metal: '-240 M', energy: '-2100 E' },
  'lazarus': { metal: '-130 M', energy: '-1500 E' },
  'construction vehicle': { metal: '-210 M', energy: '-2100 E' },
  'construction bot': { metal: '-190 M', energy: '-1900 E' },
  'beaver': { metal: '-210 M', energy: '-2100 E' },
  'reclaim': { metal: '+250 M', energy: '+100 E' },
  'roach': { metal: '-65 M', energy: '-800 E' },
  'tick': { metal: '-25 M', energy: '-200 E' },
  'sparrow': { metal: '-40 M', energy: '-850 E' },
  'tornado': { metal: '-190 M', energy: '-2600 E' },
  'shadow': { metal: '-175 M', energy: '-3100 E' },
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
  // Strip action verbs: "Queue 2x Flash", "Construct 1x Solar Collector", "Build 2x Wind"
  let cleanItem = text
    .replace(/^(?:queue|construct|build|deploy|produce|advance to|continuous queue of|continuous production of)\s+/i, '')
    .replace(/^\d+(?:-\d+)?x?\s+/i, '')
    .trim();

  // If there's an "on ...", "for ...", "to ...", or "at ...", extract secondary text if explanation was empty
  const trailingReasonMatch = cleanItem.match(/\s+(on|for|to|at|against|into|angled)\s+(.*)$/i);
  if (trailingReasonMatch) {
    if (!explanation) {
      explanation = `${trailingReasonMatch[1]} ${trailingReasonMatch[2]}`.trim();
    }
    cleanItem = cleanItem.substring(0, trailingReasonMatch.index).trim();
  }

  // Capitalize properly
  if (!cleanItem || cleanItem.length < 2) {
    cleanItem = text || 'Strategic Unit';
  }

  // Check database for canonical item name
  const lowerItem = cleanItem.toLowerCase();
  let metalDelta = '-100 M';
  let energyDelta = '-1000 E';

  // Check known deltas
  for (const [key, delta] of Object.entries(RESOURCE_DELTAS)) {
    if (lowerItem.includes(key)) {
      metalDelta = delta.metal;
      energyDelta = delta.energy;
      break;
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
