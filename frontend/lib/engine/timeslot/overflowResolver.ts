/**
 * Overflow Resolver (Stability-Aware)
 *
 * Converts overflow from an error state into an optimization opportunity.
 * Operates on day-level ScheduleDay[] — modifying allocations so that when
 * the time-slot allocator re-runs, the overflow is eliminated or minimised.
 *
 * Stability Integration
 * ─────────────────────
 * When `previous_placements` is provided, every strategy prefers keeping
 * blocks on their previously-scheduled days before considering new ones.
 * This reduces schedule churn at the source, so the downstream stability
 * guard has less work to do (or nothing at all).
 *
 * Strategy Cascade (applied in order)
 * ────────────────────────────────────
 * 0. REANCHOR        — Try the block's previous day first (stability-first).
 *
 * 1. PUSH-FORWARD    — Move overflow block to the next single day
 *                       with enough remaining capacity.
 *
 * 2. CROSS-DAY SPLIT — Distribute overflow across multiple future days
 *                       proportional to their available capacity.
 *                       Previous days get a stability bonus in sort order.
 *
 * 3. COMPRESS        — On the overflow day, shrink lower-priority blocks
 *                       to reclaim minutes for higher-priority ones.
 *                       Blocks stable on their previous day are shielded.
 *
 * 4. YIELD           — If strategies 0–3 can't fully resolve overflow,
 *                       mark remaining blocks as unresolvable and emit
 *                       a "needs_replan" signal.
 *
 * Invariants
 * ──────────
 * - Never exceeds daily capacity (`max_hours_per_day` or window capacity).
 * - High-priority blocks are never compressed or deferred.
 * - Deterministic: same input → same output.
 * - Pure function: no side effects.
 */

import type { ScheduleDay, ScheduledBlock } from "../types";
import type { OverflowBlock, TimeWindow } from "./types";
import {
  hoursToMinutes,
  minutesToHours,
  totalWindowMinutes,
} from "./timeUtils";
import { parseDateKey, addDays, toDateKey } from "../dateUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A placement with a temporal weight indicating recency (0–1, higher = more recent). */
export interface WeightedPlacement {
  date: string;
  /** Recency weight: 1.0 = most recent schedule, decays for older ones. */
  weight: number;
}

/** Resolution applied to a single overflow block. */
export interface ResolutionAction {
  assignment_id: string;
  title: string;
  /** Strategy that resolved (or failed to resolve) this block. */
  strategy:
    | "reanchored"
    | "pushed_forward"
    | "cross_day_split"
    | "compressed_peer"
    | "unresolvable";
  /** Minutes that were resolved by this action. */
  resolved_minutes: number;
  /** Minutes still remaining after this action (0 = fully resolved). */
  remaining_minutes: number;
  /** The date the block was pushed to (for push-forward / reanchor). */
  target_date?: string;
  /** Dates the block was split across (for cross-day split). */
  split_dates?: string[];
  /** Details about what was compressed (for compress). */
  compressed_block?: {
    assignment_id: string;
    title: string;
    original_minutes: number;
    reduced_minutes: number;
  };
}

/** The complete result of overflow resolution. */
export interface OverflowResolutionResult {
  /** The adjusted schedule days (ready for time-slot re-allocation). */
  adjusted_days: ScheduleDay[];
  /** Actions taken for each overflow block. */
  actions: ResolutionAction[];
  /** Overflow blocks that could not be resolved by any strategy. */
  unresolved: OverflowBlock[];
  /** Whether a full replan is recommended due to unresolvable overflow. */
  needs_replan: boolean;
  /** Summary statistics. */
  stats: {
    total_overflow_minutes: number;
    resolved_minutes: number;
    unresolved_minutes: number;
    reanchored_count: number;
    pushed_count: number;
    split_count: number;
    compressed_count: number;
    unresolvable_count: number;
  };
}

/** Configuration for the overflow resolver. */
export interface OverflowResolverConfig {
  /** Maximum hours per day (must match scheduler constraints). */
  max_hours_per_day: number;
  /** Availability windows for capacity calculation. */
  availability: TimeWindow[];
  /** Per-weekday window overrides. */
  day_overrides?: Partial<Record<number, TimeWindow[]>>;
  /** Days of the week to exclude (0 = Sunday, 6 = Saturday). */
  excluded_days?: number[];
  /**
   * How far ahead (days) the push-forward strategy can look.
   * Default: 7.
   */
  push_lookahead_days?: number;
  /**
   * Minimum percentage of a low-priority block to preserve when compressing.
   * Value between 0 and 1. Default: 0.5 (never compress below 50%).
   */
  min_compression_ratio?: number;
  /**
   * Minimum fragment size in minutes for cross-day splitting.
   * Fragments smaller than this are not created. Default: 30.
   */
  min_split_fragment_minutes?: number;
  /**
   * Maximum number of days to split a single block across.
   * Default: 3.
   */
  max_split_days?: number;

  // ── Stability-aware fields ──────────────────────────────────────────

  /**
   * Previous placements: assignment_id → weighted dates from schedule history.
   * Each entry records a date and a recency weight (0–1).
   * Higher weights indicate more recent schedules and receive stronger bias.
   * Pass `null` or omit to disable stability bias (cold start).
   */
  previous_placements?: Map<string, WeightedPlacement[]> | null;
  /**
   * Base bonus capacity-sort weight for previous-day slots in cross-day split.
   * Scaled by the placement's temporal weight. Default: 120.
   * Effective bonus = stability_bonus_minutes × weight.
   */
  stability_bonus_minutes?: number;
  /**
   * Base compression shield ratio for stable blocks.
   * Scaled by the placement's temporal weight.
   * Effective shield = min_compression_ratio + (shield − min_ratio) × weight.
   * Default: 0.75.
   */
  stable_block_compression_shield?: number;
}

// ── Priority ranking ──────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

function priorityRank(p: "low" | "medium" | "high"): number {
  return PRIORITY_RANK[p] ?? 0;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deep-clone ScheduleDay[] so mutations don't affect the original. */
function cloneDays(days: ScheduleDay[]): ScheduleDay[] {
  return days.map((d) => ({
    ...d,
    tasks: d.tasks.map((t) => ({ ...t })),
  }));
}

/** Resolve window capacity for a date in minutes. */
function dayCapacityMinutes(
  dateKey: string,
  config: OverflowResolverConfig,
): number {
  const d = parseDateKey(dateKey);
  if (!d) return 0;

  if (config.excluded_days?.includes(d.getDay())) return 0;

  const dayOfWeek = d.getDay();
  const overrides = config.day_overrides?.[dayOfWeek];
  const windows = (overrides && overrides.length > 0)
    ? overrides
    : config.availability;

  const windowCap = totalWindowMinutes(windows);
  const hoursCap = hoursToMinutes(config.max_hours_per_day);

  return Math.min(windowCap, hoursCap);
}

/** Remaining capacity in minutes for a day (accounting for existing blocks). */
function remainingCapacity(day: ScheduleDay, maxMinutes: number): number {
  const usedMinutes = hoursToMinutes(day.total_hours);
  return Math.max(maxMinutes - usedMinutes, 0);
}

/**
 * Find or create a ScheduleDay in the array for the given date.
 * Returns the day and its capacity in minutes.
 */
function ensureDay(
  dateKey: string,
  days: ScheduleDay[],
  config: OverflowResolverConfig,
): { day: ScheduleDay; capacityMinutes: number } | null {
  const dayCap = dayCapacityMinutes(dateKey, config);
  if (dayCap <= 0) return null;

  let day = days.find((d) => d.date === dateKey);
  if (!day) {
    day = {
      date: dateKey,
      tasks: [],
      total_hours: 0,
      remaining_hours: minutesToHours(dayCap),
    };
    days.push(day);
    days.sort((a, b) => a.date.localeCompare(b.date));
  }

  return { day, capacityMinutes: dayCap };
}

/** Places a block fragment on a specific day. Mutates the day in place. */
function placeFragment(
  day: ScheduleDay,
  block: OverflowBlock,
  minutes: number,
  capacityMinutes: number,
  partIndex: number,
  totalParts: number,
): void {
  const hours = minutesToHours(minutes);

  const newBlock: ScheduledBlock = {
    assignment_id: block.assignment_id,
    title: block.title,
    course: block.course,
    hours,
    priority: block.priority,
    is_partial: true,
    part: partIndex,
    total_parts: totalParts,
  };

  day.tasks.push(newBlock);
  day.total_hours = Math.round(
    day.tasks.reduce((sum, t) => sum + t.hours, 0) * 100,
  ) / 100;
  day.remaining_hours = Math.round(
    (minutesToHours(capacityMinutes) - day.total_hours) * 100,
  ) / 100;
}

/** Get the weighted placements for this assignment (stability context). */
function getWeightedPlacements(
  assignmentId: string,
  config: OverflowResolverConfig,
): WeightedPlacement[] {
  return config.previous_placements?.get(assignmentId) ?? [];
}

/**
 * Get the weight for a specific date. Returns 0 if the date was never a
 * previous placement. Returns the highest weight if the date appears in
 * multiple history snapshots.
 */
function getDateWeight(
  assignmentId: string,
  dateKey: string,
  config: OverflowResolverConfig,
): number {
  const placements = getWeightedPlacements(assignmentId, config);
  let maxWeight = 0;
  for (const p of placements) {
    if (p.date === dateKey && p.weight > maxWeight) {
      maxWeight = p.weight;
    }
  }
  return maxWeight;
}

/** Check if a date was a previous placement (any weight > 0). */
function isPreviousDate(
  assignmentId: string,
  dateKey: string,
  config: OverflowResolverConfig,
): boolean {
  return getDateWeight(assignmentId, dateKey, config) > 0;
}

// ── Strategy 0: Reanchor (stability-first) ────────────────────────────────────

/**
 * Before trying generic push-forward, attempt to place the overflow block
 * back on one of its previously-scheduled days. If any previous day has
 * enough capacity, place it there — zero churn for this block.
 */
function tryReanchor(
  overflowBlock: OverflowBlock,
  days: ScheduleDay[],
  config: OverflowResolverConfig,
): ResolutionAction | null {
  const placements = getWeightedPlacements(overflowBlock.assignment_id, config);
  if (placements.length === 0) return null;

  const neededMinutes = overflowBlock.overflow_minutes;

  // Sort by weight descending — prefer the most recently scheduled day.
  const sorted = [...placements].sort((a, b) => b.weight - a.weight);

  // De-duplicate dates (keep highest weight, which is first after sort).
  const seen = new Set<string>();
  const uniqueDates: string[] = [];
  for (const p of sorted) {
    if (!seen.has(p.date)) {
      seen.add(p.date);
      uniqueDates.push(p.date);
    }
  }

  for (const prevDate of uniqueDates) {
    const d = parseDateKey(prevDate);
    if (!d) continue;
    if (config.excluded_days?.includes(d.getDay())) continue;

    const result = ensureDay(prevDate, days, config);
    if (!result) continue;

    const remaining = remainingCapacity(result.day, result.capacityMinutes);
    if (remaining < neededMinutes) continue;

    placeFragment(result.day, overflowBlock, neededMinutes, result.capacityMinutes, 1, 1);

    return {
      assignment_id: overflowBlock.assignment_id,
      title: overflowBlock.title,
      strategy: "reanchored",
      resolved_minutes: neededMinutes,
      remaining_minutes: 0,
      target_date: prevDate,
    };
  }

  return null;
}

// ── Strategy 1: Push Forward ──────────────────────────────────────────────────

/**
 * Attempts to push an overflow block to a future day with remaining capacity.
 * Prefers the previous day if it has capacity (stability bias), then scans
 * forward from the overflow date.
 */
function tryPushForward(
  overflowBlock: OverflowBlock,
  overflowDate: string,
  days: ScheduleDay[],
  config: OverflowResolverConfig,
  lookahead: number,
): ResolutionAction | null {
  const anchor = parseDateKey(overflowDate);
  if (!anchor) return null;

  const neededMinutes = overflowBlock.overflow_minutes;

  // Scan forward from the day after the overflow date.
  for (let offset = 1; offset <= lookahead; offset++) {
    const candidateDate = addDays(anchor, offset);
    const candidateKey = toDateKey(candidateDate);

    if (config.excluded_days?.includes(candidateDate.getDay())) continue;

    const result = ensureDay(candidateKey, days, config);
    if (!result) continue;

    const remaining = remainingCapacity(result.day, result.capacityMinutes);
    if (remaining < neededMinutes) continue;

    placeFragment(result.day, overflowBlock, neededMinutes, result.capacityMinutes, 1, 1);

    return {
      assignment_id: overflowBlock.assignment_id,
      title: overflowBlock.title,
      strategy: "pushed_forward",
      resolved_minutes: neededMinutes,
      remaining_minutes: 0,
      target_date: candidateKey,
    };
  }

  return null;
}

// ── Strategy 2: Cross-Day Split (Stability-Aware) ─────────────────────────────

interface CapacitySlot {
  dateKey: string;
  available: number;
  capacityMinutes: number;
  /** Temporal weight from previous placements (0 = never used, 1 = most recent). */
  placementWeight: number;
}

/**
 * Builds a sorted list of future days with capacity.
 * Previous days get a stability bonus scaled by their temporal weight.
 */
function buildCapacityMap(
  overflowBlock: OverflowBlock,
  overflowDate: string,
  days: ScheduleDay[],
  config: OverflowResolverConfig,
  lookahead: number,
): CapacitySlot[] {
  const anchor = parseDateKey(overflowDate);
  if (!anchor) return [];

  const baseBonus = config.stability_bonus_minutes ?? 120;
  const slots: CapacitySlot[] = [];

  for (let offset = 1; offset <= lookahead; offset++) {
    const candidateDate = addDays(anchor, offset);
    const candidateKey = toDateKey(candidateDate);

    if (config.excluded_days?.includes(candidateDate.getDay())) continue;

    const dayCap = dayCapacityMinutes(candidateKey, config);
    if (dayCap <= 0) continue;

    const existingDay = days.find((d) => d.date === candidateKey);
    const used = existingDay ? hoursToMinutes(existingDay.total_hours) : 0;
    const available = Math.max(dayCap - used, 0);

    if (available > 0) {
      const weight = getDateWeight(
        overflowBlock.assignment_id,
        candidateKey,
        config,
      );

      slots.push({
        dateKey: candidateKey,
        available,
        capacityMinutes: dayCap,
        placementWeight: weight,
      });
    }
  }

  // Sort: weighted bonus (bonus × weight) then by available capacity descending.
  // Recent previous days (weight ≈ 1) get full bonus; older ones get partial.
  slots.sort((a, b) => {
    const aSort = a.available + (baseBonus * a.placementWeight);
    const bSort = b.available + (baseBonus * b.placementWeight);
    return bSort - aSort;
  });

  return slots;
}

/**
 * Distributes overflow minutes across multiple future days.
 * Previous days are preferred via stability bonus in sort order.
 */
function tryCrossDaySplit(
  overflowBlock: OverflowBlock,
  overflowDate: string,
  days: ScheduleDay[],
  config: OverflowResolverConfig,
  lookahead: number,
  minFragmentMinutes: number,
  maxSplitDays: number,
): ResolutionAction | null {
  const neededMinutes = overflowBlock.overflow_minutes;

  const capacitySlots = buildCapacityMap(
    overflowBlock,
    overflowDate,
    days,
    config,
    lookahead,
  );
  if (capacitySlots.length === 0) return null;

  const placements: Array<{ dateKey: string; minutes: number; capacityMinutes: number }> = [];
  let remainingToPlace = neededMinutes;

  for (const slot of capacitySlots) {
    if (remainingToPlace <= 0) break;
    if (placements.length >= maxSplitDays) break;

    const toPlace = Math.min(remainingToPlace, slot.available);

    if (toPlace < minFragmentMinutes && remainingToPlace > toPlace) {
      continue;
    }

    placements.push({
      dateKey: slot.dateKey,
      minutes: toPlace,
      capacityMinutes: slot.capacityMinutes,
    });

    remainingToPlace -= toPlace;
  }

  if (placements.length === 0) return null;

  const totalPlaced = placements.reduce((s, p) => s + p.minutes, 0);
  if (totalPlaced === 0) return null;

  const totalParts = placements.length;
  const splitDates: string[] = [];

  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const result = ensureDay(placement.dateKey, days, config);
    if (!result) continue;

    placeFragment(
      result.day,
      overflowBlock,
      placement.minutes,
      result.capacityMinutes,
      i + 1,
      totalParts,
    );
    splitDates.push(placement.dateKey);
  }

  return {
    assignment_id: overflowBlock.assignment_id,
    title: overflowBlock.title,
    strategy: "cross_day_split",
    resolved_minutes: totalPlaced,
    remaining_minutes: Math.max(neededMinutes - totalPlaced, 0),
    split_dates: splitDates,
  };
}

// ── Strategy 3: Compress Lower-Priority (Stability-Aware) ─────────────────────

/**
 * On the overflow day, find lower-priority blocks and shrink them.
 *
 * Stability-aware: blocks that are stable on their current day (present in
 * previous_placements for this day) have a higher compression shield — they
 * are harder to compress, protecting established schedule patterns.
 */
function tryCompress(
  overflowBlock: OverflowBlock,
  overflowDate: string,
  days: ScheduleDay[],
  config: OverflowResolverConfig,
  minRatio: number,
): ResolutionAction | null {
  const day = days.find((d) => d.date === overflowDate);
  if (!day) return null;

  const overflowPriority = priorityRank(overflowBlock.priority);
  const neededMinutes = overflowBlock.overflow_minutes;
  const baseShield = config.stable_block_compression_shield ?? 0.75;
  let reclaimedMinutes = 0;
  let lastCompressed: ResolutionAction["compressed_block"] | undefined;

  // Sort tasks by priority ascending (lowest first — best compression targets).
  // Within same priority, compress lowest-weight blocks first (temporal bias).
  const compressTargets = [...day.tasks]
    .map((task, idx) => ({
      task,
      idx,
      weight: getDateWeight(task.assignment_id, overflowDate, config),
    }))
    .filter(({ task }) => priorityRank(task.priority) < overflowPriority)
    .sort((a, b) => {
      // Primary: priority ascending.
      const priDiff = priorityRank(a.task.priority) - priorityRank(b.task.priority);
      if (priDiff !== 0) return priDiff;
      // Secondary: lowest weight first (compress non-recent first).
      return a.weight - b.weight;
    });

  for (const { task, idx, weight } of compressTargets) {
    if (reclaimedMinutes >= neededMinutes) break;

    const original = hoursToMinutes(task.hours);

    // Shield scales with temporal weight: recent placements are harder to compress.
    // effectiveRatio = minRatio + (baseShield − minRatio) × weight
    // At weight=1 (most recent): full shield.  At weight=0: no shield.
    const effectiveRatio = weight > 0
      ? Math.max(minRatio, minRatio + (baseShield - minRatio) * weight)
      : minRatio;
    const minPreserve = Math.ceil(original * effectiveRatio);
    const maxReclaim = original - minPreserve;

    if (maxReclaim <= 0) continue;

    const toReclaim = Math.min(maxReclaim, neededMinutes - reclaimedMinutes);
    const newMinutes = original - toReclaim;

    day.tasks[idx] = {
      ...task,
      hours: minutesToHours(newMinutes),
    };

    reclaimedMinutes += toReclaim;

    lastCompressed = {
      assignment_id: task.assignment_id,
      title: task.title,
      original_minutes: original,
      reduced_minutes: newMinutes,
    };
  }

  if (reclaimedMinutes === 0) return null;

  const placedMinutes = Math.min(reclaimedMinutes, neededMinutes);
  const placedHours = minutesToHours(placedMinutes);

  const newBlock: ScheduledBlock = {
    assignment_id: overflowBlock.assignment_id,
    title: overflowBlock.title,
    course: overflowBlock.course,
    hours: placedHours,
    priority: overflowBlock.priority,
    is_partial: true,
  };

  day.tasks.push(newBlock);

  day.total_hours = Math.round(
    day.tasks.reduce((sum, t) => sum + t.hours, 0) * 100,
  ) / 100;

  const dayCap = dayCapacityMinutes(overflowDate, config);
  day.remaining_hours = Math.round(
    (minutesToHours(dayCap) - day.total_hours) * 100,
  ) / 100;

  return {
    assignment_id: overflowBlock.assignment_id,
    title: overflowBlock.title,
    strategy: "compressed_peer",
    resolved_minutes: placedMinutes,
    remaining_minutes: Math.max(neededMinutes - placedMinutes, 0),
    compressed_block: lastCompressed,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * resolveOverflow (Stability-Aware)
 *
 * Takes the scheduler's day-level output and the overflow blocks detected
 * by the time-slot allocator, then applies a cascade of resolution strategies
 * to eliminate or minimise the overflow.
 *
 * Strategy cascade:
 *   0. Reanchor (try previous day first — stability bias)
 *   1. Push-forward (single-day, first-fit)
 *   2. Cross-day split (multi-day, previous days preferred)
 *   3. Compress (shrink lower-priority; stable blocks shielded)
 *   4. Yield (mark unresolvable → needs_replan)
 *
 * @param days           — ScheduleDay[] from the scheduler output.
 * @param overflowBlocks — OverflowBlock[] from the time-slot allocator.
 * @param dayDates       — Map of overflow block assignment_id → overflow date.
 * @param config         — Resolver configuration (capacity, windows, stability).
 */
export function resolveOverflow(
  days: ScheduleDay[],
  overflowBlocks: OverflowBlock[],
  dayDates: Map<string, string>,
  config: OverflowResolverConfig,
): OverflowResolutionResult {
  // No overflow — short-circuit.
  if (overflowBlocks.length === 0) {
    return {
      adjusted_days: days,
      actions: [],
      unresolved: [],
      needs_replan: false,
      stats: {
        total_overflow_minutes: 0,
        resolved_minutes: 0,
        unresolved_minutes: 0,
        reanchored_count: 0,
        pushed_count: 0,
        split_count: 0,
        compressed_count: 0,
        unresolvable_count: 0,
      },
    };
  }

  const lookahead    = config.push_lookahead_days ?? 7;
  const minRatio     = config.min_compression_ratio ?? 0.5;
  const minFragment  = config.min_split_fragment_minutes ?? 30;
  const maxSplitDays = config.max_split_days ?? 3;

  const adjusted = cloneDays(days);

  const actions: ResolutionAction[] = [];
  const unresolved: OverflowBlock[] = [];

  let totalOverflow = 0;
  let resolvedMinutes = 0;
  let reanchoredCount = 0;
  let pushedCount = 0;
  let splitCount = 0;
  let compressedCount = 0;
  let unresolvableCount = 0;

  // Sort overflow blocks: high priority first → resolved preferentially.
  const sorted = [...overflowBlocks].sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
  );

  for (const block of sorted) {
    totalOverflow += block.overflow_minutes;
    const overflowDate = dayDates.get(block.assignment_id) ?? "";

    // Skip "block_too_small" — these are intentionally too small, not recoverable.
    if (block.reason === "block_too_small") {
      unresolved.push(block);
      unresolvableCount++;
      actions.push({
        assignment_id: block.assignment_id,
        title: block.title,
        strategy: "unresolvable",
        resolved_minutes: 0,
        remaining_minutes: block.overflow_minutes,
      });
      continue;
    }

    // ── Strategy 0: Reanchor (stability-first) ────────────────────────────
    if (config.previous_placements && config.previous_placements.size > 0) {
      const reanchorResult = tryReanchor(block, adjusted, config);
      if (reanchorResult && reanchorResult.remaining_minutes === 0) {
        actions.push(reanchorResult);
        resolvedMinutes += reanchorResult.resolved_minutes;
        reanchoredCount++;
        continue;
      }
    }

    // ── Strategy 1: Push forward (single day) ───────────────────────────
    const pushResult = tryPushForward(block, overflowDate, adjusted, config, lookahead);
    if (pushResult && pushResult.remaining_minutes === 0) {
      actions.push(pushResult);
      resolvedMinutes += pushResult.resolved_minutes;
      pushedCount++;
      continue;
    }

    // ── Strategy 2: Cross-day split (multi-day, stability-aware) ────────
    const splitResult = tryCrossDaySplit(
      block,
      overflowDate,
      adjusted,
      config,
      lookahead,
      minFragment,
      maxSplitDays,
    );

    if (splitResult && splitResult.remaining_minutes === 0) {
      actions.push(splitResult);
      resolvedMinutes += splitResult.resolved_minutes;
      splitCount++;
      continue;
    }

    // Partial split — track what was placed, cascade the remainder.
    let currentRemainder = block.overflow_minutes;

    if (splitResult && splitResult.resolved_minutes > 0) {
      actions.push(splitResult);
      resolvedMinutes += splitResult.resolved_minutes;
      splitCount++;
      currentRemainder = splitResult.remaining_minutes;
    }

    // ── Strategy 3: Compress (stability-aware shielding) ────────────────
    const compressBlock: OverflowBlock = {
      ...block,
      overflow_minutes: currentRemainder,
    };

    const compressResult = tryCompress(compressBlock, overflowDate, adjusted, config, minRatio);

    if (compressResult && compressResult.remaining_minutes === 0) {
      actions.push(compressResult);
      resolvedMinutes += compressResult.resolved_minutes;
      compressedCount++;
      continue;
    }

    if (compressResult && compressResult.resolved_minutes > 0) {
      actions.push(compressResult);
      resolvedMinutes += compressResult.resolved_minutes;
      compressedCount++;
      currentRemainder = compressResult.remaining_minutes;
    }

    // Compress reclaimed some — try cross-day split on what's left.
    if (currentRemainder > 0 && currentRemainder < block.overflow_minutes) {
      const finalRemainder: OverflowBlock = { ...block, overflow_minutes: currentRemainder };
      const finalSplit = tryCrossDaySplit(
        finalRemainder,
        overflowDate,
        adjusted,
        config,
        lookahead,
        minFragment,
        maxSplitDays,
      );

      if (finalSplit && finalSplit.remaining_minutes === 0) {
        actions.push(finalSplit);
        resolvedMinutes += finalSplit.resolved_minutes;
        splitCount++;
        continue;
      }

      if (finalSplit && finalSplit.resolved_minutes > 0) {
        actions.push(finalSplit);
        resolvedMinutes += finalSplit.resolved_minutes;
        splitCount++;
        currentRemainder = finalSplit.remaining_minutes;
      }
    }

    // ── Strategy 4: Yield — mark unresolvable ───────────────────────────
    if (currentRemainder > 0) {
      const unresolvedBlock: OverflowBlock = { ...block, overflow_minutes: currentRemainder };
      unresolved.push(unresolvedBlock);
      unresolvableCount++;
      actions.push({
        assignment_id: block.assignment_id,
        title: block.title,
        strategy: "unresolvable",
        resolved_minutes: 0,
        remaining_minutes: currentRemainder,
      });
    }
  }

  const unresolvedMinutes = unresolved.reduce((s, b) => s + b.overflow_minutes, 0);

  return {
    adjusted_days: adjusted,
    actions,
    unresolved,
    needs_replan: unresolvableCount > 0,
    stats: {
      total_overflow_minutes: totalOverflow,
      resolved_minutes: resolvedMinutes,
      unresolved_minutes: unresolvedMinutes,
      reanchored_count: reanchoredCount,
      pushed_count: pushedCount,
      split_count: splitCount,
      compressed_count: compressedCount,
      unresolvable_count: unresolvableCount,
    },
  };
}

// ── Convenience utilities ─────────────────────────────────────────────────────

/**
 * Utility to build the `dayDates` map from a TimeSlottedSchedule's day list.
 */
export function buildOverflowDateMap(
  days: Array<{ date: string; overflow: { blocks: OverflowBlock[] } | null }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const day of days) {
    if (!day.overflow) continue;
    for (const block of day.overflow.blocks) {
      if (!map.has(block.assignment_id)) {
        map.set(block.assignment_id, day.date);
      }
    }
  }
  return map;
}

/**
 * A timestamped schedule snapshot for the history ring buffer.
 * Used by buildWeightedPlacementsMap to compute real-time decay.
 */
export interface ScheduleSnapshot {
  /** The schedule days for this snapshot. */
  days: ScheduleDay[];
  /** Unix timestamp (ms) when this schedule was generated. */
  timestamp: number;
}

// ── Temporal decay constants ──────────────────────────────────────────────────

/**
 * Default half-life in days for temporal decay.
 *
 * With halfLife = 2.0:
 *   0 days elapsed → weight 1.0
 *   1 day elapsed  → weight 0.71
 *   2 days elapsed → weight 0.50
 *   3 days elapsed → weight 0.35
 *   7 days elapsed → weight 0.09
 *
 * The decay constant k = ln(2) / halfLife.
 */
const DEFAULT_HALF_LIFE_DAYS = 2.0;
const MS_PER_DAY = 86_400_000;

/**
 * Computes a temporal weight for a snapshot based on real time elapsed.
 *
 *   weight = exp(−k × days_elapsed)
 *   where k = ln(2) / halfLifeDays
 *
 * @param snapshotTimestamp — When the snapshot was created (Unix ms).
 * @param nowTimestamp      — Current time (Unix ms).
 * @param halfLifeDays      — Days for weight to halve. Default: 2.0.
 * @returns Weight in (0, 1]. Clamps to a floor of 0.01 to avoid zero-weight.
 */
function temporalWeight(
  snapshotTimestamp: number,
  nowTimestamp: number,
  halfLifeDays: number,
): number {
  const elapsedMs = Math.max(0, nowTimestamp - snapshotTimestamp);
  const elapsedDays = elapsedMs / MS_PER_DAY;
  const k = Math.LN2 / halfLifeDays;
  const raw = Math.exp(-k * elapsedDays);
  // Floor at 0.01 so no snapshot is completely ignored.
  return Math.max(0.01, raw);
}

/**
 * Builds a temporally-weighted `previous_placements` map from timestamped
 * schedule snapshots. Weights are computed from real elapsed time using
 * exponential decay: weight = exp(−k × days_since_snapshot).
 *
 * This means:
 * - Rapid successive runs: older snapshots keep high weights (little time gap).
 * - Long gaps between runs: older snapshots naturally fade out.
 * - No artificial per-generation decay — timing drives everything.
 *
 * @param snapshots     — Array of timestamped snapshots, most recent FIRST.
 * @param halfLifeDays  — Days for a snapshot's weight to halve. Default: 2.0.
 * @param now           — Optional "now" timestamp for testing. Default: Date.now().
 * @returns Map<string, WeightedPlacement[]> ready for config.previous_placements.
 */
export function buildWeightedPlacementsMap(
  snapshots: ScheduleSnapshot[],
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
  now: number = Date.now(),
): Map<string, WeightedPlacement[]> {
  const map = new Map<string, WeightedPlacement[]>();

  for (const snapshot of snapshots) {
    const weight = temporalWeight(snapshot.timestamp, now, halfLifeDays);

    for (const day of snapshot.days) {
      for (const block of day.tasks) {
        const existing = map.get(block.assignment_id);
        const placement: WeightedPlacement = { date: day.date, weight };

        if (existing) {
          // Check if this date already exists — keep the higher weight.
          const existingIdx = existing.findIndex((p) => p.date === day.date);
          if (existingIdx !== -1) {
            if (existing[existingIdx].weight < weight) {
              existing[existingIdx] = placement;
            }
          } else {
            existing.push(placement);
          }
        } else {
          map.set(block.assignment_id, [placement]);
        }
      }
    }
  }

  return map;
}

/**
 * Legacy convenience: builds a placement map from a single schedule snapshot
 * with weight = 1.0 (treated as "just created now").
 * Use buildWeightedPlacementsMap for multi-snapshot, time-aware weighting.
 */
export function buildPreviousPlacementsMap(
  days: ScheduleDay[],
): Map<string, WeightedPlacement[]> {
  const now = Date.now();
  return buildWeightedPlacementsMap([{ days, timestamp: now }], DEFAULT_HALF_LIFE_DAYS, now);
}

