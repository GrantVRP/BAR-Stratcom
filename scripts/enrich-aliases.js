const fs = require('fs');
const path = require('path');

const ALIASES_MAP = {
  // Armada Bots
  armpw: ['Paw', 'Pawn', 'armpw'],
  armrock: ['Rocko', 'Rocketeer', 'armrock'],
  armham: ['Hammer', 'Mace', 'armham'],
  armllt: ['Light Laser Tower', 'LLT', 'Sentry', 'armllt'],
  armrectr: ['Lazarus', 'Lazarus Rez Bot', 'armrectr'],
  armflea: ['Tick', 'Flea', 'armflea'],
  armflash: ['Flash', 'Blitz', 'armflash'],
  armstump: ['Stump', 'Stout', 'armstump'],
  armsam: ['Samson', 'Whistler', 'armsam'],
  armwar: ['Warrior', 'armwar'],
  armbeaver: ['Beaver', 'Muskrat', 'armbeaver'],
  armzeus: ['Zeus', 'armzeus'],
  armfido: ['Fido', 'armfido'],
  armbull: ['Bull', 'Bulldog', 'armbull'],
  armmart: ['Mauser', 'Wolverine', 'armmart'],
  armart: ['Shellshocker', 'armart'],
  armjeth: ['Jethro', 'armjeth'],
  armck: ['Construction Bot', 'Con Bot', 'armck'],
  armack: ['Advanced Construction Bot', 'T2 Con Bot', 'armack'],

  // Armada Air
  armpeep: ['Sparrow', 'Blink', 'armpeep', 'Armada Scout Plane'],
  armfig: ['Freedom Fighter', 'Falcon', 'armfig', 'Armada Fighter'],
  armbrawl: ['Brawler', 'Roughneck', 'armbrawl', 'Armada Gunship'],
  armthund: ['Thunderbird', 'Shadow', 'Stormbringer', 'armthund', 'Armada Bomber'],
  armatlas: ['Atlas', 'Stork', 'armatlas', 'Armada Transport', 'Air Transport'],
  armkam: ['Banshee', 'Kamikaze', 'armkam'],
  armhawk: ['Highwind', 'Hawk', 'armhawk'],
  armlance: ['Cormorant', 'Lance', 'armlance'],
  armca: ['Construction Aircraft', 'Con Air', 'armca'],
  armaca: ['Advanced Construction Aircraft', 'T2 Con Air', 'armaca'],

  // Armada Buildings
  armafus: ['AFUS', 'Advanced Fusion Reactor', 'Advanced Fusion', 'armafus'],
  armfus: ['Fusion', 'Fusion Reactor', 'armfus'],
  armsolar: ['Solar', 'Solar Collector', 'armsolar'],
  armadvsol: ['Advanced Solar', 'Advanced Solar Generator', 'Advanced Solar Collector', 'armadvsol'],
  armwin: ['Wind', 'Wind Turbine', 'Wind Generator', 'armwin'],
  armmex: ['Mex', 'Metal Extractor', 'armmex'],
  armamex: ['Advanced Mex', 'Advanced Metal Extractor', 'Moho Mine', 'armamex'],
  armrad: ['Radar', 'Radar Tower', 'armrad'],
  armdrag: ["Dragon's Teeth", 'Dragons Teeth', 'armdrag'],
  armlab: ['Bot Lab', 'armlab'],
  armalab: ['Advanced Bot Lab', 'T2 Bot Lab', 'armalab'],
  armvp: ['Vehicle Plant', 'armvp'],
  armavp: ['Advanced Vehicle Plant', 'T2 Vehicle Plant', 'armavp'],
  armap: ['Aircraft Plant', 'Air Plant', 'Aircraft Factory', 'armap'],
  armaap: ['Advanced Aircraft Plant', 'T2 Aircraft Plant', 'armaap'],
  armsy: ['Shipyard', 'armsy'],
  armestor: ['Energy Storage', 'armestor'],
  armmstor: ['Metal Storage', 'armmstor'],
  armmakr: ['Energy Converter', 'armmakr'],
  armmmkr: ['Advanced Energy Converter', 'armmmkr'],

  // Cortex Bots
  corak: ['Grunt', 'corak'],
  corstorm: ['Storm', 'Aggravator', 'corstorm'],
  corthud: ['Thug', 'corthud'],
  corllt: ['Light Laser Tower', 'LLT', 'Guard', 'corllt'],
  cornecro: ['Necro', 'Graverobber', 'cornecro'],
  corroach: ['Roach', 'corroach'],
  corpyro: ['Pyro', 'Pyros', 'Fiend', 'corpyro'],
  corcrash: ['Crasher', 'corcrash'],
  corcan: ['Can', 'Sumo', 'corcan'],
  corsumo: ['Sumo', 'Mammoth', 'corsumo'],
  corck: ['Construction Bot', 'Con Bot', 'corck'],
  corack: ['Advanced Construction Bot', 'T2 Con Bot', 'corack'],

  // Cortex Vehicles
  corfav: ['Rascal', 'Fav', 'corfav'],
  corraid: ['Raider', 'Brute', 'corraid'],
  corgator: ['Gator', 'Instigator', 'Incisor', 'Blitz', 'corgator'],
  corlevlr: ['Leveler', 'Pounder', 'corlevlr'],
  corslash: ['Slasher', 'corslash'],
  corgol: ['Goliath', 'Tzar', 'corgol'],
  corwolv: ['Wolverine', 'corwolv'],
  corvroc: ['Diplomat', 'Negotiator', 'corvroc'],
  corcv: ['Construction Vehicle', 'Con Vehicle', 'corcv'],
  coracv: ['Advanced Construction Vehicle', 'T2 Con Vehicle', 'coracv'],

  // Cortex Air
  corvalk: ['Valkyrie', 'Hercules', 'corvalk', 'Cortex Transport', 'Air Transport'],
  corveng: ['Avenger', 'Valiant', 'corveng', 'Cortex Fighter'],
  corshad: ['Shadow', 'Whirlwind', 'corshad', 'Cortex Bomber'],
  corfink: ['Fink', 'Finch', 'corfink', 'Cortex Scout Plane'],
  corape: ['Rapier', 'Wasp', 'corape', 'Cortex Gunship'],
  cortitan: ['Titan', 'Angler', 'cortitan'],
  corhurc: ['Hurricane', 'Hailstorm', 'corhurc'],
  corvamp: ['Vampire', 'Nighthawk', 'corvamp'],
  corca: ['Construction Aircraft', 'Con Air', 'corca'],
  coraca: ['Advanced Construction Aircraft', 'T2 Con Air', 'coraca'],

  // Cortex Buildings
  corafus: ['AFUS', 'Advanced Fusion Reactor', 'Advanced Fusion', 'corafus'],
  corfus: ['Fusion', 'Fusion Reactor', 'corfus'],
  corsolar: ['Solar', 'Solar Collector', 'corsolar'],
  coradvsol: ['Advanced Solar', 'Advanced Solar Generator', 'Advanced Solar Collector', 'coradvsol'],
  corwin: ['Wind', 'Wind Turbine', 'Wind Generator', 'corwin'],
  cormex: ['Mex', 'Metal Extractor', 'cormex'],
  coramex: ['Advanced Mex', 'Advanced Metal Extractor', 'Moho Mine', 'coramex'],
  corrad: ['Radar', 'Radar Tower', 'corrad'],
  cordrag: ["Dragon's Teeth", 'Dragons Teeth', 'cordrag'],
  corlab: ['Bot Lab', 'corlab'],
  coralab: ['Advanced Bot Lab', 'T2 Bot Lab', 'coralab'],
  corvp: ['Vehicle Plant', 'corvp'],
  coravp: ['Advanced Vehicle Plant', 'T2 Vehicle Plant', 'coravp'],
  corap: ['Aircraft Plant', 'Air Plant', 'Aircraft Factory', 'corap'],
  coraap: ['Advanced Aircraft Plant', 'T2 Aircraft Plant', 'coraap'],
  corsy: ['Shipyard', 'corsy'],
  corestor: ['Energy Storage', 'corestor'],
  cormstor: ['Metal Storage', 'cormstor'],
  cormakr: ['Energy Converter', 'cormakr'],
  cormmkr: ['Advanced Energy Converter', 'cormmkr'],
};

['data/bar_units_database.json', 'src/lib/bar_units_database.json'].forEach(filePath => {
  const fullPath = path.resolve(filePath);
  const units = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  units.forEach(u => {
    const slug = u.slug.toLowerCase();
    const existingAliases = u.aliases || [];
    const newAliases = ALIASES_MAP[slug] || [];

    const merged = Array.from(new Set([...existingAliases, ...newAliases, u.name, u.slug]));
    u.aliases = merged;
  });

  fs.writeFileSync(fullPath, JSON.stringify(units, null, 2), 'utf8');
  console.log(`Updated ${units.length} units in ${filePath}`);
});
