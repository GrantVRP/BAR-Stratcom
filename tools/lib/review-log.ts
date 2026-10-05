/**
 * The H3 review sheet (data/builds/_review.md, kept after T08.9 as REVIEW-LOG.md): one "### n. Title"
 * section per candidate with a `Plan: \`<id>\`` line and a `DECISION:` line.
 */
export type ReviewOutcome = 'approve' | 'reject' | 'pending';

export interface ReviewDecision {
  num: number;
  id: string;
  decision: ReviewOutcome;
  reason: string;
}

export function parseReviewDecisions(md: string): ReviewDecision[] {
  const decisions: ReviewDecision[] = [];
  for (const section of md.split(/^### /m).slice(1)) {
    const num = Number(/^(\d+)\./.exec(section)?.[1]);
    const id = /Plan: `([^`]+)`/.exec(section)?.[1];
    const line = /^DECISION:(.*)$/m.exec(section)?.[1]?.trim();
    if (!id || line === undefined || Number.isNaN(num)) continue;
    const reject = /^reject\b(?:\s*[—-]\s*reason:\s*(.*))?$/i.exec(line);
    if (/^approve$/i.test(line)) decisions.push({ num, id, decision: 'approve', reason: '' });
    else if (reject) decisions.push({ num, id, decision: 'reject', reason: (reject[1] ?? '').trim() });
    else decisions.push({ num, id, decision: 'pending', reason: '' });
  }
  return decisions;
}

/** True only when the plan's own section says `DECISION: approve`. */
export function reviewApproves(md: string, planId: string): boolean {
  return parseReviewDecisions(md).some((d) => d.id === planId && d.decision === 'approve');
}
