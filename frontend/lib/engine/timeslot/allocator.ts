/**
 * Time-Slot Allocator
 *
 * Transforms day-level hour allocations (from the scheduler) into concrete
 * time-positioned blocks within user-defined availability windows.
 *
 * Pipeline
 * ────────
 * 1. For each ScheduleDay, resolve the available time windows.
 * 2. Order the day's ScheduledBlocks to avoid back-to-back heavy tasks.
 * 3. Walk through the windows, placing each block at the next available
 *    cursor position with breaks inserted between them.
 * 4. Split blocks that exceed max_focus_minutes with focus-breaks.
 * 5. Track every block (or fragment) that can't be placed → overflow.
 *
 * Overflow Handling
 * ─────────────────
 * Every block that cannot be placed is recorded in an OverflowBlock with
 * a reason code. Nothing is silently dropped. The output contains both
 * per-day and aggregate overflow so the UI / replan detector can act on it.
 *
 * The allocator is a pure function — same input, same output, always.
 */

import type { ScheduleDay, ScheduledBlock } from "../types";
import { parseDateKey } from "../dateUtils";
import type {
  TimeSlotPreferences,
  TimeWindow,
  TimeSlot,
  TimelineEntry,
  TimelineDay,
  TimeSlottedSchedule,
  OverflowBlock,
  OverflowDay,
} from "./types";
import {
  decimalToHHMM,
  hoursToMinutes,
  addMinutesToDecimal,
  totalWindowMinutes,
} from "./timeUtils";

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_AVAILABILITY: TimeWindow[] = [
  { start: 18, end: 22, label: "Evening" },
];

const DEFAULT_BREAK_MINUTES = 10;
const DEFAULT_MIN_BLOCK_MINUTES = 30;
const DEFAULT_MAX_FOCUS_MINUTES = 90;
const DEFAULT_FOCUS_BREAK_MINUTES = 15;

// ── Task intensity classification ─────────────────────────────────────────────

/** Types considered "heavy" for back-to-back avoidance. */
const HEAVY_TYPES = new Set(["exam", "project", "essay", "paper"]);

function isHeavyBlock(block: ScheduledBlock): boolean {
  return block.priority === "high" || HEAVY_TYPES.has(block.course.toLowerCase());
}

/**
 * Reorders blocks to avoid consecutive heavy tasks.
 * Strategy: interleave heavy and light blocks.
 */
function interleaveBlocks(blocks: ScheduledBlock[]): ScheduledBlock[] {
  if (blocks.length <= 1) return [...blocks];

  const heavy: ScheduledBlock[] = [];
  const light: ScheduledBlock[] = [];

  for (const b of blocks) {
    if (isHeavyBlock(b)) {
      heavy.push(b);
    } else {
      light.push(b);
    }
  }

  // Interleave: heavy, light, heavy, light...
  const result: ScheduledBlock[] = [];
  let hi = 0;
  let li = 0;

  // Start with heavy (they need first-chair positioning).
  while (hi < heavy.length || li < light.length) {
    if (hi < heavy.length) result.push(heavy[hi++]);
    if (li < light.length) result.push(light[li++]);
  }

  return result;
}

// ── Window resolution ─────────────────────────────────────────────────────────

/**
 * Resolves the time windows for a specific date, considering per-weekday
 * overrides.
 */
function resolveWindows(
  date: string,
  prefs: Required<Pick<TimeSlotPreferences, "availability" | "day_overrides">>,
): TimeWindow[] {
  const d = parseDateKey(date);
  if (!d) return prefs.availability;

  const dayOfWeek = d.getDay(); // 0 = Sunday
  const override = prefs.day_overrides[dayOfWeek];
  if (override && override.length > 0) return override;

  return prefs.availability;
}

/**
 * Validates and normalises windows: ensures start < end, sorts by start,
 * and merges any overlaps.
 */
function normaliseWindows(windows: TimeWindow[]): TimeWindow[] {
  // Filter invalid windows.
  const valid = windows.filter((w) => w.end > w.start && w.start >= 0 && w.end <= 24);
  if (valid.length === 0) return [];

  // Sort by start time.
  valid.sort((a, b) => a.start - b.start);

  // Merge overlaps.
  const merged: TimeWindow[] = [{ ...valid[0] }];
  for (let i = 1; i < valid.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = valid[i];
    if (curr.start <= prev.end) {
      // Overlap — extend the previous window.
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

// ── Focus-Break Splitter ──────────────────────────────────────────────────────

/**
 * Splits a block that exceeds maxFocusMinutes into smaller segments
 * with focus-breaks inserted between them.
 *
 * Now returns `remainingMinutes` so overflow can be tracked by the caller.
 */
function splitWithFocusBreaks(
  block: ScheduledBlock,
  startDecimal: number,
  maxFocusMin: number,
  focusBreakMin: number,
  windowEnd: number,
): { entries: TimelineEntry[]; endCursor: number; placedMinutes: number } {
  const totalMinutes = hoursToMinutes(block.hours);
  const entries: TimelineEntry[] = [];
  let cursor = startDecimal;
  let placedMinutes = 0;

  let remainingMinutes = totalMinutes;

  while (remainingMinutes > 0) {
    const segmentMin = Math.min(remainingMinutes, maxFocusMin);
    const segmentEnd = addMinutesToDecimal(cursor, segmentMin);

    // Don't exceed window.
    if (segmentEnd > windowEnd) break;

    entries.push({
      kind: "study",
      slot: {
        assignment_id: block.assignment_id,
        title: block.title,
        course: block.course,
        date: "", // filled by caller
        start_time: decimalToHHMM(cursor),
        end_time: decimalToHHMM(segmentEnd),
        duration_minutes: segmentMin,
        priority: block.priority,
        is_partial: block.is_partial,
        part: block.part,
        total_parts: block.total_parts,
      },
    });

    cursor = segmentEnd;
    remainingMinutes -= segmentMin;
    placedMinutes += segmentMin;

    // Insert focus break if more study remains and there's room.
    if (remainingMinutes > 0) {
      const breakEnd = addMinutesToDecimal(cursor, focusBreakMin);
      if (breakEnd > windowEnd) break;

      entries.push({
        kind: "break",
        slot: {
          date: "",
          start_time: decimalToHHMM(cursor),
          end_time: decimalToHHMM(breakEnd),
          duration_minutes: focusBreakMin,
          type: "focus_break",
        },
      });

      cursor = breakEnd;
    }
  }

  return { entries, endCursor: cursor, placedMinutes };
}

// ── Single-Day Allocator ──────────────────────────────────────────────────────

interface AllocateDayResult {
  timeline: TimelineDay;
  overflow: OverflowBlock[];
}

/**
 * Allocates a single day's blocks into time slots within the resolved windows.
 * Tracks every block that can't be fully placed as overflow.
 */
function allocateDay(
  day: ScheduleDay,
  windows: TimeWindow[],
  breakMin: number,
  minBlockMin: number,
  maxFocusMin: number,
  focusBreakMin: number,
): AllocateDayResult {
  const normalised = normaliseWindows(windows);
  const orderedBlocks = interleaveBlocks(day.tasks);

  const allEntries: TimelineEntry[] = [];
  const studySlots: TimeSlot[] = [];
  const overflowBlocks: OverflowBlock[] = [];

  let windowIdx = 0;
  let cursor: number = normalised.length > 0 ? normalised[0].start : 0;
  let blockIdx = 0;
  let totalStudyMin = 0;
  let totalBreakMin = 0;
  let prevBlockPlaced = false;

  // Track how many times we advance window for the SAME block to prevent loops.
  let windowAdvancesForCurrentBlock = 0;
  const MAX_WINDOW_ADVANCES = normalised.length + 1;

  while (blockIdx < orderedBlocks.length) {
    const block = orderedBlocks[blockIdx];
    const blockMinutes = hoursToMinutes(block.hours);

    // ── Guard: blocks below minimum → overflow with "block_too_small" ───
    if (blockMinutes < minBlockMin) {
      overflowBlocks.push({
        assignment_id: block.assignment_id,
        title: block.title,
        course: block.course,
        overflow_minutes: blockMinutes,
        reason: "block_too_small",
        priority: block.priority,
      });
      blockIdx++;
      windowAdvancesForCurrentBlock = 0;
      continue;
    }

    // ── Guard: no windows left → all remaining blocks overflow ──────────
    if (windowIdx >= normalised.length) {
      overflowBlocks.push({
        assignment_id: block.assignment_id,
        title: block.title,
        course: block.course,
        overflow_minutes: blockMinutes,
        reason: "no_window_capacity",
        priority: block.priority,
      });
      blockIdx++;
      continue;
    }

    // ── Guard: infinite loop detection ──────────────────────────────────
    if (windowAdvancesForCurrentBlock >= MAX_WINDOW_ADVANCES) {
      overflowBlocks.push({
        assignment_id: block.assignment_id,
        title: block.title,
        course: block.course,
        overflow_minutes: blockMinutes,
        reason: "no_window_capacity",
        priority: block.priority,
      });
      blockIdx++;
      windowAdvancesForCurrentBlock = 0;
      continue;
    }

    const window = normalised[windowIdx];

    // Ensure cursor is at or past window start.
    if (cursor < window.start) {
      cursor = window.start;
    }

    // Insert inter-block break if we just placed a block.
    if (prevBlockPlaced) {
      const breakEnd = addMinutesToDecimal(cursor, breakMin);

      if (breakEnd <= window.end) {
        allEntries.push({
          kind: "break",
          slot: {
            date: day.date,
            start_time: decimalToHHMM(cursor),
            end_time: decimalToHHMM(breakEnd),
            duration_minutes: breakMin,
            type: "short_break",
          },
        });
        totalBreakMin += breakMin;
        cursor = breakEnd;
      } else {
        // Break doesn't fit in this window — advance to next.
        windowIdx++;
        windowAdvancesForCurrentBlock++;
        prevBlockPlaced = false;
        continue;
      }
    }

    // Check if there's room in the current window.
    const remainingInWindow = hoursToMinutes(window.end - cursor);
    if (remainingInWindow < minBlockMin) {
      // Not enough room — advance to next window.
      windowIdx++;
      windowAdvancesForCurrentBlock++;
      prevBlockPlaced = false;
      continue;
    }

    // ── Place the block ─────────────────────────────────────────────────

    if (blockMinutes > maxFocusMin) {
      // Focus-break splitting.
      const { entries, endCursor, placedMinutes } = splitWithFocusBreaks(
        block,
        cursor,
        maxFocusMin,
        focusBreakMin,
        window.end,
      );

      for (const entry of entries) {
        if (entry.kind === "study") {
          entry.slot.date = day.date;
          studySlots.push(entry.slot);
          totalStudyMin += entry.slot.duration_minutes;
        } else {
          entry.slot.date = day.date;
          totalBreakMin += entry.slot.duration_minutes;
        }
        allEntries.push(entry);
      }

      cursor = endCursor;

      // Track partial overflow from focus splitting.
      const unplacedMinutes = blockMinutes - placedMinutes;
      if (unplacedMinutes > 0) {
        overflowBlocks.push({
          assignment_id: block.assignment_id,
          title: block.title,
          course: block.course,
          overflow_minutes: unplacedMinutes,
          reason: "focus_split_overflow",
          priority: block.priority,
        });
      }

      blockIdx++;
      windowAdvancesForCurrentBlock = 0;
      prevBlockPlaced = entries.some((e) => e.kind === "study");
    } else {
      // Block fits in one piece — check if it fits in the remaining window.
      const endDecimal = addMinutesToDecimal(cursor, blockMinutes);

      if (endDecimal > window.end) {
        // Doesn't fit in this window — try the next.
        windowIdx++;
        windowAdvancesForCurrentBlock++;
        prevBlockPlaced = false;
        continue;
      }

      const slot: TimeSlot = {
        assignment_id: block.assignment_id,
        title: block.title,
        course: block.course,
        date: day.date,
        start_time: decimalToHHMM(cursor),
        end_time: decimalToHHMM(endDecimal),
        duration_minutes: blockMinutes,
        priority: block.priority,
        is_partial: block.is_partial,
        part: block.part,
        total_parts: block.total_parts,
      };

      allEntries.push({ kind: "study", slot });
      studySlots.push(slot);
      totalStudyMin += blockMinutes;
      cursor = endDecimal;

      blockIdx++;
      windowAdvancesForCurrentBlock = 0;
      prevBlockPlaced = true;
    }
  }

  // ── Build per-day overflow summary ────────────────────────────────────

  const availableMinutes = totalWindowMinutes(normalised);
  const requestedMinutes = orderedBlocks.reduce((sum, b) => sum + hoursToMinutes(b.hours), 0);
  const dayOverflowMinutes = overflowBlocks.reduce((sum, b) => sum + b.overflow_minutes, 0);

  const overflow: OverflowDay | null = overflowBlocks.length > 0
    ? {
        date: day.date,
        overflow_minutes: dayOverflowMinutes,
        available_minutes: availableMinutes,
        requested_minutes: requestedMinutes,
        blocks: overflowBlocks,
      }
    : null;

  return {
    timeline: {
      date: day.date,
      entries: allEntries,
      study_slots: studySlots,
      total_study_minutes: totalStudyMin,
      total_break_minutes: totalBreakMin,
      overflow,
    },
    overflow: overflowBlocks,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * allocateTimeSlots
 *
 * Transforms day-level hour allocations into concrete time-positioned blocks.
 *
 * Overflow handling:
 * - Every block that can't be placed is tracked with a reason code.
 * - Per-day overflow is attached to each TimelineDay.
 * - Aggregate overflow is surfaced at the top level of the return value.
 * - Nothing is silently dropped.
 *
 * @param days   — ScheduleDay[] from the scheduler (Phase 1 or adaptive).
 * @param prefs  — user time-slot preferences (all optional).
 * @returns A TimeSlottedSchedule with positioned blocks, breaks, and overflow.
 */
export function allocateTimeSlots(
  days: ScheduleDay[],
  prefs: TimeSlotPreferences = {},
): TimeSlottedSchedule {
  const availability    = prefs.availability ?? DEFAULT_AVAILABILITY;
  const dayOverrides    = prefs.day_overrides ?? {};
  const breakMin        = prefs.break_minutes ?? DEFAULT_BREAK_MINUTES;
  const minBlockMin     = prefs.min_block_minutes ?? DEFAULT_MIN_BLOCK_MINUTES;
  const maxFocusMin     = prefs.max_focus_minutes ?? DEFAULT_MAX_FOCUS_MINUTES;
  const focusBreakMin   = prefs.focus_break_minutes ?? DEFAULT_FOCUS_BREAK_MINUTES;

  const resolvedPrefs = { availability, day_overrides: dayOverrides };

  const timelineDays: TimelineDay[] = [];
  let totalStudy = 0;
  let totalBreaks = 0;
  let totalSlots = 0;

  // Aggregate overflow tracking.
  const allOverflowBlocks: OverflowBlock[] = [];
  let affectedDayCount = 0;
  const affectedAssignmentIds = new Set<string>();

  for (const day of days) {
    if (day.tasks.length === 0) continue;

    const windows = resolveWindows(day.date, resolvedPrefs);
    const { timeline, overflow } = allocateDay(
      day,
      windows,
      breakMin,
      minBlockMin,
      maxFocusMin,
      focusBreakMin,
    );

    timelineDays.push(timeline);
    totalStudy  += timeline.total_study_minutes;
    totalBreaks += timeline.total_break_minutes;
    totalSlots  += timeline.study_slots.length;

    // Aggregate overflow.
    if (overflow.length > 0) {
      affectedDayCount++;
      for (const ob of overflow) {
        allOverflowBlocks.push(ob);
        affectedAssignmentIds.add(ob.assignment_id);
      }
    }
  }

  // Build aggregate overflow summary.
  const totalOverflowMinutes = allOverflowBlocks.reduce(
    (sum, b) => sum + b.overflow_minutes,
    0,
  );

  const aggregateOverflow = allOverflowBlocks.length > 0
    ? {
        total_overflow_minutes: totalOverflowMinutes,
        affected_days: affectedDayCount,
        affected_assignments: Array.from(affectedAssignmentIds),
        blocks: allOverflowBlocks,
      }
    : null;

  return {
    days: timelineDays,
    stats: {
      total_study_minutes: totalStudy,
      total_break_minutes: totalBreaks,
      total_slots: totalSlots,
      days_count: timelineDays.length,
    },
    overflow: aggregateOverflow,
  };
}
