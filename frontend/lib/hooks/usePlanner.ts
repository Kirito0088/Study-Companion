"use client";

import { useEffect, useMemo } from "react";
import { assignmentSelectors, useAssignmentStore } from "@/lib/hooks/useAssignmentStore";
import type { Assignment } from "@/types";

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Returns a Date object set to local midnight (00:00:00.000) for today.
 * Using local date arithmetic avoids the UTC-offset bug that occurs with
 * toISOString() on machines in UTC+ or UTC- timezones.
 */
function localMidnight(offset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (offset !== 0) {
    d.setDate(d.getDate() + offset);
  }
  return d;
}

/**
 * Safely parses a YYYY-MM-DD string into a local-midnight Date object.
 *
 * Returns null when:
 * - dateStr is null / undefined / empty
 * - the string doesn't match YYYY-MM-DD exactly
 * - the parsed values produce an invalid Date (e.g. month 13)
 *
 * Uses the `new Date(year, month, day)` constructor (not the ISO string
 * parser) so the result is always in local time, never UTC-midnight.
 */
function parseDueDateSafe(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  // Enforce strict YYYY-MM-DD shape before splitting.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day); // months are 0-indexed in JS
  d.setHours(0, 0, 0, 0);

  // Detect invalid calendar dates (e.g. Feb 30 → rolls over → isNaN or wrong day).
  if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  return d;
}

/** Sort predicate: ascending by due_date using numeric Date comparison. */
function byDueDate(a: Assignment, b: Assignment): number {
  // parseDueDateSafe can theoretically return null here, but both items have
  // already been validated before being pushed into a category list, so this
  // is only a safety cast — the nullish fallback prevents any NaN sort.
  const aMs = parseDueDateSafe(a.due_date)?.getTime() ?? 0;
  const bMs = parseDueDateSafe(b.due_date)?.getTime() ?? 0;
  return aMs - bMs;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlannerAssignments {
  /** Assignments due today (non-completed). */
  today: Assignment[];
  /** Assignments due within the next 2 days, exclusive of today (non-completed). */
  urgent: Assignment[];
  /** Assignments due after the next 2 days (non-completed). */
  upcoming: Assignment[];
  /** Whether the assignment data is still loading. */
  isLoading: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * usePlanner
 *
 * Derives a categorised, sorted view of real assignment data for the Planner page.
 *
 * Categories
 * ----------
 * today    — due_date === today
 * urgent   — due_date within the next 2 days (tomorrow or day-after), not completed
 * upcoming — due_date after the 2-day window, not completed
 *
 * Re-uses the shared Zustand store so no duplicate network requests are made
 * when the user navigates between Assignments and Planner pages.
 */
export function usePlanner(): PlannerAssignments {
  const assignments = useAssignmentStore(assignmentSelectors.assignments);
  const isLoading = useAssignmentStore(assignmentSelectors.isLoading);
  const fetchAssignments = useAssignmentStore(assignmentSelectors.fetchAssignments);

  // Trigger fetch once on mount if data hasn't been loaded yet.
  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const categorised = useMemo<Omit<PlannerAssignments, "isLoading">>(() => {
    // All boundary dates are local-midnight Date objects — no UTC shift.
    const todayDate    = localMidnight(0); // 00:00:00 today
    const tomorrowDate = localMidnight(1); // 00:00:00 tomorrow
    const cutoffDate   = localMidnight(2); // 00:00:00 in 2 days (exclusive upper bound for urgent)

    const todayMs    = todayDate.getTime();
    const tomorrowMs = tomorrowDate.getTime();
    const cutoffMs   = cutoffDate.getTime();

    const active = assignments.filter((a) => a.status !== "completed");

    const todayList: Assignment[]    = [];
    const urgentList: Assignment[]   = [];
    const upcomingList: Assignment[] = [];

    for (const a of active) {
      // Skip assignments with missing or malformed due_date entirely.
      const dueDate = parseDueDateSafe(a.due_date);
      if (dueDate === null) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[usePlanner] Assignment skipped — invalid due_date. id="${a.id}" due_date=${JSON.stringify(a.due_date)}`
          );
        }
        continue;
      }

      const dueMs = dueDate.getTime();

      if (dueMs === todayMs) {
        // Due today
        todayList.push(a);
      } else if (dueMs >= tomorrowMs && dueMs < cutoffMs) {
        // Due tomorrow or the day after — urgent window
        urgentList.push(a);
      } else if (dueMs >= cutoffMs) {
        // Due after the urgent window — upcoming
        upcomingList.push(a);
      }
      // dueMs < todayMs → overdue; excluded here (handled by Assignments page)
    }

    return {
      today:    todayList.sort(byDueDate),
      urgent:   urgentList.sort(byDueDate),
      upcoming: upcomingList.sort(byDueDate),
    };
  }, [assignments]);

  return { ...categorised, isLoading };
}
