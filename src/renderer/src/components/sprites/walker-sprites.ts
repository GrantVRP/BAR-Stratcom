// Original pixel art for the launcher walk animation (T06.13, A-11). Drawn from scratch as generic
// chunky bots that suit the roles of the Armada Sprinter (armfast, fast raider: light, quick) and the
// Cortex Fiend (corpyro, fast assault: stockier, fuel tank and nozzle). Not traced from BAR art.
// Side view facing right, 24 × 24 cells, palette as in components/icons/palette.ts.

export const WALKER_SIZE = 24;
const EMPTY = '........................';

const SPRINTER_UPPER = [
  EMPTY,
  EMPTY,
  '..........kkkkk.........',
  '.........kllllfk........',
  '.........kfffcck........',
  '.........kfffffk........',
  '..........kkdkk.........',
  '........kkkfffkkk.......',
  '.......kllffffffkGGGGk..',
  '.......kfffffffkggggggk.',
  '.......kfffddffk.kkkkkk.',
  '........kddddddk........',
  '.........kffffk.........',
  '.........kdkkdk.........'
];

// Near leg in faction colour (f), far leg darker (d); the two strides swap them.
const SPRINTER_STRIDE = [
  '........kak..kbk........',
  '.......kak....kbk.......',
  '......kak......kbk......',
  '......kdk......kdk......',
  '.....kak........kbk.....',
  '.....kak........kbk.....',
  '....kaak........kbbk....',
  '...kkkkk........kkkkk...',
  EMPTY,
  EMPTY
];

const SPRINTER_PASS = [
  '.........kakbk..........',
  '.........kakbk..........',
  '.........kakbk..........',
  '.........kdkdk..........',
  '.........kakkbk.........',
  '.........kak.kbk........',
  '........kaak..kkk.......',
  '........kkkk............',
  EMPTY,
  EMPTY
];

const FIEND_UPPER = [
  EMPTY,
  EMPTY,
  EMPTY,
  '..........kkkkkk........',
  '.........klllllfk.......',
  '......kk.kfffcccfk......',
  '.....kGGk.kffffffk......',
  '.....kGgkkkddddddkkk....',
  '.....kGgklffffffffkGGGk.',
  '.....kGgkfffffffffkgggNk',
  '.....kGgkffffddfffkkkkk.',
  '.....kkkkdddddddddk.....',
  '........kffffffffk......',
  '........kdkk..kkdk......'
];

const FIEND_STRIDE = [
  '........kaak..kbbk......',
  '.......kaak....kbbk.....',
  '.......kddk....kddk.....',
  '......kaak......kbbk....',
  '......kaak......kbbk....',
  '.....kaaak......kbbbk...',
  '.....kkkkk......kkkkk...',
  EMPTY,
  EMPTY,
  EMPTY
];

const FIEND_PASS = [
  '.........kaabbk.........',
  '.........kaabbk.........',
  '.........kdddkk.........',
  '.........kaakbbk........',
  '.........kaak.kbbk......',
  '........kaaak..kkk......',
  '........kkkkk...........',
  EMPTY,
  EMPTY,
  EMPTY
];

/** Leg shading per frame: [near, far] palette characters for the a/b placeholders. */
const LEG_SHADES: Array<[string, string]> = [
  ['d', 'f'],
  ['d', 'f'],
  ['f', 'd'],
  ['f', 'd']
];

function buildFrames(upper: string[], stride: string[], pass: string[], nozzle?: [string, string]): string[][] {
  return [stride, pass, stride, pass].map((legs, i) => {
    const [a, b] = LEG_SHADES[i]!;
    const bob = i % 2 === 1 ? [EMPTY] : [];
    const tip = nozzle ? nozzle[i % 2]! : 'o';
    const rows = [...bob, ...upper, ...legs].slice(0, WALKER_SIZE);
    return rows.map((row) => row.replace(/a/g, a).replace(/b/g, b).replace(/N/g, tip));
  });
}

export const WALKER_FRAMES: Record<'armada' | 'cortex', string[][]> = {
  armada: buildFrames(SPRINTER_UPPER, SPRINTER_STRIDE, SPRINTER_PASS),
  // The Fiend's nozzle tip flickers between orange and yellow
  cortex: buildFrames(FIEND_UPPER, FIEND_STRIDE, FIEND_PASS, ['o', 'y'])
};

/** Registry unit each walker stands for (its display name labels the sprite). */
export const WALKER_UNIT: Record<'armada' | 'cortex', string> = { armada: 'armfast', cortex: 'corpyro' };
