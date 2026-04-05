/**
 * Time-Slot Allocator — Type Definitions
 *
 * Types for converting day-level hour allocations into concrete
 * time-of-day blocks with start/end times, breaks, and ordering rules.
 * Includes overflow tracking for blocks that exceed available windows.
 */

// ── Input Types ───────────────────────────────────────────────────────────────

/**
 * A single availability window within a day.
 * Times are in 24-hour format as decimal hours (e.g. 18.5 = 6:30 PM).
 */
export interface TimeWindow {
  /** Start time (0–24, decimal). E.g. 9.0 = 9:00 AM, 14.5 = 2:30 PM. */
  start: number;
  /** End time (0–24, decimal). Must be > start. */
  end: number;
  /** Optional label for the window (e.g. "Morning", "Evening"). */
  label?: string;
}

/**
 * User preferences for time-slot allocation.
 * All fields are optional — the allocator falls back to sensible defaults.
 */
export interface TimeSlotPreferences {
  /**
   * Available study windows per day.
   * Multiple windows allow split availability (e.g. morning + evening).
   * Default: [{ start: 18, end: 22 }] (6 PM – 10 PM).
   */
  availability?: TimeWindow[];

  /**
   * Per-weekday overrides (0 = Sunday, 6 = Saturday).
   * If a day has an override, its windows replace the default.
   */
  day_overrides?: Partial<Record<number, TimeWindow[]>>;

  /**
   * Break duration in minutes between consecutive blocks (default: 10).
   */
  break_minutes?: number;

  /**
   * Minimum block size in minutes (default: 30).
   * Blocks shorter than this are merged with adjacent blocks.
   */
  min_block_minutes?: number;

  /**
   * Maximum consecutive study minutes before a forced break (default: 90).
   * After this duration, a break is auto-inserted even within a single block.
   */
  max_focus_minutes?: number;

  /**
   * Duration of forced focus-breaks in minutes (default: 15).
   */
  focus_break_minutes?: number;
}

// ── Output Types ──────────────────────────────────────────────────────────────

/** A concrete time-positioned study block. */
export interface TimeSlot {
  /** Assignment this slot belongs to. */
  assignment_id: string;
  /** Human-readable title. */
  title: string;
  /** Course / subject. */
  course: string;
  /** Date in YYYY-MM-DD format. */
  date: string;
  /** Start time as "HH:MM" (24-hour). */
  start_time: string;
  /** End time as "HH:MM" (24-hour). */
  end_time: string;
  /** Duration in minutes. */
  duration_minutes: number;
  /** Priority carried from the scheduler. */
  priority: "low" | "medium" | "high";
  /** Whether this is a partial chunk of a larger assignment. */
  is_partial: boolean;
  /** Part number when split. */
  part?: number;
  /** Total parts when split. */
  total_parts?: number;
}

/** A break slot inserted between study blocks. */
export interface BreakSlot {
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  type: "short_break" | "focus_break";
}

/** A single entry in the timeline — either a study slot or a break. */
export type TimelineEntry =
  | { kind: "study"; slot: TimeSlot }
  | { kind: "break"; slot: BreakSlot };

// ── Overflow Types ────────────────────────────────────────────────────────────

/** A study block that could not be placed within available windows. */
export interface OverflowBlock {
  /** The assignment this block belongs to. */
  assignment_id: string;
  /** Human-readable title. */
  title: string;
  /** Course / subject. */
  course: string;
  /** Minutes that could not be placed. */
  overflow_minutes: number;
  /** Why this block couldn't be placed. */
  reason:
    | "no_window_capacity"     // all windows exhausted
    | "block_too_small"        // below min_block_minutes
    | "partial_placement"      // block was split across window boundary, remainder unplaced
    | "focus_split_overflow";  // focus-break splitting caused overflow past window end
  /** Priority for UI display. */
  priority: "low" | "medium" | "high";
}

/** Per-day overflow summary. */
export interface OverflowDay {
  date: string;
  /** Total minutes that couldn't be placed on this day. */
  overflow_minutes: number;
  /** Total minutes available in windows on this day. */
  available_minutes: number;
  /** Total minutes the scheduler wanted to allocate. */
  requested_minutes: number;
  /** Individual blocks that overflowed. */
  blocks: OverflowBlock[];
}

// ── Day & Schedule output ─────────────────────────────────────────────────────

/** One day's complete timeline with positioned blocks, breaks, and overflow. */
export interface TimelineDay {
  date: string;
  /** Ordered timeline of study blocks and breaks. */
  entries: TimelineEntry[];
  /** Just the study slots (convenience accessor). */
  study_slots: TimeSlot[];
  /** Total study minutes (excluding breaks). */
  total_study_minutes: number;
  /** Total break minutes. */
  total_break_minutes: number;
  /** Overflow data for blocks that couldn't be placed. Null if no overflow. */
  overflow: OverflowDay | null;
}

/** The complete time-slotted schedule. */
export interface TimeSlottedSchedule {
  days: TimelineDay[];
  /** Summary statistics. */
  stats: {
    total_study_minutes: number;
    total_break_minutes: number;
    total_slots: number;
    days_count: number;
  };
  /** Aggregate overflow across all days. Null if no overflow anywhere. */
  overflow: {
    total_overflow_minutes: number;
    affected_days: number;
    affected_assignments: string[];
    blocks: OverflowBlock[];
  } | null;
}

