/**
 * Phase 2 — Fatigue Guard
 *
 * Prevents burnout by dynamically reducing daily capacity when the
 * study log indicates overwork or disengagement.
 *
 * Rules
 * ─────
 * 1. Overwork yesterday     → reduce today by 20%
 * 2. 3 consecutive heavy days → reduce next day by 30%
 * 3. High skip rate (>50%)  → reduce next 2 days by 25%
 * 4. Minimum floor          → capacity never drops below MIN_CAPACITY_HOURS
 *
 * The guard also provides an anti-clustering post-pass that limits
 * same-course blocks per day.
 *
 * All functions are pure — they return new data structures, never mutate.
 */

import type { StudyLogEntry, FatigueSignal } from "./types";
import type { ScheduleDay, ScheduledBlock, ScheduleConstraints } from "../types";
import { toDateKey, addDays, todayMidnight, parseDateKey } from "../dateUtils";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Capacity never drops below this value (hours). */
const MIN_CAPACITY_HOURS = 1.0;

/** Lookback window for fatigue signals. */
const LOOKBACK_DAYS = 5;

/** Maximum same-course blocks per day before anti-clustering kicks in. */
const MAX_SAME_COURSE_PER_DAY = 2;

// ── Capacity Map Types ────────────────────────────────────────────────────────

export interface DayCapacity {
  date: string;
  max: number;
  used: number;
}

// ── Internal: per-day log summaries ───────────────────────────────────────────

interface DaySummary {
  date: string;
  total_actual_hours: number;
  total_planned_hours: number;
  completed_count: number;
  skipped_count: number;
  total_events: number;
}

function summarizeByDate(entries: StudyLogEntry[]): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const e of entries) {
    let s = map.get(e.date);
    if (!s) {
      s = {
        date: e.date,
        total_actual_hours: 0,
        total_planned_hours: 0,
        completed_count: 0,
        skipped_count: 0,
        total_events: 0,
      };
      map.set(e.date, s);
    }
    // Ignore "started" events in aggregation — they're informational.
    if (e.event === "started") continue;

    s.total_events++;
    s.total_planned_hours += e.planned_hours;
    if (e.event === "completed") {
      s.completed_count++;
      s.total_actual_hours += e.actual_hours ?? 0;
    } else if (e.event === "skipped") {
      s.skipped_count++;
    }
  }
  return map;
}

// ── Fatigue Rules ─────────────────────────────────────────────────────────────

/**
 * Computes a capacity reduction factor and reason for a given date.
 * Returns { factor: 0..1, reason } where factor is the multiplier on max capacity.
 * A factor of 1.0 means no reduction.
 */
function computeFatigueReduction(
  date: string,
  summaries: Map<string, DaySummary>,
  maxHoursPerDay: number,
): { factor: number; reason: string | null } {
  const dateObj = parseDateKey(date);
  if (!dateObj) return { factor: 1.0, reason: null };

  let worstFactor = 1.0;
  let worstReason: string | null = null;

  // ── Rule 1: Overwork yesterday → reduce by 20% ─────────────────────────
  const yesterday = toDateKey(addDays(dateObj, -1));
  const ySum = summaries.get(yesterday);
  if (ySum && ySum.total_actual_hours > maxHoursPerDay * 1.2) {
    const factor = 0.8;
    if (factor < worstFactor) {
      worstFactor = factor;
      worstReason = `Heavy study yesterday (${ySum.total_actual_hours.toFixed(1)}h)`;
    }
  }

  // ── Rule 2: 3 consecutive heavy days → reduce by 30% ──────────────────
  let consecutiveHeavy = 0;
  for (let i = 1; i <= 3; i++) {
    const dKey = toDateKey(addDays(dateObj, -i));
    const s = summaries.get(dKey);
    if (s && s.total_actual_hours >= maxHoursPerDay * 0.9) {
      consecutiveHeavy++;
    } else {
      break;
    }
  }
  if (consecutiveHeavy >= 3) {
    const factor = 0.7;
    if (factor < worstFactor) {
      worstFactor = factor;
      worstReason = "3+ consecutive heavy study days";
    }
  }

  // ── Rule 3: High skip rate in last 3 days → reduce by 25% ─────────────
  let totalEvents = 0;
  let totalSkips = 0;
  for (let i = 1; i <= 3; i++) {
    const dKey = toDateKey(addDays(dateObj, -i));
    const s = summaries.get(dKey);
    if (s) {
      totalEvents += s.total_events;
      totalSkips  += s.skipped_count;
    }
  }
  if (totalEvents >= 2 && totalSkips / totalEvents > 0.5) {
    const factor = 0.75;
    if (factor < worstFactor) {
      worstFactor = factor;
      worstReason = `High skip rate (${Math.round((totalSkips / totalEvents) * 100)}% in last 3 days)`;
    }
  }

  return { factor: worstFactor, reason: worstReason };
}

// ── Public API: applyFatigueGuard ─────────────────────────────────────────────

/**
 * Adjusts daily capacity based on recent study behaviour.
 *
 * @param capacityMap  — original capacity map from the scheduler
 * @param recentLog    — study log entries from the last LOOKBACK_DAYS
 * @param maxHoursPerDay — the user's configured daily max
 * @returns A new Map with adjusted capacities + an array of fatigue signals.
 */
export function applyFatigueGuard(
  capacityMap: Map<string, DayCapacity>,
  recentLog: StudyLogEntry[],
  maxHoursPerDay: number,
): { adjustedMap: Map<string, DayCapacity>; signals: FatigueSignal[] } {
  // If no log data, return the original map unchanged (cold start).
  if (recentLog.length === 0) {
    return { adjustedMap: new Map(capacityMap), signals: [] };
  }

  const summaries = summarizeByDate(recentLog);
  const adjustedMap = new Map<string, DayCapacity>();
  const signals: FatigueSignal[] = [];

  for (const [dateKey, cap] of capacityMap) {
    const { factor, reason } = computeFatigueReduction(dateKey, summaries, maxHoursPerDay);

    const adjustedMax = Math.max(
      Math.round(cap.max * factor * 100) / 100,
      MIN_CAPACITY_HOURS,
    );

    adjustedMap.set(dateKey, {
      ...cap,
      max: adjustedMax,
    });

    signals.push({
      date: dateKey,
      original_capacity: cap.max,
      adjusted_capacity: adjustedMax,
      reason,
    });
  }

  return { adjustedMap, signals };
}

// ── Public API: antiClusterPass ───────────────────────────────────────────────

/**
 * Post-allocation refinement that limits same-course blocks per day.
 *
 * When a day has > MAX_SAME_COURSE_PER_DAY blocks from one course, the
 * excess blocks are swapped with lighter-course blocks from adjacent days
 * (if a valid swap exists). This heuristic prevents monotonous study days.
 *
 * Note: This is a best-effort pass. If no valid swap exists, the schedule
 * is left as-is — correctness is never sacrificed for variety.
 *
 * @param days — the schedule days to refine
 * @returns A new array (does not mutate the input)
 */
export function antiClusterPass(days: ScheduleDay[]): ScheduleDay[] {
  if (days.length <= 1) return days;

  // Deep copy so we don't mutate the input.
  const result: ScheduleDay[] = days.map((d) => ({
    ...d,
    tasks: [...d.tasks],
  }));

  for (let i = 0; i < result.length; i++) {
    const day = result[i];

    // Count blocks per course.
    const courseCount = new Map<string, number>();
    for (const block of day.tasks) {
      courseCount.set(block.course, (courseCount.get(block.course) ?? 0) + 1);
    }

    // Find any course exceeding the limit.
    for (const [course, count] of courseCount) {
      if (count <= MAX_SAME_COURSE_PER_DAY) continue;

      const excess = count - MAX_SAME_COURSE_PER_DAY;

      // Try to swap excess blocks with adjacent days.
      for (let swapCount = 0; swapCount < excess; swapCount++) {
        // Find the last block of this course in the current day.
        const blockIdx = findLastIndex(day.tasks, (b) => b.course === course);
        if (blockIdx === -1) break;

        // Look for a swappable block in adjacent days.
        const swapped = trySwapWithAdjacent(result, i, blockIdx, course);
        if (!swapped) break; // No valid swap — accept the cluster.
      }
    }
  }

  // Recalculate total_hours per day after swaps.
  for (const day of result) {
    day.total_hours = Math.round(
      day.tasks.reduce((sum, t) => sum + t.hours, 0) * 100,
    ) / 100;
  }

  return result;
}

// ── Swap Helpers ──────────────────────────────────────────────────────────────

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

/**
 * Attempts to swap a block from day[dayIdx] with a different-course block
 * from an adjacent day. Returns true on success.
 */
function trySwapWithAdjacent(
  days: ScheduleDay[],
  dayIdx: number,
  blockIdx: number,
  clusteredCourse: string,
): boolean {
  const block = days[dayIdx].tasks[blockIdx];

  // Try the next day first, then the previous day.
  const adjacentIndices = [dayIdx + 1, dayIdx - 1].filter(
    (i) => i >= 0 && i < days.length,
  );

  for (const adjIdx of adjacentIndices) {
    const adjDay = days[adjIdx];

    // Find a block in the adjacent day from a DIFFERENT course with similar hours.
    const swapIdx = adjDay.tasks.findIndex(
      (b) =>
        b.course !== clusteredCourse &&
        Math.abs(b.hours - block.hours) <= 0.5 // similar size for fair swap
    );

    if (swapIdx !== -1) {
      // Perform the swap.
      const temp = adjDay.tasks[swapIdx];
      adjDay.tasks[swapIdx] = block;
      days[dayIdx].tasks[blockIdx] = temp;
      return true;
    }
  }

  return false;
}
