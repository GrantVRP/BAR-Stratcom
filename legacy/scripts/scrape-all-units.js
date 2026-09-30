const fs = require('fs');
const path = require('path');

// Common unit nickname / alias dictionary for Beyond All Reason
const UNIT_ALIASES = {
  // Armada
  armpw: ['Paw', 'Pawn', 'armpw'],
  armrock: ['Rocko', 'Rocketeer', 'armrock'],
  armham: ['Hammer', 'Mace', 'armham'],
  armllt: ['Light Laser Tower', 'LLT', 'Sentry', 'armllt'],
  armrectr: ['Lazarus', 'Lazarus Rez Bot', 'armrectr'],
  armflea: ['Tick', 'armflea'],
  armflash: ['Flash', 'armflash'],
  armstump: ['Stump', 'Stout', 'armstump'],
  armjeth: ['Jethro', 'armjeth'],
  armwar: ['Warrior', 'armwar'],
  armbeaver: ['Beaver', 'Muskrat', 'armbeaver'],
  armsam: ['Samson', 'armsam'],
  armzeus: ['Zeus', 'armzeus'],
  armfido: ['Fido', 'armfido'],
  armafus: ['AFUS', 'Advanced Fusion Reactor', 'Advanced Fusion', 'armafus'],
  armfus: ['Fusion', 'Fusion Reactor', 'armfus'],
  armsolar: ['Solar', 'Solar Collector', 'armsolar'],
  armadvsol: ['Advanced Solar', 'Advanced Solar Generator', 'armadvsol'],
  armwin: ['Wind', 'Wind Turbine', 'Wind Generator', 'armwin'],
  armmex: ['Mex', 'Metal Extractor', 'armmex'],
  armamex: ['Advanced Mex', 'Advanced Metal Extractor', 'armamex'],
  armrad: ['Radar', 'Radar Tower', 'armrad'],
  armdrag: ["Dragon's Teeth", 'Dragons Teeth', 'armdrag'],
  armck: ['Construction Bot', 'Con Bot', 'armck'],
  armcv: ['Construction Vehicle', 'Con Vehicle', 'armcv'],
  armca: ['Construction Aircraft', 'Con Air', 'armca'],
  armcsub: ['Construction Sub', 'armcsub'],
  armnanotc: ['Construction Turret', 'Nano Turret', 'Care Taker', 'armnanotc'],
  armlab: ['Bot Lab', 'armlab'],
  armvp: ['Vehicle Plant', 'armvp'],
  armap: ['Aircraft Plant', 'armap'],
  armsy: ['Shipyard', 'armsy'],
  armestor: ['Energy Storage', 'armestor'],
  armmstor: ['Metal Storage', 'armmstor'],
  armmakr: ['Energy Converter', 'armmakr'],
  armmmkr: ['Advanced Energy Converter', 'armmmkr'],

  // Cortex
  corak: ['Grunt', 'corak'],
  corstorm: ['Storm', 'Aggravator', 'corstorm'],
  corthud: ['Thug', 'corthud'],
  corllt: ['Light Laser Tower', 'LLT', 'Guard', 'corllt'],
  cornecro: ['Necro', 'cornecro'],
  corroach: ['Roach', 'corroach'],
  corfav: ['Raider', 'Rascal', 'corfav'],
  corraid: ['Raider', 'corraid'],
  corpyro: ['Pyro', 'Pyros', 'corpyro'],
  corcrash: ['Crasher', 'corcrash'],
  corlevlr: ['Leveler', 'corlevlr'],
  corslash: ['Slasher', 'corslash'],
  corgol: ['Goliath', 'corgol'],
  corcan: ['Can', 'corcan'],
  corsumo: ['Sumo', 'corsumo'],
  corafus: ['AFUS', 'Advanced Fusion Reactor', 'Advanced Fusion', 'corafus'],
  corfus: ['Fusion', 'Fusion Reactor', 'corfus'],
  corsolar: ['Solar', 'Solar Collector', 'corsolar'],
  coradvsol: ['Advanced Solar', 'Advanced Solar Generator', 'coradvsol'],
  corwin: ['Wind', 'Wind Turbine', 'Wind Generator', 'corwin'],
  cormex: ['Mex', 'Metal Extractor', 'cormex'],
  coramex: ['Advanced Mex', 'Advanced Metal Extractor', 'coramex'],
  corrad: ['Radar', 'Radar Tower', 'corrad'],
  cordrag: ["Dragon's Teeth", 'Dragons Teeth', 'cordrag'],
  corck: ['Construction Bot', 'Con Bot', 'corck'],
  corcv: ['Construction Vehicle', 'Con Vehicle', 'corcv'],
  corca: ['Construction Aircraft', 'Con Air', 'corca'],
  corcsub: ['Construction Sub', 'corcsub'],
  cornanotc: ['Construction Turret', 'Nano Turret', 'Nano', 'cornanotc'],
  corlab: ['Bot Lab', 'corlab'],
  corvp: ['Vehicle Plant', 'corvp'],
  corap: ['Aircraft Plant', 'corap'],
  corsy: ['Shipyard', 'corsy'],
  corestor: ['Energy Storage', 'corestor'],
  cormstor: ['Metal Storage', 'cormstor'],
  cormakr: ['Energy Converter', 'cormakr'],
  cormmkr: ['Advanced Energy Converter', 'cormmkr'],
};

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return null;
}

async function scrapeUnitPage(slug) {
  const url = `https://www.beyondallreason.info/unit/${slug}`;
  const html = await fetchWithRetry(url);
  if (!html) return null;

  const nameM = html.match(/class="[^"]*us-unitname[^"]*">([^<]+)/i);
  const roleM = html.match(/class="[^"]*us-text[^"]*">([^<]+)/i);
  const tierM = html.match(/class="[^"]*unit-special-text[^"]*">([^<]+)/i);

  // 3D image
  const allImages = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
  const webflowImages = allImages.filter(
    (src) => src.includes('cdn.prod.website-files.com') && src.endsWith('.webp')
  );

  let image = null;
  const imgClassM =
    html.match(/class="[^"]*unit-img[^"]*"[^>]*src="([^"]+)"/i) ||
    html.match(/src="([^"]+)"[^>]*class="[^"]*unit-img[^"]*"/i);
  if (imgClassM) {
    image = imgClassM[1];
  } else {
    image = webflowImages.find((src) => src.includes(`_${slug}.webp`)) || null;
  }

  // Strategic icon
  let icon = null;
  const iconClassM =
    html.match(/class="[^"]*us-straticon-img[^"]*"[^>]*src="([^"]+)"/i) ||
    html.match(/src="([^"]+)"[^>]*class="[^"]*us-straticon-img[^"]*"/i);
  if (iconClassM) {
    icon = iconClassM[1];
  } else {
    icon =
      webflowImages.find(
        (src) => src.includes('/6994') || (src.includes(slug) && src !== image)
      ) || null;
  }

  // Costs
  const metalM = html.match(
    /Metal\s*<\/div><\/div>[\s\S]*?class="[^"]*us-stats-number[^"]*">([0-9,]+)<\/div>/i
  );
  const energyM = html.match(
    /Energy\s*<\/div><\/div>[\s\S]*?class="[^"]*us-stats-number[^"]*">([0-9,]+)<\/div>/i
  );
  const btM = html.match(
    /Build\s*Time\s*<\/div><\/div>[\s\S]*?class="[^"]*us-stats-number[^"]*">([0-9,]+)<\/div>/i
  );

  // Faction
  let faction = 'Armada';
  if (slug.startsWith('cor')) faction = 'Cortex';
  else if (slug.startsWith('arm')) faction = 'Armada';
  else if (slug.startsWith('leg')) faction = 'Legion';

  // Category inference
  let category = 'Bots';
  const lowerRole = roleM ? roleM[1].toLowerCase() : '';
  const catBreadcrumb = html.match(/href="\/units\/([^"]+)"/i);
  if (catBreadcrumb) {
    const rawCat = catBreadcrumb[1].toLowerCase();
    if (rawCat.includes('bot')) category = 'Bots';
    else if (rawCat.includes('vehicle')) category = 'Vehicles';
    else if (rawCat.includes('air')) category = 'Aircraft';
    else if (rawCat.includes('ship')) category = 'Ships';
    else if (rawCat.includes('hover')) category = 'Hovercraft';
    else if (rawCat.includes('factor')) category = 'Factories';
    else if (rawCat.includes('defense')) category = 'Defense Buildings';
    else if (rawCat.includes('building')) category = 'Buildings';
  } else {
    if (lowerRole.includes('turret') || lowerRole.includes('defense') || lowerRole.includes('tower'))
      category = 'Defense Buildings';
    else if (lowerRole.includes('plant') || lowerRole.includes('factory') || lowerRole.includes('lab'))
      category = 'Factories';
    else if (lowerRole.includes('generator') || lowerRole.includes('energy') || lowerRole.includes('extractor'))
      category = 'Buildings';
    else if (lowerRole.includes('vehicle') || lowerRole.includes('tank')) category = 'Vehicles';
    else if (lowerRole.includes('aircraft') || lowerRole.includes('plane') || lowerRole.includes('gunship'))
      category = 'Aircraft';
    else if (lowerRole.includes('ship') || lowerRole.includes('sub')) category = 'Ships';
    else if (lowerRole.includes('hover')) category = 'Hovercraft';
  }

  // Aliases
  const baseName = nameM ? nameM[1].trim() : slug;
  const customAliases = UNIT_ALIASES[slug] || [];
  const aliases = Array.from(new Set([baseName, slug, ...customAliases]));

  return {
    slug,
    name: baseName,
    faction,
    category,
    tier: tierM ? tierM[1].trim() : 'T1',
    role: roleM ? roleM[1].trim() : '',
    image,
    icon,
    metal: metalM ? parseInt(metalM[1].replace(/,/g, ''), 10) : null,
    energy: energyM ? parseInt(energyM[1].replace(/,/g, ''), 10) : null,
    buildTime: btM ? parseInt(btM[1].replace(/,/g, ''), 10) : null,
    aliases,
  };
}

async function main() {
  console.log('=== STARTING COMPLETE BEYOND ALL REASON SITEMAP SCRAPER ===');

  // Load existing database first to preserve any curated data
  const existingPath = path.join(__dirname, '..', 'data', 'bar_units_database.json');
  const unitMap = new Map();

  if (fs.existsSync(existingPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      for (const u of existing) {
        unitMap.set(u.slug, {
          ...u,
          aliases: Array.from(
            new Set([u.name, u.slug, ...(u.aliases || []), ...(UNIT_ALIASES[u.slug] || [])])
          ),
        });
      }
      console.log(`Loaded ${unitMap.size} units from existing database.`);
    } catch (e) {
      console.error('Error loading existing db:', e);
    }
  }

  // Fetch sitemap
  console.log('Fetching sitemap.xml...');
  const sitemapXml = await fetchWithRetry('https://www.beyondallreason.info/sitemap.xml');
  const urls = [
    ...sitemapXml.matchAll(
      /<loc>(https:\/\/www\.beyondallreason\.info\/unit\/[a-z0-9_]+)<\/loc>/g
    ),
  ].map((m) => m[1]);
  const slugs = Array.from(new Set(urls.map((u) => u.split('/').pop()))).filter(
    (s) => s.startsWith('arm') || s.startsWith('cor')
  );

  console.log(`Found ${slugs.length} Armada & Cortex unit pages in sitemap.`);

  // Scrape missing or incomplete units with concurrency
  const CONCURRENCY = 15;
  let processed = 0;
  let updated = 0;

  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const chunk = slugs.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (slug) => {
      // Check if we already have it fully populated
      const existing = unitMap.get(slug);
      if (existing && existing.image && existing.icon && existing.name) {
        // Ensure aliases are updated
        existing.aliases = Array.from(
          new Set([existing.name, existing.slug, ...(existing.aliases || []), ...(UNIT_ALIASES[slug] || [])])
        );
        return;
      }

      try {
        const scraped = await scrapeUnitPage(slug);
        if (scraped && scraped.name) {
          unitMap.set(slug, scraped);
          updated++;
        }
      } catch (err) {
        console.error(`Failed to scrape ${slug}:`, err.message);
      }
    });

    await Promise.all(promises);
    processed += chunk.length;
    if (processed % 60 === 0 || processed >= slugs.length) {
      console.log(`  Progress: ${processed}/${slugs.length} (${unitMap.size} total units stored, ${updated} newly fetched)...`);
    }
  }

  // Convert map to sorted array
  const allUnits = Array.from(unitMap.values()).sort((a, b) => {
    if (a.faction !== b.faction) return a.faction.localeCompare(b.faction);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  console.log(`\n=== SCRAPE COMPLETE: Total Units & Buildings Stored: ${allUnits.length} ===`);

  // Save to data and src/lib
  const jsonOutput = JSON.stringify(allUnits, null, 2);
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'bar_units_database.json'), jsonOutput, 'utf8');
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'bar_units_database.json'), jsonOutput, 'utf8');
  console.log(`Successfully written to:
  - data/bar_units_database.json
  - src/lib/bar_units_database.json`);
}

main().catch(console.error);
