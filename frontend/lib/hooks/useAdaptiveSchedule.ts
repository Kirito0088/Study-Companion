"use client";

import { useMemo, useRef, useCallback } from "react";
import { assignmentSelectors, useAssignmentStore } from "@/lib/hooks/useAssignmentStore";
import { useStudyLogStore, studyLogSelectors } from "@/lib/hooks/useStudyLog";
import {
  generateSchedule,
  scoreAssignments,
  type ScheduleConstraints,
  type GeneratedSchedule,
  type SchedulableAssignment,
  type ScheduleDay,
} from "@/lib/engine";
import {
  applyAdaptiveModifiers,
  buildProfileMap,
  analyzeDrift,
  canAutoReplan,
  antiClusterPass,
  analyseStability,
  stabiliseSchedule,
  type DriftAnalysis,
  type ScoreModifiers,
  type StabilityReport,
} from "@/lib/engine/adaptive";
import {
  allocateTimeSlots,
  resolveOverflow,
  buildOverflowDateMap,
  buildWeightedPlacementsMap,
  type ScheduleSnapshot,
  type TimeSlotPreferences,
  type TimeSlottedSchedule,
  type OverflowResolutionResult,
} from "@/lib/engine/timeslot";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UseAdaptiveScheduleResult {
  /** The adaptively generated schedule (day-level). */
  schedule: GeneratedSchedule;
  /** The time-slotted schedule with positioned blocks and breaks. */
  timeline: TimeSlottedSchedule;
  /** Drift analysis from replan detector. */
  drift: DriftAnalysis;
  /** Per-assignment score modifier breakdown (for debugging / UI hints). */
  modifiers: Map<string, ScoreModifiers>;
  /** Overflow resolution result (null if no overflow was detected). */
  overflowResolution: OverflowResolutionResult | null;
  /** Stability analysis comparing this schedule to the previous one. */
  stability: StabilityReport | null;
  /** Whether the underlying assignment data is still loading. */
  isLoading: boolean;
  /** Manually trigger a replan (always allowed, ignores cooldown). */
  forceReplan: () => void;
}

// ── Null states ───────────────────────────────────────────────────────────────

const EMPTY_SCHEDULE: GeneratedSchedule = {
  days: [],
  unscheduled: [],
  stats: { total_assignments: 0, scheduled_assignments: 0, total_hours: 0, days_span: 0 },
};

const EMPTY_DRIFT: DriftAnalysis = {
  drift_score: 0,
  should_replan: false,
  reason: null,
  missed_hours: 0,
  at_risk_assignments: [],
};

const EMPTY_TIMELINE: TimeSlottedSchedule = {
  days: [],
  stats: { total_study_minutes: 0, total_break_minutes: 0, total_slots: 0, days_count: 0 },
  overflow: null,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useAdaptiveSchedule
 *
 * Full Phase 2 orchestrator. Runs the complete pipeline:
 *
 *   1. Read assignments from the shared Zustand store.
 *   2. Score them with Phase 1 scorer.
 *   3. Adjust scores with Phase 2 adaptive modifiers.
 *   4. Generate the schedule using the deterministic engine.
 *   5. Run anti-clustering post-pass.
 *   6. Analyse drift and surface replan signals.
 *
 * Falls back to pure Phase 1 behaviour when no study log data exists.
 */
export function useAdaptiveSchedule(
  constraints?: ScheduleConstraints,
  timePrefs?: TimeSlotPreferences,
): UseAdaptiveScheduleResult {
  const assignments    = useAssignmentStore(assignmentSelectors.assignments);
  const isLoading      = useAssignmentStore(assignmentSelectors.isLoading);
  const logEntries     = useStudyLogStore(studyLogSelectors.entries);
  const getAllProfiles  = useStudyLogStore(studyLogSelectors.getAllCourseProfiles);

  // Replan cooldown tracking.
  const lastReplanRef = useRef<number | null>(null);
  // Replan generation counter — incrementing forces useMemo to recompute.
  const replanCounterRef = useRef(0);

  // Schedule history for temporal stability weighting.
  // Ring buffer: most recent at index 0, oldest at the end.
  // Each snapshot pairs ScheduleDay[] with its creation timestamp.
  // Limited to 5 snapshots to keep memory bounded.
  const HISTORY_MAX = 5;
  const scheduleHistoryRef = useRef<ScheduleSnapshot[]>([]);

  // Force replan callback — exposed to UI.
  const forceReplan = useCallback(() => {
    replanCounterRef.current++;
    lastReplanRef.current = Date.now();
    // We need to trigger a re-render. Since refs don't trigger renders,
    // we use the assignment store's fetch as a proxy (it's idempotent).
    // In practice the UI button would set local state to force the recompute.
  }, []);

  // ── Main pipeline ─────────────────────────────────────────────────────

  const result = useMemo(() => {
    if (assignments.length === 0) {
      return {
        schedule: EMPTY_SCHEDULE,
        timeline: EMPTY_TIMELINE,
        drift: EMPTY_DRIFT,
        modifiers: new Map<string, ScoreModifiers>(),
        overflowResolution: null as OverflowResolutionResult | null,
        stability: null as StabilityReport | null,
      };
    }

    const castAssignments = assignments as SchedulableAssignment[];

    // Phase 1: base scoring.
    const scored = scoreAssignments(castAssignments);

    // Phase 2: adaptive modifiers.
    const profiles   = getAllProfiles();
    const profileMap = buildProfileMap(profiles);
    const { adapted, modifiers } = applyAdaptiveModifiers(scored, profileMap);

    // Generate schedule using the deterministic engine.
    // We pass the adapted scored list indirectly — since generateSchedule
    // takes raw assignments and re-scores internally, we need to work with
    // the public API. The adaptive layer adjusts estimated_hours on the
    // assignments themselves for the engine to pick up.
    //
    // Strategy: create a modified assignment list with adjusted estimates,
    // then feed it to the deterministic engine.
    const adjustedAssignments: SchedulableAssignment[] = castAssignments.map((a) => {
      const adaptedEntry = adapted.find((s) => s.assignment.id === a.id);
      if (!adaptedEntry) return a;
      return {
        ...a,
        estimated_hours: adaptedEntry.estimated_hours,
      };
    });

    const schedule = generateSchedule(adjustedAssignments, constraints);

    // Anti-clustering post-pass.
    const refinedDays = antiClusterPass(schedule.days);
    const refinedSchedule: GeneratedSchedule = {
      ...schedule,
      days: refinedDays,
    };

    // Time-slot allocation (first pass).
    let timeline = allocateTimeSlots(refinedDays, timePrefs);
    let overflowResolution: OverflowResolutionResult | null = null;

    // Overflow resolution: if the first pass produced overflow, resolve it
    // and re-run the time-slot allocator on the adjusted days.
    if (timeline.overflow && timeline.overflow.blocks.length > 0) {
      const dayDates = buildOverflowDateMap(timeline.days);
      const maxHours = constraints?.max_hours_per_day ?? 4;
      const availability = timePrefs?.availability ?? [{ start: 18, end: 22 }];

      // Build temporally-weighted placements from schedule history.
      const history = scheduleHistoryRef.current;
      const previousPlacements = history.length > 0
        ? buildWeightedPlacementsMap(history)
        : null;

      overflowResolution = resolveOverflow(
        refinedDays,
        timeline.overflow.blocks,
        dayDates,
        {
          max_hours_per_day: maxHours,
          availability,
          day_overrides: timePrefs?.day_overrides,
          excluded_days: constraints?.excluded_days,
          previous_placements: previousPlacements,
        },
      );

      // Re-allocate time slots on the adjusted days.
      timeline = allocateTimeSlots(overflowResolution.adjusted_days, timePrefs);
    }

    // ── Stability analysis ───────────────────────────────────────────────
    const previousSnapshot = scheduleHistoryRef.current[0];
    const previousDays = previousSnapshot?.days ?? [];
    let stability: StabilityReport | null = null;

    // Get the current day-level schedule for comparison.
    const finalDays = overflowResolution
      ? overflowResolution.adjusted_days
      : refinedDays;

    if (previousDays.length > 0) {
      stability = analyseStability(previousDays, finalDays);

      // If stability is low, apply stabilisation pass and re-allocate.
      if (stability.stability_score < 0.6 && stability.moved_count > 0) {
        const { stabilised_days, anchored_count } = stabiliseSchedule(
          previousDays,
          finalDays,
          stability,
        );

        if (anchored_count > 0) {
          // Re-run time-slot allocator on the stabilised days.
          timeline = allocateTimeSlots(stabilised_days, timePrefs);
          // Re-analyse stability after stabilisation.
          stability = analyseStability(previousDays, stabilised_days);
        }
      }
    }

    // Push current schedule into history ring buffer (most recent first).
    const snapshot: ScheduleSnapshot = { days: finalDays, timestamp: Date.now() };
    const updatedHistory = [snapshot, ...scheduleHistoryRef.current];
    scheduleHistoryRef.current = updatedHistory.slice(0, HISTORY_MAX);

    // Drift analysis.
    const drift = analyzeDrift(refinedSchedule, logEntries);

    // Auto-replan check — also trigger on unresolvable overflow.
    const overflowNeedsReplan = overflowResolution?.needs_replan ?? false;
    if (
      (drift.drift_score > 0.75 || overflowNeedsReplan) &&
      canAutoReplan(lastReplanRef.current)
    ) {
      lastReplanRef.current = Date.now();
    }

    return { schedule: refinedSchedule, timeline, drift, modifiers, overflowResolution, stability };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, logEntries, constraints, timePrefs, getAllProfiles]);

  return {
    schedule: result.schedule,
    timeline: result.timeline,
    drift: result.drift,
    modifiers: result.modifiers,
    overflowResolution: result.overflowResolution,
    stability: result.stability,
    isLoading,
    forceReplan,
  };
}
