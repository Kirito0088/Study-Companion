/**
 * AI Planner Engine — Public Barrel Export
 *
 * Single import point for all engine modules:
 *   import { generateSchedule, scoreAssignments } from "@/lib/engine";
 */

// Types — re-export everything so consumers don't need to know the file structure.
export type {
  SchedulableAssignment,
  ScheduleConstraints,
  ScoredAssignment,
  ScheduledBlock,
  ScheduleDay,
  GeneratedSchedule,
} from "./types";

// Core modules.
export { generateSchedule } from "./scheduler";
export { scoreAssignments, estimateEffort } from "./scorer";

// Date utilities (for consumers that need date-key helpers).
export {
  parseDateKey,
  toDateKey,
  todayMidnight,
  addDays,
  daysBetween,
  dateRange,
} from "./dateUtils";
