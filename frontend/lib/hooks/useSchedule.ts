"use client";

import { useMemo } from "react";
import { assignmentSelectors, useAssignmentStore } from "@/lib/hooks/useAssignmentStore";
import {
  generateSchedule,
  type ScheduleConstraints,
  type GeneratedSchedule,
  type SchedulableAssignment,
} from "@/lib/engine";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UseScheduleResult {
  /** The generated schedule, recomputed whenever assignments change. */
  schedule: GeneratedSchedule;
  /** Whether the underlying assignment data is still loading. */
  isLoading: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useSchedule
 *
 * Thin React bridge between the pure scheduling engine and the Zustand store.
 *
 * - Reads assignments from the shared store (no duplicate fetches).
 * - Recomputes the schedule via useMemo whenever assignments change.
 * - Accepts optional user constraints to customise daily limits.
 *
 * Usage:
 *   const { schedule, isLoading } = useSchedule({ max_hours_per_day: 3 });
 */
export function useSchedule(constraints?: ScheduleConstraints): UseScheduleResult {
  const assignments = useAssignmentStore(assignmentSelectors.assignments);
  const isLoading = useAssignmentStore(assignmentSelectors.isLoading);

  const schedule = useMemo<GeneratedSchedule>(() => {
    if (assignments.length === 0) {
      return {
        days: [],
        unscheduled: [],
        stats: { total_assignments: 0, scheduled_assignments: 0, total_hours: 0, days_span: 0 },
      };
    }

    // The store's Assignment type is a superset of SchedulableAssignment —
    // the engine only reads the fields it needs, so the cast is safe.
    return generateSchedule(
      assignments as SchedulableAssignment[],
      constraints,
    );
  }, [assignments, constraints]);

  return { schedule, isLoading };
}
