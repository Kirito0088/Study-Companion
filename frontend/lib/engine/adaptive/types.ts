/**
 * Phase 2 — Adaptive AI Layer Type Definitions
 *
 * Pure data types for the behavioral feedback loop, adaptive scoring,
 * fatigue detection, and replan triggering. Zero framework coupling.
 */

// ── Study Log ─────────────────────────────────────────────────────────────────

/** A single recorded study event. */
export interface StudyLogEntry {
  id: string;
  assignment_id: string;
  /** YYYY-MM-DD local date the event occurred. */
  date: string;
  /** What happened. */
  event: "started" | "completed" | "skipped" | "deferred";
  /** Hours the scheduler had allocated for this block. */
  planned_hours: number;
  /** Hours the user actually spent (null if skipped/deferred). */
  actual_hours: number | null;
  /** Course / subject for aggregation. */
  course: string;
  /** Assignment type for aggregation. */
  type: string;
  /** ISO timestamp of when the event was recorded. */
  created_at: string;
}

// ── Course Profile ────────────────────────────────────────────────────────────

/**
 * A per-course behavioural profile derived from the study log.
 * Used by the adaptive scorer to adjust effort estimates and scores.
 */
export interface CourseProfile {
  course: string;
  /** Σ(actual_hours) / Σ(planned_hours) across completed entries. */
  avg_accuracy_ratio: number;
  /** Fraction of entries that were skipped (0–1). */
  skip_rate: number;
  /** Average actual hours per completed task. */
  avg_completion_hours: number;
  /** Consecutive on-time completion streak (most recent). */
  streak: number;
  /** Total entries used to compute this profile. */
  sample_size: number;
}

// ── Drift Analysis ────────────────────────────────────────────────────────────

/** Output of the replan detector. */
export interface DriftAnalysis {
  /** Overall drift score (0 = on track, 1 = completely off). */
  drift_score: number;
  /** Whether the system recommends an automatic replan. */
  should_replan: boolean;
  /** Human-readable reason when should_replan is true. */
  reason: string | null;
  /** Total planned hours missed in the analysis window. */
  missed_hours: number;
  /** Assignment IDs at risk of missing their deadline. */
  at_risk_assignments: string[];
}

// ── Score Modifier Result ─────────────────────────────────────────────────────

/**
 * Breakdown of how the adaptive layer modified a base score.
 * Attached to each ScoredAssignment for transparency / debugging.
 */
export interface ScoreModifiers {
  /** Base score from Phase 1 scorer. */
  base_score: number;
  /** Multiplier from effort accuracy history. */
  effort_modifier: number;
  /** Multiplier from course difficulty signals. */
  difficulty_modifier: number;
  /** Multiplier from completion momentum / streak. */
  momentum_modifier: number;
  /** Final adapted score (base × all modifiers). */
  adapted_score: number;
}

// ── Fatigue Signals ───────────────────────────────────────────────────────────

/** Fatigue assessment for a single day. */
export interface FatigueSignal {
  date: string;
  /** Original max capacity (hours). */
  original_capacity: number;
  /** Adjusted capacity after fatigue rules. */
  adjusted_capacity: number;
  /** Which rule triggered the reduction, if any. */
  reason: string | null;
}
