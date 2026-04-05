/**
 * AI Planner Engine — Priority Scorer
 *
 * Computes a numeric priority score for each assignment.
 * The score determines scheduling order: higher score → scheduled first.
 *
 * Scoring factors
 * ───────────────
 * 1. Urgency    — fewer days remaining = higher score (exponential decay).
 * 2. Type       — assignment types with known higher effort score higher.
 * 3. Effort     — larger tasks need earlier starts, so they score higher.
 * 4. Priority   — the user-set priority acts as a baseline multiplier.
 *
 * The scorer is a pure function with zero side effects.
 */

import type { SchedulableAssignment, ScoredAssignment } from "./types";
import { parseDateKey, daysBetween, todayMidnight } from "./dateUtils";

// ── Effort estimation ─────────────────────────────────────────────────────────

/**
 * Default effort estimates by assignment type (hours).
 * Used when the assignment does not carry an explicit `estimated_hours`.
 */
const DEFAULT_EFFORT: Record<string, number> = {
  exam:         6.0,
  project:      8.0,
  essay:        4.0,
  paper:        5.0,
  lab:          3.0,
  quiz:         1.5,
  homework:     2.0,
  reading:      1.5,
  presentation: 3.0,
};

const FALLBACK_EFFORT = 2.0;

export function estimateEffort(assignment: SchedulableAssignment): number {
  if (assignment.estimated_hours != null && assignment.estimated_hours > 0) {
    return assignment.estimated_hours;
  }
  const typeKey = assignment.type.toLowerCase().trim();
  return DEFAULT_EFFORT[typeKey] ?? FALLBACK_EFFORT;
}

// ── Priority multiplier ──────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  high:   1.5,
  medium: 1.0,
  low:    0.6,
};

// ── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Computes a scheduling priority score.
 *
 * Formula:
 *   score = urgencyFactor × effortFactor × priorityWeight
 *
 * Where:
 *   urgencyFactor  = max(100 − daysRemaining², 10)   // exponential rise as deadline nears
 *   effortFactor   = 1 + (estimatedHours / 10)       // slight nudge for big tasks
 *   priorityWeight = 1.5 | 1.0 | 0.6                 // user-set priority
 */
function computeScore(daysRemaining: number, estimatedHours: number, priority: string): number {
  // Urgency: parabolic curve that climbs sharply as daysRemaining → 0.
  // Floor at 10 so distant tasks still get a nonzero base.
  const urgency = Math.max(100 - daysRemaining * daysRemaining, 10);

  // Effort: gentle linear boost for larger tasks.
  const effort = 1 + estimatedHours / 10;

  // Priority: user-set weight.
  const weight = PRIORITY_WEIGHT[priority] ?? 1.0;

  return Math.round(urgency * effort * weight * 100) / 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Scores and sorts a list of schedulable assignments.
 *
 * Filters out:
 * - Completed assignments
 * - Assignments with invalid / past due dates
 *
 * Returns descending score order (highest priority first).
 */
export function scoreAssignments(
  assignments: SchedulableAssignment[],
  anchorDate?: Date,
): ScoredAssignment[] {
  const today = anchorDate ?? todayMidnight();
  const scored: ScoredAssignment[] = [];

  for (const a of assignments) {
    // Skip completed.
    if (a.status === "completed") continue;

    // Parse and validate due_date.
    const dueDate = parseDateKey(a.due_date);
    if (!dueDate) continue;

    const daysRemaining = daysBetween(dueDate, today);
    // Skip overdue (negative) — they can't be meaningfully scheduled forward.
    if (daysRemaining < 0) continue;

    const estimatedHours = estimateEffort(a);

    scored.push({
      assignment: a,
      score: computeScore(daysRemaining, estimatedHours, a.priority),
      days_remaining: daysRemaining,
      estimated_hours: estimatedHours,
      allocated_hours: 0,
    });
  }

  // Sort descending by score.
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
