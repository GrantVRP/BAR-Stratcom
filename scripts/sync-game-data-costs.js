const fs = require('fs');
const path = require('path');

const scraped = require('../data/bar_units_database.json');
const gameDataPath = path.resolve(__dirname, '../src/lib/game-data.ts');
let content = fs.readFileSync(gameDataPath, 'utf8');

// Fix any mismatched codeNames first
content = content.replace(/codeName:\s*'corthug'/g, "codeName: 'corthud'");
content = content.replace(/codeName:\s*'armbraw'/g, "codeName: 'armbrawl'");

let updated = 0;
// Match unit objects with id, name, codeName and cost
const unitBlockRegex = /(\{\s*id:\s*'[^']+',[\s\S]*?codeName:\s*'([^']+)',[\s\S]*?cost:\s*\{)([^}]+)(\})/g;

const newContent = content.replace(unitBlockRegex, (fullMatch, prefix, codeName, oldCost, suffix) => {
  const found = scraped.find(u => u.slug.toLowerCase() === codeName.toLowerCase());
  if (found && found.metal !== undefined && found.energy !== undefined) {
    updated++;
    const newCost = ` metal: ${found.metal}, energy: ${found.energy}, buildTime: ${found.buildTime || 20} `;
    return `${prefix}${newCost}${suffix}`;
  }
  return fullMatch;
});

console.log(`Matched and updated ${updated} units in game-data.ts with exact scraped costs.`);
fs.writeFileSync(gameDataPath, newContent, 'utf8');
