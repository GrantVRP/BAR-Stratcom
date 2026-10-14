import { describe, expect, it } from 'vitest';
import { parseReviewDecisions, reviewApproves } from './review-log';

const sheet = `# Review
**How to review:** change \`DECISION: approve | reject — reason:\`.

### 1. Bot wind // A

- Plan: \`plan-a\` · Armada · 1v1

DECISION: approve

### 2. Bot wind // B

- Plan: \`plan-b\` · Armada · 1v1

DECISION: reject — reason: near-duplicate of #1

### 3. Air // C

- Plan: \`plan-c\` · Cortex · 8v8

DECISION: approve | reject — reason:
`;

describe('review sheet', () => {
  it('reads each section’s decision and reason; an untouched line is still open', () => {
    expect(parseReviewDecisions(sheet)).toEqual([
      { num: 1, id: 'plan-a', decision: 'approve', reason: '' },
      { num: 2, id: 'plan-b', decision: 'reject', reason: 'near-duplicate of #1' },
      { num: 3, id: 'plan-c', decision: 'pending', reason: '' }
    ]);
  });

  it('approves only the plan whose own section says approve', () => {
    expect(reviewApproves(sheet, 'plan-a')).toBe(true);
    expect(reviewApproves(sheet, 'plan-b')).toBe(false); // its id and the word "approve" are both in the file
    expect(reviewApproves(sheet, 'plan-c')).toBe(false);
    expect(reviewApproves(sheet, 'missing')).toBe(false);
  });
});
