/**
 * Phase 2 — Replan Detector
 *
 * Analyses the gap between the current schedule and what the user has
 * actually accomplished. When drift exceeds a threshold, it signals
 * that the schedule should be regenerated.
 *
 * Drift is a composite score (0–1) computed from:
 *   Signal A (weight 0.4): missed hours in the last 3 days
 *   Signal B (weight 0.3): skip count in the last 3 days
 *   Signal C (weight 0.3): at-risk assignments (due soon, under-completed)
 *
 * Thresholds:
 *   drift > 0.5  → soft nudge (UI hint)
 *   drift > 0.75 → auto-replan recommended
 *
 * Cooldown: at most 1 auto-replan per REPLAN_COOLDOWN_MS to prevent loops.
 */

import type { StudyLogEntry, DriftAnalysis } from "./types";
import type { GeneratedSchedule, ScheduleDay } from "../types";
import { parseDateKey, toDateKey, todayMidnight, addDays, daysBetween } from "../dateUtils";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Analysis lookback window (days). */
const LOOKBACK_DAYS = 3;

/** Minimum drift score to show a passive nudge. */
const NUDGE_THRESHOLD = 0.5;

/** Minimum drift score to recommend automatic replanning. */
const AUTO_REPLAN_THRESHOLD = 0.75;

/** Minimum time between auto-replans (6 hours). */
export const REPLAN_COOLDOWN_MS = 6 * 60 * 60 * 1000;

// ── Signal Weights ────────────────────────────────────────────────────────────

const WEIGHT_MISSED_HOURS    = 0.4;
const WEIGHT_SKIP_COUNT      = 0.3;
const WEIGHT_AT_RISK         = 0.3;

/** Signal A saturates (reaches 1.0) at this many missed hours. */
const MISSED_HOURS_SATURATION = 6;

/** Signal B saturates at this many skips. */
const SKIP_COUNT_SATURATION = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Gathers planned hours per day from the schedule for the lookback window.
 */
function getPlannedHoursByDate(
  schedule: GeneratedSchedule,
  windowStart: string,
  windowEnd: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const day of schedule.days) {
    if (day.date >= windowStart && day.date <= windowEnd) {
      map.set(day.date, day.total_hours);
    }
  }
  return map;
}

/**
 * Gathers completed / skipped totals from the log for the lookback window.
 */
function getLogSummary(
  log: StudyLogEntry[],
  windowStart: string,
  windowEnd: string,
): { completedHours: number; skippedCount: number } {
  let completedHours = 0;
  let skippedCount = 0;

  for (const e of log) {
    if (e.date < windowStart || e.date > windowEnd) continue;
    if (e.event === "completed" && e.actual_hours != null) {
      completedHours += e.actual_hours;
    } else if (e.event === "skipped") {
      skippedCount++;
    }
  }

  return { completedHours, skippedCount };
}

/**
 * Identifies assignments at risk: due within 2 days AND less than 50% of
 * their allocated blocks have been completed in the log.
 */
function findAtRiskAssignments(
  schedule: GeneratedSchedule,
  log: StudyLogEntry[],
  today: Date,
): string[] {
  const todayKey = toDateKey(today);
  const urgentCutoff = toDateKey(addDays(today, 2));

  // Build a set of completed assignment IDs from the log.
  const completedHoursById = new Map<string, number>();
  for (const e of log) {
    if (e.event === "completed" && e.actual_hours != null) {
      completedHoursById.set(
        e.assignment_id,
        (completedHoursById.get(e.assignment_id) ?? 0) + e.actual_hours,
      );
    }
  }

  // Find assignments with blocks in the schedule that are due soon.
  const totalPlannedById = new Map<string, number>();
  const dueDateById = new Map<string, string>();

  for (const day of schedule.days) {
    for (const block of day.tasks) {
      totalPlannedById.set(
        block.assignment_id,
        (totalPlannedById.get(block.assignment_id) ?? 0) + block.hours,
      );
    }
  }

  // We also need due dates — extract from the schedule's day placements.
  // The last day a block appears is a proxy for "near due date".
  for (const day of schedule.days) {
    for (const block of day.tasks) {
      const existing = dueDateById.get(block.assignment_id);
      if (!existing || day.date > existing) {
        dueDateById.set(block.assignment_id, day.date);
      }
    }
  }

  const atRisk: string[] = [];

  for (const [id, totalPlanned] of totalPlannedById) {
    const lastDay = dueDateById.get(id);
    if (!lastDay || lastDay > urgentCutoff) continue; // Not urgent.

    const completed = completedHoursById.get(id) ?? 0;
    const completionRatio = totalPlanned > 0 ? completed / totalPlanned : 1;

    if (completionRatio < 0.5) {
      atRisk.push(id);
    }
  }

  return atRisk;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * analyzeDrift
 *
 * Computes a composite drift score from the gap between the planned
 * schedule and actual study behaviour.
 *
 * @param schedule   — the current generated schedule
 * @param log        — all study log entries (the function filters internally)
 * @param anchorDate — the "today" reference (defaults to real today)
 */
export function analyzeDrift(
  schedule: GeneratedSchedule,
  log: StudyLogEntry[],
  anchorDate?: Date,
): DriftAnalysis {
  const today = anchorDate ?? todayMidnight();
  const windowEnd   = toDateKey(today);
  const windowStart = toDateKey(addDays(today, -LOOKBACK_DAYS));

  // ── Signal A: Missed hours ────────────────────────────────────────────
  const plannedByDate = getPlannedHoursByDate(schedule, windowStart, windowEnd);
  let totalPlannedInWindow = 0;
  for (const hours of plannedByDate.values()) {
    totalPlannedInWindow += hours;
  }

  const { completedHours, skippedCount } = getLogSummary(log, windowStart, windowEnd);
  const missedHours = Math.max(totalPlannedInWindow - completedHours, 0);

  // Normalise: 0 at 0 missed, 1.0 at MISSED_HOURS_SATURATION.
  const signalA = Math.min(missedHours / MISSED_HOURS_SATURATION, 1.0);

  // ── Signal B: Skip count ──────────────────────────────────────────────
  const signalB = Math.min(skippedCount / SKIP_COUNT_SATURATION, 1.0);

  // ── Signal C: At-risk assignments ─────────────────────────────────────
  const atRisk = findAtRiskAssignments(schedule, log, today);
  // Binary-ish: any at-risk assignment pushes this toward 1.0.
  const signalC = atRisk.length > 0 ? Math.min(atRisk.length * 0.5, 1.0) : 0;

  // ── Composite drift score ─────────────────────────────────────────────
  const driftScore = Math.round(
    (signalA * WEIGHT_MISSED_HOURS +
     signalB * WEIGHT_SKIP_COUNT +
     signalC * WEIGHT_AT_RISK) * 100,
  ) / 100;

  const clampedDrift = Math.min(driftScore, 1.0);

  // ── Determine action ──────────────────────────────────────────────────
  let reason: string | null = null;
  if (clampedDrift > AUTO_REPLAN_THRESHOLD) {
    reason = `Significant drift detected: ${missedHours.toFixed(1)}h missed, ${skippedCount} skipped, ${atRisk.length} at-risk`;
  } else if (clampedDrift > NUDGE_THRESHOLD) {
    reason = `Study plan needs attention: ${missedHours.toFixed(1)}h behind schedule`;
  }

  return {
    drift_score: clampedDrift,
    should_replan: clampedDrift > NUDGE_THRESHOLD,
    reason,
    missed_hours: Math.round(missedHours * 100) / 100,
    at_risk_assignments: atRisk,
  };
}

// ── Cooldown Helper ───────────────────────────────────────────────────────────

/**
 * Checks whether enough time has passed since the last auto-replan.
 * Uses a simple timestamp comparison — the caller manages persistence.
 */
export function canAutoReplan(
  lastReplanTimestamp: number | null,
  now: number = Date.now(),
): boolean {
  if (lastReplanTimestamp === null) return true;
  return now - lastReplanTimestamp >= REPLAN_COOLDOWN_MS;
}
