const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  // Armada
  { faction: 'Armada', category: 'Bots', url: 'https://www.beyondallreason.info/units/armada-bots' },
  { faction: 'Armada', category: 'Vehicles', url: 'https://www.beyondallreason.info/units/armada-vehicles' },
  { faction: 'Armada', category: 'Aircraft', url: 'https://www.beyondallreason.info/units/armada-aircraft' },
  { faction: 'Armada', category: 'Ships', url: 'https://www.beyondallreason.info/units/armada-ships' },
  { faction: 'Armada', category: 'Hovercraft', url: 'https://www.beyondallreason.info/units/armada-hovercraft' },
  { faction: 'Armada', category: 'Factories', url: 'https://www.beyondallreason.info/units/armada-factories' },
  { faction: 'Armada', category: 'Defense Buildings', url: 'https://www.beyondallreason.info/units/armada-defense-buildings' },
  { faction: 'Armada', category: 'Buildings', url: 'https://www.beyondallreason.info/units/armada-buildings' },
  // Cortex
  { faction: 'Cortex', category: 'Bots', url: 'https://www.beyondallreason.info/units/cortex-bots' },
  { faction: 'Cortex', category: 'Vehicles', url: 'https://www.beyondallreason.info/units/cortex-vehicles' },
  { faction: 'Cortex', category: 'Aircraft', url: 'https://www.beyondallreason.info/units/cortex-aircraft' },
  { faction: 'Cortex', category: 'Ships', url: 'https://www.beyondallreason.info/units/cortex-ships' },
  { faction: 'Cortex', category: 'Hovercraft', url: 'https://www.beyondallreason.info/units/cortex-hovercraft' },
  { faction: 'Cortex', category: 'Factories', url: 'https://www.beyondallreason.info/units/cortex-factories' },
  { faction: 'Cortex', category: 'Defense Buildings', url: 'https://www.beyondallreason.info/units/cortex-defense-buildings' },
  { faction: 'Cortex', category: 'Buildings', url: 'https://www.beyondallreason.info/units/cortex-buildings' }
];

function extractUnitsFromHtml(html, faction, category) {
  const units = [];
  const cardRegex = /<div role="listitem" class="flex-unit[^"]*">([\s\S]*?)(?=<div role="listitem" class="flex-unit|$)/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const chunk = match[1];
    const slugM = chunk.match(/href="\/unit\/([a-z0-9_]+)"/);
    const nameM = chunk.match(/class="us-unitname">([^<]+)<\/h1>/);
    const roleM = chunk.match(/class="us-text">([^<]+)<\/div>/);
    const tierM = chunk.match(/class="unit-special-text">([^<]+)<\/div>/);
    const imgM = chunk.match(/class="unit-img[^"]*"[^>]*src="([^"]+)"/) ||
                 chunk.match(/src="([^"]+)"[^>]*class="unit-img[^"]*"/);
    const iconM = chunk.match(/class="us-straticon-img[^"]*"[^>]*src="([^"]+)"/) ||
                  chunk.match(/src="([^"]+)"[^>]*class="us-straticon-img[^"]*"/);
    const metalM = chunk.match(/Metal<\/div><\/div>[\s\S]*?class="us-stats-number">([0-9,]+)<\/div>/);
    const energyM = chunk.match(/energy\s*<\/div><\/div>[\s\S]*?class="us-stats-number">([0-9,]+)<\/div>/i);
    const btM = chunk.match(/build\s*time<\/div><\/div>[\s\S]*?class="us-stats-number">([0-9,]+)<\/div>/i);

    if (slugM && nameM) {
      units.push({
        slug: slugM[1],
        name: nameM[1].trim(),
        faction,
        category,
        tier: tierM ? tierM[1].trim() : 'T1',
        role: roleM ? roleM[1].trim() : '',
        image: imgM ? imgM[1] : null,
        icon: iconM ? iconM[1] : null,
        metal: metalM ? parseInt(metalM[1].replace(/,/g, ''), 10) : null,
        energy: energyM ? parseInt(energyM[1].replace(/,/g, ''), 10) : null,
        buildTime: btM ? parseInt(btM[1].replace(/,/g, ''), 10) : null
      });
    }
  }
  return units;
}

async function scrapeAll() {
  const allUnits = new Map(); // slug -> unit
  console.log('=== STARTING BEYOND ALL REASON FULL UNIT SCRAPER ===');

  for (const cat of CATEGORIES) {
    console.log(`Scraping ${cat.faction} ${cat.category}...`);
    let page = 1;
    let pageParam = null;

    while (page <= 25) {
      let pageUrl = cat.url;
      if (page > 1 && pageParam) {
        pageUrl = `${cat.url}?${pageParam}=${page}`;
      }
      try {
        const res = await fetch(pageUrl);
        if (!res.ok) break;
        const html = await res.text();

        // Check for Webflow pagination param
        if (page === 1) {
          const nextMatch = html.match(/href="[^"]*\?([a-zA-Z0-9_]+)=2[^"]*"/);
          if (nextMatch) {
            pageParam = nextMatch[1];
          }
        }

        const units = extractUnitsFromHtml(html, cat.faction, cat.category);
        let added = 0;
        for (const u of units) {
          if (!allUnits.has(u.slug)) {
            allUnits.set(u.slug, u);
            added++;
          }
        }
        console.log(`  Page ${page}: found ${units.length} cards, added ${added} new units.`);
        if (units.length === 0 || !pageParam) break;
        page++;
      } catch (err) {
        console.error(`  Error scraping ${cat.url} page ${page}:`, err.message);
        break;
      }
    }
  }

  const results = Array.from(allUnits.values());
  console.log(`\nSUCCESS! Total unique units & buildings scraped: ${results.length}`);

  // Save to data/ and src/lib/
  const dataDir = path.resolve(__dirname, '../data');
  const libDir = path.resolve(__dirname, '../src/lib');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dataPath = path.join(dataDir, 'bar_units_database.json');
  const libPath = path.join(libDir, 'bar_units_database.json');

  fs.writeFileSync(dataPath, JSON.stringify(results, null, 2));
  fs.writeFileSync(libPath, JSON.stringify(results, null, 2));

  console.log(`Saved to ${dataPath}`);
  console.log(`Saved to ${libPath}`);
}

scrapeAll().catch(console.error);
