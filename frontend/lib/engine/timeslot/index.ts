/**
 * Time-Slot Allocator — Barrel Export
 *
 *   import { allocateTimeSlots, resolveOverflow } from "@/lib/engine/timeslot";
 */

// Types
export type {
  TimeWindow,
  TimeSlotPreferences,
  TimeSlot,
  BreakSlot,
  TimelineEntry,
  TimelineDay,
  TimeSlottedSchedule,
  OverflowBlock,
  OverflowDay,
} from "./types";

// Core allocator
export { allocateTimeSlots } from "./allocator";

// Overflow resolver
export {
  resolveOverflow,
  buildOverflowDateMap,
  buildPreviousPlacementsMap,
  buildWeightedPlacementsMap,
} from "./overflowResolver";
export type {
  WeightedPlacement,
  ScheduleSnapshot,
  ResolutionAction,
  OverflowResolutionResult,
  OverflowResolverConfig,
} from "./overflowResolver";

// Time utilities
export {
  decimalToHHMM,
  hhmmToDecimal,
  hoursToMinutes,
  minutesToHours,
  addMinutesToDecimal,
  totalWindowMinutes,
} from "./timeUtils";
