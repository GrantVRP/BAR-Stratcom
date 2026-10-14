import { describe, expect, it } from 'vitest';
import snapshotData from '../registry/__test__/test-snapshot.json';
import { UnitSnapshotSchema, type UnitDefRecord } from '../schemas';
import { buildUnitMentionIndex, linkUnitMentions } from './unit-mentions';

const base = UnitSnapshotSchema.parse(snapshotData).units[0]!;
const unit = (id: string, name: string): UnitDefRecord => ({ ...base, id, name });

const index = buildUnitMentionIndex([
  unit('armemp', 'Paralyzer'),
  unit('armclaw', "Dragon's Claw"),
  unit('armpw', 'Pawn'),
  unit('armcom', 'Commander'),
  unit('corcom', 'Commander'),
  unit('armck', 'Construction Bot'),
  unit('armcv', 'Construction Vehicle')
]);

describe('unit mentions in balance-change text', () => {
  it('links unit ids and exact current names, keeping all other text', () => {
    const parts = linkUnitMentions("Paralyzer and armemp turn faster; Dragon's Claw range +10.", index);
    expect(parts).toEqual([
      { text: 'Paralyzer', unitId: 'armemp' },
      { text: ' and ' },
      { text: 'armemp', unitId: 'armemp' },
      { text: ' turn faster; ' },
      { text: "Dragon's Claw", unitId: 'armclaw' },
      { text: ' range +10.' }
    ]);
    expect(parts.map((p) => p.text).join('')).toBe("Paralyzer and armemp turn faster; Dragon's Claw range +10.");
  });

  it('never guesses: no substrings, no other case, no names shared by several units', () => {
    const text = 'Pawns and pawn, armpwx, Commander buffs';
    expect(linkUnitMentions(text, index)).toEqual([{ text }]);
  });

  it('prefers the longest name and needs single spaces inside a multi-word name', () => {
    expect(linkUnitMentions('Construction Bot, Construction  Vehicle', index)).toEqual([
      { text: 'Construction Bot', unitId: 'armck' },
      { text: ', Construction  Vehicle' }
    ]);
    expect(linkUnitMentions('', index)).toEqual([]);
  });
});
