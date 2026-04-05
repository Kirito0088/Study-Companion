/**
 * AI Planner Engine — Schedule Generator
 *
 * The core scheduling algorithm. Takes scored assignments + user constraints
 * and produces a deterministic, day-by-day study plan.
 *
 * Algorithm Overview
 * ──────────────────
 * 1. Build a capacity map: one entry per available day, each with max_hours.
 * 2. Iterate assignments in score order (highest-priority first).
 * 3. For each assignment, find eligible days (today → due_date − 1).
 * 4. Spread the estimated hours across those days, respecting daily caps.
 * 5. When an assignment's hours exceed a single session, split it into
 *    multiple blocks across consecutive days.
 * 6. Assignments that cannot be fully allocated go into `unscheduled`.
 *
 * Design Decisions
 * ────────────────
 * - The scheduler is a **pure function** — same input, same output, always.
 * - Days are represented as YYYY-MM-DD strings (local time), consistent
 *   with the rest of the app.
 * - The minimum block size is 0.5 h to avoid trivially small slots.
 * - The algorithm is greedy (score-ordered), not globally optimal. This is
 *   intentional: it's fast, predictable, and easy to reason about. A future
 *   LLM layer can re-order or override the output.
 */

import type {
  SchedulableAssignment,
  ScheduleConstraints,
  ScoredAssignment,
  ScheduleDay,
  ScheduledBlock,
  GeneratedSchedule,
} from "./types";
import { todayMidnight, addDays, dateRange, toDateKey, parseDateKey, daysBetween } from "./dateUtils";
import { scoreAssignments } from "./scorer";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_HOURS = 4;
const MIN_BLOCK_HOURS = 0.5;

// ── Capacity Map ──────────────────────────────────────────────────────────────

interface DayCapacity {
  date: string;
  max: number;
  used: number;
}

/**
 * Builds the capacity map spanning from `start` to `end` (inclusive),
 * skipping excluded weekdays.
 */
function buildCapacityMap(
  start: Date,
  end: Date,
  maxHours: number,
  excludedDays: number[],
): Map<string, DayCapacity> {
  const keys = dateRange(start, end, excludedDays);
  const map = new Map<string, DayCapacity>();
  for (const key of keys) {
    map.set(key, { date: key, max: maxHours, used: 0 });
  }
  return map;
}

// ── Block Allocator ───────────────────────────────────────────────────────────

/**
 * Allocates `hoursNeeded` for a single assignment across the given eligible
 * days. Mutates the capacity map in place. Returns allocated blocks.
 */
function allocateBlocks(
  scored: ScoredAssignment,
  eligibleKeys: string[],
  capacityMap: Map<string, DayCapacity>,
): { blocks: ScheduledBlock[]; allocated: number } {
  const blocks: ScheduledBlock[] = [];
  let remaining = scored.estimated_hours;

  // First pass: evenly distribute across all eligible days with remaining capacity.
  // This produces a realistic "spread" rather than front-loading everything.
  const availableDays = eligibleKeys.filter((k) => {
    const cap = capacityMap.get(k);
    return cap != null && cap.max - cap.used >= MIN_BLOCK_HOURS;
  });

  if (availableDays.length === 0) {
    return { blocks, allocated: 0 };
  }

  // Target hours per day (bounded by capacity).
  const idealPerDay = Math.max(remaining / availableDays.length, MIN_BLOCK_HOURS);

  for (const dayKey of availableDays) {
    if (remaining <= 0) break;

    const cap = capacityMap.get(dayKey)!;
    const available = cap.max - cap.used;
    if (available < MIN_BLOCK_HOURS) continue;

    // Allocate the smaller of: ideal, remaining, and available.
    const hours = Math.min(idealPerDay, remaining, available);
    // Round to nearest 0.5 for cleaner display, but only if enough remains.
    const roundedHours = remaining - hours < MIN_BLOCK_HOURS
      ? remaining   // absorb the remainder to avoid orphan slivers
      : Math.round(hours * 2) / 2;

    if (roundedHours < MIN_BLOCK_HOURS) continue;

    const actualHours = Math.min(roundedHours, remaining, available);

    cap.used += actualHours;
    remaining -= actualHours;

    blocks.push({
      assignment_id: scored.assignment.id,
      title: scored.assignment.title,
      course: scored.assignment.course,
      hours: Math.round(actualHours * 100) / 100,
      priority: scored.assignment.priority,
      is_partial: false, // corrected in post-processing
    });
  }

  // Second pass: if capacity remains but first pass didn't fully allocate
  // (ideal was rounded down), fill greedily.
  if (remaining > MIN_BLOCK_HOURS / 2) {
    for (const dayKey of availableDays) {
      if (remaining <= 0) break;
      const cap = capacityMap.get(dayKey)!;
      const available = cap.max - cap.used;
      if (available < MIN_BLOCK_HOURS) continue;

      const hours = Math.min(remaining, available);
      cap.used += hours;
      remaining -= hours;

      blocks.push({
        assignment_id: scored.assignment.id,
        title: scored.assignment.title,
        course: scored.assignment.course,
        hours: Math.round(hours * 100) / 100,
        priority: scored.assignment.priority,
        is_partial: false,
      });
    }
  }

  const allocated = scored.estimated_hours - Math.max(remaining, 0);

  // Post-process: if multiple blocks exist, mark them as partial with part numbers.
  if (blocks.length > 1) {
    for (let i = 0; i < blocks.length; i++) {
      blocks[i].is_partial = true;
      blocks[i].part = i + 1;
      blocks[i].total_parts = blocks.length;
    }
  }

  return { blocks, allocated };
}

// ── Schedule Assembler ────────────────────────────────────────────────────────

/**
 * Converts the flat block list into a day-by-day schedule grouped by date.
 */
function assembleSchedule(
  blocksByDate: Map<string, ScheduledBlock[]>,
  capacityMap: Map<string, DayCapacity>,
): ScheduleDay[] {
  const days: ScheduleDay[] = [];

  // Iterate the capacity map in chronological order (Map preserves insertion order,
  // and dateRange returns sorted keys).
  for (const [dateKey, cap] of capacityMap) {
    const tasks = blocksByDate.get(dateKey) ?? [];
    if (tasks.length === 0) continue;

    days.push({
      date: dateKey,
      tasks,
      total_hours: Math.round(cap.used * 100) / 100,
      remaining_hours: Math.round((cap.max - cap.used) * 100) / 100,
    });
  }

  return days;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * generateSchedule
 *
 * Entry point for the scheduling engine.
 *
 * @param assignments  — raw assignment list (typically from the Zustand store).
 * @param constraints  — optional user preferences.
 * @param anchorDate   — the "today" reference point (useful for testing).
 * @returns A deterministic GeneratedSchedule.
 */
export function generateSchedule(
  assignments: SchedulableAssignment[],
  constraints: ScheduleConstraints = {},
  anchorDate?: Date,
): GeneratedSchedule {
  const today = anchorDate ?? todayMidnight();
  const maxHours = constraints.max_hours_per_day ?? DEFAULT_MAX_HOURS;
  const excludedDays = constraints.excluded_days ?? [];

  // 1. Score and sort assignments.
  const scored = scoreAssignments(assignments, today);

  if (scored.length === 0) {
    return {
      days: [],
      unscheduled: [],
      stats: { total_assignments: 0, scheduled_assignments: 0, total_hours: 0, days_span: 0 },
    };
  }

  // 2. Determine the full date range we need capacity for.
  //    The latest due_date across all scored assignments defines the horizon.
  let latestDue = today;
  for (const s of scored) {
    const due = parseDateKey(s.assignment.due_date);
    if (due && due.getTime() > latestDue.getTime()) {
      latestDue = due;
    }
  }
  // Extend one day past the latest due for breathing room.
  const horizonEnd = addDays(latestDue, 1);

  // 3. Build the day-capacity map.
  const capacityMap = buildCapacityMap(today, horizonEnd, maxHours, excludedDays);

  // 4. Allocate blocks per assignment (highest score first).
  const blocksByDate = new Map<string, ScheduledBlock[]>();
  const unscheduled: GeneratedSchedule["unscheduled"] = [];
  let totalAllocated = 0;
  let scheduledCount = 0;

  for (const s of scored) {
    // Eligible days: today up to (due_date − 1), i.e. the day before it's due.
    const dueDate = parseDateKey(s.assignment.due_date)!;
    const dayBeforeDue = addDays(dueDate, -1);
    const eligible = dateRange(today, dayBeforeDue, excludedDays).filter(
      (k) => capacityMap.has(k),
    );

    // Edge case: due today or tomorrow with no eligible slot → allow due-day itself.
    if (eligible.length === 0) {
      const dueDayKey = s.assignment.due_date;
      if (capacityMap.has(dueDayKey)) {
        eligible.push(dueDayKey);
      }
    }

    const { blocks, allocated } = allocateBlocks(s, eligible, capacityMap);

    // Assign blocks to their date slots.
    for (let i = 0; i < blocks.length; i++) {
      const dateKey = eligible[i] ?? eligible[eligible.length - 1];
      if (!blocksByDate.has(dateKey)) {
        blocksByDate.set(dateKey, []);
      }
      blocksByDate.get(dateKey)!.push(blocks[i]);
    }

    s.allocated_hours = allocated;
    totalAllocated += allocated;

    if (allocated >= s.estimated_hours - 0.01) {
      scheduledCount++;
    } else {
      unscheduled.push({
        assignment_id: s.assignment.id,
        title: s.assignment.title,
        reason:
          allocated === 0
            ? "No available capacity before deadline"
            : `Only ${allocated.toFixed(1)} of ${s.estimated_hours.toFixed(1)} hours could be scheduled`,
        shortfall_hours: Math.round((s.estimated_hours - allocated) * 100) / 100,
      });
    }
  }

  // 5. Assemble and return.
  const days = assembleSchedule(blocksByDate, capacityMap);
  const daysSpan = days.length > 0 ? daysBetween(
    parseDateKey(days[days.length - 1].date)!,
    parseDateKey(days[0].date)!,
  ) + 1 : 0;

  return {
    days,
    unscheduled,
    stats: {
      total_assignments: scored.length,
      scheduled_assignments: scheduledCount,
      total_hours: Math.round(totalAllocated * 100) / 100,
      days_span: daysSpan,
    },
  };
}
