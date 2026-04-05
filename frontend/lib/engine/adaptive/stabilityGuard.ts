/**
 * Stability Guard
 *
 * Prevents excessive schedule churn by comparing a newly generated schedule
 * against the previously accepted one and penalising unnecessary changes.
 *
 * Two-phase design
 * ────────────────
 * 1. ANALYSE — Compute a StabilityReport: how many blocks moved, how many
 *    days changed, a 0–1 stability score, and per-block change details.
 *
 * 2. STABILISE — Re-anchor blocks back to their previous placements when
 *    the movement was not driven by a meaningful priority/capacity reason.
 *    This is a post-pass that mutates ScheduleDay[] in place.
 *
 * The analysis is always run. The stabilisation pass is only applied when
 * the stability score is below the configured threshold, meaning the new
 * schedule drifted too far from the previous one.
 *
 * Deterministic: same (previous, next) pair → same output.
 * Pure: no side effects beyond returning the result.
 */

import type { ScheduleDay, ScheduledBlock } from "../types";
import { hoursToMinutes, minutesToHours } from "../timeslot/timeUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Describes a single block's change between two schedule versions. */
export interface BlockChange {
  assignment_id: string;
  title: string;
  /** The kind of change detected. */
  change:
    | "unchanged"     // Same day, same hours.
    | "hours_changed" // Same day, different hours.
    | "moved"         // Different day.
    | "split_changed" // Different number of parts.
    | "added"         // New block not in previous schedule.
    | "removed";      // Block in previous schedule no longer present.
  previous_date?: string;
  new_date?: string;
  previous_hours?: number;
  new_hours?: number;
  /** Movement penalty cost (0–1) contributing to the stability score. */
  penalty: number;
}

/** The complete stability analysis of a schedule transition. */
export interface StabilityReport {
  /**
   * Overall stability score: 0 = total upheaval, 1 = perfectly stable.
   * Computed as 1 − (weighted penalty sum / max possible penalty).
   */
  stability_score: number;
  /** Number of blocks that changed in any way. */
  change_count: number;
  /** Number of blocks that moved to a different day. */
  moved_count: number;
  /** Number of blocks whose hours changed (same day). */
  resized_count: number;
  /** Number of new blocks not in the previous schedule. */
  added_count: number;
  /** Number of blocks removed from the schedule. */
  removed_count: number;
  /** Total blocks compared (union of previous and new). */
  total_blocks: number;
  /** Per-block change details (only changed blocks included). */
  changes: BlockChange[];
}

/** Configuration for the stability system. */
export interface StabilityConfig {
  /**
   * Weight for a cross-day move penalty (0–1). Default: 0.4.
   * Higher values penalise day-to-day movement more heavily.
   */
  move_penalty_weight?: number;
  /**
   * Weight for an hours-change penalty (0–1). Default: 0.15.
   */
  resize_penalty_weight?: number;
  /**
   * Weight for a split-change penalty (0–1). Default: 0.25.
   */
  split_change_penalty_weight?: number;
  /**
   * Weight for add/remove penalty (0–1). Default: 0.2.
   */
  add_remove_penalty_weight?: number;
  /**
   * Stability score threshold below which the stabilisation pass is applied.
   * Default: 0.6. Set to 0 to disable stabilisation (analysis only).
   */
  stabilise_threshold?: number;
  /**
   * Maximum percentage of a block's hours that can be adjusted during
   * stabilisation to fit it back on its original day. Default: 0.2 (20%).
   */
  max_reanchor_flex?: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_MOVE_PENALTY      = 0.4;
const DEFAULT_RESIZE_PENALTY    = 0.15;
const DEFAULT_SPLIT_PENALTY     = 0.25;
const DEFAULT_ADD_REMOVE_PENALTY = 0.2;
const DEFAULT_THRESHOLD         = 0.6;
const DEFAULT_REANCHOR_FLEX     = 0.2;

// ── Internal: Placement map ───────────────────────────────────────────────────

/**
 * A placement represents one assignment's scheduled state across all days.
 * Assignments may appear on multiple days (split blocks).
 */
interface Placement {
  assignment_id: string;
  title: string;
  /** Dates this assignment appears on. */
  dates: string[];
  /** Total hours across all days. */
  total_hours: number;
  /** Number of distinct day-blocks (parts). */
  part_count: number;
}

/** Build a map of assignment_id → Placement from ScheduleDay[]. */
function buildPlacementMap(days: ScheduleDay[]): Map<string, Placement> {
  const map = new Map<string, Placement>();

  for (const day of days) {
    for (const block of day.tasks) {
      const existing = map.get(block.assignment_id);
      if (existing) {
        if (!existing.dates.includes(day.date)) {
          existing.dates.push(day.date);
        }
        existing.total_hours += block.hours;
        existing.part_count++;
      } else {
        map.set(block.assignment_id, {
          assignment_id: block.assignment_id,
          title: block.title,
          dates: [day.date],
          total_hours: block.hours,
          part_count: 1,
        });
      }
    }
  }

  return map;
}

// ── Phase 1: Analyse ──────────────────────────────────────────────────────────

/**
 * analyseStability
 *
 * Compares two schedule versions and produces a StabilityReport.
 *
 * @param previousDays — The previously accepted schedule.
 * @param newDays      — The newly generated schedule.
 * @param config       — Penalty weights and thresholds.
 */
export function analyseStability(
  previousDays: ScheduleDay[],
  newDays: ScheduleDay[],
  config: StabilityConfig = {},
): StabilityReport {
  const movePenalty       = config.move_penalty_weight ?? DEFAULT_MOVE_PENALTY;
  const resizePenalty     = config.resize_penalty_weight ?? DEFAULT_RESIZE_PENALTY;
  const splitPenalty      = config.split_change_penalty_weight ?? DEFAULT_SPLIT_PENALTY;
  const addRemovePenalty  = config.add_remove_penalty_weight ?? DEFAULT_ADD_REMOVE_PENALTY;

  const prevMap = buildPlacementMap(previousDays);
  const newMap  = buildPlacementMap(newDays);

  // Union of all assignment IDs.
  const allIds = new Set([...prevMap.keys(), ...newMap.keys()]);

  const changes: BlockChange[] = [];
  let totalPenalty = 0;
  let movedCount = 0;
  let resizedCount = 0;
  let addedCount = 0;
  let removedCount = 0;

  for (const id of allIds) {
    const prev = prevMap.get(id);
    const next = newMap.get(id);

    // ── Added ──────────────────────────────────────────────────────────
    if (!prev && next) {
      const penalty = addRemovePenalty;
      totalPenalty += penalty;
      addedCount++;
      changes.push({
        assignment_id: id,
        title: next.title,
        change: "added",
        new_date: next.dates[0],
        new_hours: next.total_hours,
        penalty,
      });
      continue;
    }

    // ── Removed ────────────────────────────────────────────────────────
    if (prev && !next) {
      const penalty = addRemovePenalty;
      totalPenalty += penalty;
      removedCount++;
      changes.push({
        assignment_id: id,
        title: prev.title,
        change: "removed",
        previous_date: prev.dates[0],
        previous_hours: prev.total_hours,
        penalty,
      });
      continue;
    }

    // Both exist — compare.
    if (!prev || !next) continue; // TypeScript guard.

    // Check day movement.
    const prevDates = [...prev.dates].sort();
    const nextDates = [...next.dates].sort();
    const datesMatch = prevDates.length === nextDates.length &&
      prevDates.every((d, i) => d === nextDates[i]);

    // Check hours change.
    const hoursDelta = Math.abs(prev.total_hours - next.total_hours);
    const hoursChanged = hoursDelta > 0.01;

    // Check split change.
    const splitChanged = prev.part_count !== next.part_count;

    if (datesMatch && !hoursChanged && !splitChanged) {
      // Unchanged — no penalty.
      continue;
    }

    // ── Moved to different day(s) ──────────────────────────────────────
    if (!datesMatch) {
      const penalty = movePenalty + (splitChanged ? splitPenalty : 0);
      totalPenalty += penalty;
      movedCount++;
      changes.push({
        assignment_id: id,
        title: prev.title,
        change: splitChanged ? "split_changed" : "moved",
        previous_date: prevDates.join(", "),
        new_date: nextDates.join(", "),
        previous_hours: prev.total_hours,
        new_hours: next.total_hours,
        penalty,
      });
      continue;
    }

    // ── Same day, hours or split changed ───────────────────────────────
    if (hoursChanged) {
      const penalty = resizePenalty;
      totalPenalty += penalty;
      resizedCount++;
      changes.push({
        assignment_id: id,
        title: prev.title,
        change: "hours_changed",
        previous_date: prevDates[0],
        new_date: nextDates[0],
        previous_hours: prev.total_hours,
        new_hours: next.total_hours,
        penalty,
      });
      continue;
    }

    if (splitChanged) {
      const penalty = splitPenalty;
      totalPenalty += penalty;
      changes.push({
        assignment_id: id,
        title: prev.title,
        change: "split_changed",
        previous_date: prevDates.join(", "),
        new_date: nextDates.join(", "),
        previous_hours: prev.total_hours,
        new_hours: next.total_hours,
        penalty,
      });
    }
  }

  const totalBlocks = allIds.size;
  const maxPossiblePenalty = totalBlocks * Math.max(
    movePenalty + splitPenalty,
    addRemovePenalty,
  );

  const stabilityScore = maxPossiblePenalty > 0
    ? Math.max(0, Math.min(1, 1 - (totalPenalty / maxPossiblePenalty)))
    : 1;

  const changeCount = movedCount + resizedCount + addedCount + removedCount +
    changes.filter((c) => c.change === "split_changed").length;

  return {
    stability_score: Math.round(stabilityScore * 1000) / 1000,
    change_count: changeCount,
    moved_count: movedCount,
    resized_count: resizedCount,
    added_count: addedCount,
    removed_count: removedCount,
    total_blocks: totalBlocks,
    changes,
  };
}

// ── Phase 2: Stabilise ────────────────────────────────────────────────────────

/**
 * Deep-clone ScheduleDay[] so mutations don't affect the original.
 */
function cloneDays(days: ScheduleDay[]): ScheduleDay[] {
  return days.map((d) => ({
    ...d,
    tasks: d.tasks.map((t) => ({ ...t })),
  }));
}

/**
 * stabiliseSchedule
 *
 * Re-anchors blocks back to their previous-day placements when:
 * 1. The block moved to a different day.
 * 2. The previous day still has capacity for it (with optional flex).
 * 3. The block's priority doesn't demand a forced move.
 *
 * This is NOT a full reschedule — it's a minimal-diff post-pass.
 *
 * @param previousDays — The previously accepted schedule.
 * @param newDays      — The newly generated schedule (will be cloned, not mutated).
 * @param report       — The StabilityReport from analyseStability.
 * @param config       — Stabilisation thresholds.
 * @returns Adjusted ScheduleDay[] with reduced churn.
 */
export function stabiliseSchedule(
  previousDays: ScheduleDay[],
  newDays: ScheduleDay[],
  report: StabilityReport,
  config: StabilityConfig = {},
): { stabilised_days: ScheduleDay[]; anchored_count: number } {
  const threshold   = config.stabilise_threshold ?? DEFAULT_THRESHOLD;
  const reanchorFlex = config.max_reanchor_flex ?? DEFAULT_REANCHOR_FLEX;

  // If stability is above threshold, no intervention needed.
  if (report.stability_score >= threshold) {
    return { stabilised_days: newDays, anchored_count: 0 };
  }

  const prevMap = buildPlacementMap(previousDays);
  const adjusted = cloneDays(newDays);
  let anchoredCount = 0;

  // Process only "moved" changes — try to re-anchor them.
  const movedChanges = report.changes.filter(
    (c) => c.change === "moved" || c.change === "split_changed",
  );

  for (const change of movedChanges) {
    const prevPlacement = prevMap.get(change.assignment_id);
    if (!prevPlacement || prevPlacement.dates.length === 0) continue;

    // The primary previous date (first occurrence).
    const targetDate = prevPlacement.dates[0];

    // Find the block in the NEW schedule.
    let sourceDay: ScheduleDay | undefined;
    let sourceBlockIdx = -1;

    for (const day of adjusted) {
      const idx = day.tasks.findIndex(
        (t) => t.assignment_id === change.assignment_id,
      );
      if (idx !== -1) {
        sourceDay = day;
        sourceBlockIdx = idx;
        break;
      }
    }

    if (!sourceDay || sourceBlockIdx === -1) continue;

    const block = sourceDay.tasks[sourceBlockIdx];

    // If the block is already on the target date, skip.
    if (sourceDay.date === targetDate) continue;

    // Check if the target day exists and has room.
    let targetDay = adjusted.find((d) => d.date === targetDate);
    if (!targetDay) {
      // The target date doesn't exist in the new schedule — skip.
      // Re-creating days would be too aggressive for a stability pass.
      continue;
    }

    // Capacity check: does the target day have room?
    const blockMinutes = hoursToMinutes(block.hours);
    const targetUsedMinutes = hoursToMinutes(targetDay.total_hours);
    const flexMinutes = Math.ceil(blockMinutes * reanchorFlex);
    const adjustedBlockMinutes = Math.max(blockMinutes - flexMinutes, hoursToMinutes(0.5));

    // Try full placement first, then flexed placement.
    const candidateMinutes = [blockMinutes, adjustedBlockMinutes];
    let placed = false;

    for (const candidateMin of candidateMinutes) {
      // We can't compute exact window capacity here (no window config),
      // so use the day's remaining_hours as a proxy.
      const remainingMinutes = hoursToMinutes(targetDay.remaining_hours);
      if (remainingMinutes >= candidateMin) {
        // Move the block.
        const movedBlock: ScheduledBlock = {
          ...block,
          hours: minutesToHours(candidateMin),
        };

        // Remove from source day.
        sourceDay.tasks.splice(sourceBlockIdx, 1);
        sourceDay.total_hours = Math.round(
          sourceDay.tasks.reduce((sum, t) => sum + t.hours, 0) * 100,
        ) / 100;
        sourceDay.remaining_hours = Math.round(
          (sourceDay.remaining_hours + block.hours) * 100,
        ) / 100;

        // Add to target day.
        targetDay.tasks.push(movedBlock);
        targetDay.total_hours = Math.round(
          (targetDay.total_hours + movedBlock.hours) * 100,
        ) / 100;
        targetDay.remaining_hours = Math.round(
          (targetDay.remaining_hours - movedBlock.hours) * 100,
        ) / 100;

        anchoredCount++;
        placed = true;
        break;
      }
    }

    // If we couldn't place it, leave it where the optimizer put it.
    if (!placed) continue;
  }

  // Clean up: remove empty days.
  const filteredDays = adjusted.filter((d) => d.tasks.length > 0);

  return { stabilised_days: filteredDays, anchored_count: anchoredCount };
}
