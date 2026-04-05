/**
 * AI Planner Engine — Type Definitions
 *
 * Pure data types with zero coupling to React, Zustand, or the backend.
 * These form the contract between the scheduling engine and its consumers.
 */

// ── Input Types ───────────────────────────────────────────────────────────────

/** The subset of Assignment fields the engine needs. */
export interface SchedulableAssignment {
  id: string;
  title: string;
  course: string;
  type: string;
  due_date: string;          // YYYY-MM-DD
  status: string;
  priority: "low" | "medium" | "high";
  /** Estimated total effort in hours. If omitted, the engine infers from `type`. */
  estimated_hours?: number;
}

/**
 * User-provided scheduling constraints.
 * All fields are optional — the engine falls back to sensible defaults.
 */
export interface ScheduleConstraints {
  /** Maximum study hours per day (default: 4). */
  max_hours_per_day?: number;
  /** Preferred start hour (0–23, default: 9). */
  preferred_start_hour?: number;
  /** Days of the week to exclude (0 = Sunday, 6 = Saturday). */
  excluded_days?: number[];
}

// ── Internal Types ────────────────────────────────────────────────────────────

/**
 * An assignment enriched with computed scheduling metadata.
 * This is an internal working type — never exposed to UI components.
 */
export interface ScoredAssignment {
  assignment: SchedulableAssignment;
  /** Computed priority score (higher = schedule first). */
  score: number;
  /** Days remaining until due_date from the schedule anchor date. */
  days_remaining: number;
  /** Total estimated effort (hours). */
  estimated_hours: number;
  /** Hours already allocated by the scheduler so far. */
  allocated_hours: number;
}

// ── Output Types ──────────────────────────────────────────────────────────────

/** A single task block allocated to a specific day. */
export interface ScheduledBlock {
  /** The assignment this block belongs to. */
  assignment_id: string;
  /** Human-readable title for UI display. */
  title: string;
  /** Course / subject name. */
  course: string;
  /** Hours allocated in this block. */
  hours: number;
  /** The priority that drove scheduling order. */
  priority: "low" | "medium" | "high";
  /** True when this block represents a partial chunk of a larger task. */
  is_partial: boolean;
  /** 1-indexed part number when split (e.g. "Part 2 of 4"). */
  part?: number;
  /** Total parts when split. */
  total_parts?: number;
}

/** One calendar day's worth of scheduled study blocks. */
export interface ScheduleDay {
  /** Date string in YYYY-MM-DD format. */
  date: string;
  /** Ordered list of study blocks for this day. */
  tasks: ScheduledBlock[];
  /** Total hours allocated on this day. */
  total_hours: number;
  /** Remaining capacity in hours. */
  remaining_hours: number;
}

/** The complete output of the scheduling engine. */
export interface GeneratedSchedule {
  /** Calendar days with allocated tasks (only days that have tasks). */
  days: ScheduleDay[];
  /** Assignments that could not be fully scheduled (not enough capacity). */
  unscheduled: Array<{
    assignment_id: string;
    title: string;
    reason: string;
    shortfall_hours: number;
  }>;
  /** Summary statistics. */
  stats: {
    total_assignments: number;
    scheduled_assignments: number;
    total_hours: number;
    days_span: number;
  };
}
