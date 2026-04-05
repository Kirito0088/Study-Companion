"use client";

import { useMemo } from "react";
import { assignmentSelectors, useAssignmentStore } from "@/lib/hooks/useAssignmentStore";
import type { Assignment } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarDay {
  /** The Date object for this cell (always local midnight). */
  date: Date;
  /** False for leading/trailing filler days from adjacent months. */
  isCurrentMonth: boolean;
  /** True only for today's date. */
  isToday: boolean;
  /** All non-completed assignments whose due_date lands on this day. */
  assignments: Assignment[];
}

export interface CalendarData {
  /** The month being displayed (local midnight, day 1). */
  currentMonth: Date;
  /** Flat array of 35 or 42 cells (5 or 6 complete weeks, Sunday-first). */
  calendarDays: CalendarDay[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a YYYY-MM-DD key using local date parts (no UTC shift). */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Local-midnight Date for today. */
function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Builds the flat CalendarDay[] for the month containing `anchor`.
 * Grid starts on Sunday (index 0) and always contains complete weeks.
 */
function buildCalendarDays(
  anchor: Date,
  assignmentsByDate: Map<string, Assignment[]>,
  todayKey: string,
): CalendarDay[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  // First day of the month
  const firstOfMonth = new Date(year, month, 1);
  firstOfMonth.setHours(0, 0, 0, 0);

  // Day-of-week for the 1st (0 = Sun). This is how many leading filler days we need.
  const leadingBlanks = firstOfMonth.getDay(); // Sunday = 0

  // Last day of the month
  const lastOfMonth = new Date(year, month + 1, 0);
  lastOfMonth.setHours(0, 0, 0, 0);

  // Total days so far (leading fillers + actual month days)
  const usedCells = leadingBlanks + lastOfMonth.getDate();

  // Round up to the next full week
  const totalCells = Math.ceil(usedCells / 7) * 7;

  const days: CalendarDay[] = [];

  for (let i = 0; i < totalCells; i++) {
    const offset = i - leadingBlanks; // negative = previous month, 0+ = current/next
    const cellDate = new Date(year, month, 1 + offset);
    cellDate.setHours(0, 0, 0, 0);

    const key = toDateKey(cellDate);

    days.push({
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
      isToday: key === todayKey,
      assignments: assignmentsByDate.get(key) ?? [],
    });
  }

  return days;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useCalendar
 *
 * Reads assignments from the shared Zustand store, groups non-completed
 * assignments by due_date, and generates a full monthly calendar grid
 * (Sunday-first, 5 or 6 complete weeks).
 *
 * No additional API calls — re-uses data already fetched by useAssignmentStore.
 */
export function useCalendar(): CalendarData {
  const assignments = useAssignmentStore(assignmentSelectors.assignments);

  return useMemo<CalendarData>(() => {
    const today = todayMidnight();
    const todayKey = toDateKey(today);

    // Group active assignments by their due_date string key.
    const byDate = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (a.status === "completed") continue;
      if (!a.due_date) continue;

      const existing = byDate.get(a.due_date);
      if (existing) {
        existing.push(a);
      } else {
        byDate.set(a.due_date, [a]);
      }
    }

    // Use the current month as the display month.
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    currentMonth.setHours(0, 0, 0, 0);

    const calendarDays = buildCalendarDays(currentMonth, byDate, todayKey);

    return { currentMonth, calendarDays };
  }, [assignments]);
}
