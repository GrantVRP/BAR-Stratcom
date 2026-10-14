import type { Profile } from '../schemas/common';
import type { ProfileSuggestion, SessionReportGrade } from '../schemas/report';

export interface ReportCandidate {
  grade: SessionReportGrade;
  adherence: number;
  profile?: Profile;
}

/**
 * Evaluates recent session reports played on the current profile and determines
 * if an auto-suggested profile adjustment is appropriate.
 *
 * Rules:
 * - Look at the last 3 reports played on the current profile.
 * - If fewer than 3 reports exist for currentProfile, return null.
 * - If all 3 are graded >= A and adherence >= 0.8:
 *     suggest moving up (beginner -> intermediate -> advanced).
 * - If all 3 are graded <= C or adherence < 0.4:
 *     suggest moving down (advanced -> intermediate -> beginner).
 * - Returns a suggestion or null; never switches automatically.
 */
export function suggestProfile(
  lastReports: ReportCandidate[],
  currentProfile: Profile
): ProfileSuggestion | null {
  // Filter for reports that match the current profile (or unassigned profile in unit tests)
  const matching = lastReports.filter(
    (r) => r.profile === undefined || r.profile === currentProfile
  );

  if (matching.length < 3) {
    return null;
  }

  const targetThree = matching.slice(0, 3);

  // Check moving up: all graded >= A (S or A) and adherence >= 0.8
  const allUp = targetThree.every(
    (r) => (r.grade === 'S' || r.grade === 'A') && r.adherence >= 0.8
  );

  if (allUp) {
    if (currentProfile === 'beginner') {
      return {
        to: 'intermediate',
        reason: 'Last 3 games on beginner achieved grade A or higher with >=80% adherence.'
      };
    }
    if (currentProfile === 'intermediate') {
      return {
        to: 'advanced',
        reason: 'Last 3 games on intermediate achieved grade A or higher with >=80% adherence.'
      };
    }
    // Already advanced, cannot move up
    return null;
  }

  // Check moving down: all graded <= C (C or D) or adherence < 0.4
  const allDown = targetThree.every(
    (r) => r.grade === 'C' || r.grade === 'D' || r.adherence < 0.4
  );

  if (allDown) {
    if (currentProfile === 'advanced') {
      return {
        to: 'intermediate',
        reason: 'Last 3 games on advanced had grade C or lower or plan adherence below 40%.'
      };
    }
    if (currentProfile === 'intermediate') {
      return {
        to: 'beginner',
        reason: 'Last 3 games on intermediate had grade C or lower or plan adherence below 40%.'
      };
    }
    // Already beginner, cannot move down
    return null;
  }

  return null;
}
