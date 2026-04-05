"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudyLogEntry, CourseProfile } from "@/lib/engine/adaptive/types";
import { toDateKey, todayMidnight, addDays } from "@/lib/engine/dateUtils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Rolling window: only entries from the last N days. */
function withinWindow(entries: StudyLogEntry[], days: number): StudyLogEntry[] {
  const cutoff = toDateKey(addDays(todayMidnight(), -days));
  return entries.filter((e) => e.date >= cutoff);
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Only use the most recent 30 days for profile computation. */
const PROFILE_WINDOW_DAYS = 30;

/** Minimum entries before modifiers start scaling above 1.0. */
const MIN_SAMPLE_SIZE = 5;

// ── Store Types ───────────────────────────────────────────────────────────────

interface StudyLogState {
  entries: StudyLogEntry[];

  // ── Write actions ──
  logStart:    (assignmentId: string, course: string, type: string, plannedHours: number) => void;
  logComplete: (assignmentId: string, course: string, type: string, plannedHours: number, actualHours: number) => void;
  logSkip:     (assignmentId: string, course: string, type: string, plannedHours: number) => void;
  logDefer:    (assignmentId: string, course: string, type: string, plannedHours: number) => void;

  // ── Read (derived) ──
  getEntriesForAssignment: (assignmentId: string) => StudyLogEntry[];
  getEntriesByDate:        (date: string) => StudyLogEntry[];
  getRecentEntries:        (days: number) => StudyLogEntry[];
  getCourseProfile:        (course: string) => CourseProfile;
  getAllCourseProfiles:     () => CourseProfile[];
  getCompletionRate:       (days: number) => number;

  // ── Maintenance ──
  clearOldEntries: (olderThanDays: number) => void;
}

// ── Profile Builder ───────────────────────────────────────────────────────────

function buildCourseProfile(entries: StudyLogEntry[], course: string): CourseProfile {
  const courseEntries = withinWindow(
    entries.filter((e) => e.course === course),
    PROFILE_WINDOW_DAYS,
  );

  if (courseEntries.length === 0) {
    return {
      course,
      avg_accuracy_ratio: 1.0,
      skip_rate: 0,
      avg_completion_hours: 0,
      streak: 0,
      sample_size: 0,
    };
  }

  const completed = courseEntries.filter((e) => e.event === "completed");
  const skipped   = courseEntries.filter((e) => e.event === "skipped");

  // Accuracy ratio: actual / planned.
  let totalPlanned = 0;
  let totalActual  = 0;
  for (const e of completed) {
    totalPlanned += e.planned_hours;
    totalActual  += e.actual_hours ?? 0;
  }
  const avgAccuracyRatio = totalPlanned > 0 ? totalActual / totalPlanned : 1.0;

  // Skip rate.
  const skipRate = courseEntries.length > 0 ? skipped.length / courseEntries.length : 0;

  // Average completion time.
  const avgCompletionHours = completed.length > 0
    ? totalActual / completed.length
    : 0;

  // Streak: count consecutive "completed" events from most recent backwards.
  let streak = 0;
  // Sort by date descending to walk backwards.
  const sorted = [...courseEntries].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  for (const e of sorted) {
    if (e.event === "completed") {
      streak++;
    } else {
      break;
    }
  }

  return {
    course,
    avg_accuracy_ratio: Math.round(avgAccuracyRatio * 100) / 100,
    skip_rate: Math.round(skipRate * 100) / 100,
    avg_completion_hours: Math.round(avgCompletionHours * 100) / 100,
    streak,
    sample_size: courseEntries.length,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStudyLogStore = create<StudyLogState>()(
  persist(
    (set, get) => ({
      entries: [],

      // ── Write ──────────────────────────────────────────────────────────

      logStart: (assignmentId, course, type, plannedHours) => {
        const entry: StudyLogEntry = {
          id: generateId(),
          assignment_id: assignmentId,
          date: toDateKey(todayMidnight()),
          event: "started",
          planned_hours: plannedHours,
          actual_hours: null,
          course,
          type,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
      },

      logComplete: (assignmentId, course, type, plannedHours, actualHours) => {
        const entry: StudyLogEntry = {
          id: generateId(),
          assignment_id: assignmentId,
          date: toDateKey(todayMidnight()),
          event: "completed",
          planned_hours: plannedHours,
          actual_hours: actualHours,
          course,
          type,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
      },

      logSkip: (assignmentId, course, type, plannedHours) => {
        const entry: StudyLogEntry = {
          id: generateId(),
          assignment_id: assignmentId,
          date: toDateKey(todayMidnight()),
          event: "skipped",
          planned_hours: plannedHours,
          actual_hours: null,
          course,
          type,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
      },

      logDefer: (assignmentId, course, type, plannedHours) => {
        const entry: StudyLogEntry = {
          id: generateId(),
          assignment_id: assignmentId,
          date: toDateKey(todayMidnight()),
          event: "deferred",
          planned_hours: plannedHours,
          actual_hours: null,
          course,
          type,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ entries: [...s.entries, entry] }));
      },

      // ── Read ───────────────────────────────────────────────────────────

      getEntriesForAssignment: (assignmentId) =>
        get().entries.filter((e) => e.assignment_id === assignmentId),

      getEntriesByDate: (date) =>
        get().entries.filter((e) => e.date === date),

      getRecentEntries: (days) =>
        withinWindow(get().entries, days),

      getCourseProfile: (course) =>
        buildCourseProfile(get().entries, course),

      getAllCourseProfiles: () => {
        const courses = new Set(get().entries.map((e) => e.course));
        return Array.from(courses).map((c) => buildCourseProfile(get().entries, c));
      },

      getCompletionRate: (days) => {
        const recent = withinWindow(get().entries, days);
        if (recent.length === 0) return 1.0; // No data → assume on track.
        const actionable = recent.filter((e) => e.event !== "started");
        if (actionable.length === 0) return 1.0;
        const completed = actionable.filter((e) => e.event === "completed").length;
        return Math.round((completed / actionable.length) * 100) / 100;
      },

      // ── Maintenance ────────────────────────────────────────────────────

      clearOldEntries: (olderThanDays) => {
        const cutoff = toDateKey(addDays(todayMidnight(), -olderThanDays));
        set((s) => ({
          entries: s.entries.filter((e) => e.date >= cutoff),
        }));
      },
    }),
    {
      name: "study-companion-study-log",
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────────

export const studyLogSelectors = {
  entries:                (s: StudyLogState) => s.entries,
  logStart:              (s: StudyLogState) => s.logStart,
  logComplete:           (s: StudyLogState) => s.logComplete,
  logSkip:               (s: StudyLogState) => s.logSkip,
  logDefer:              (s: StudyLogState) => s.logDefer,
  getEntriesForAssignment: (s: StudyLogState) => s.getEntriesForAssignment,
  getEntriesByDate:      (s: StudyLogState) => s.getEntriesByDate,
  getRecentEntries:      (s: StudyLogState) => s.getRecentEntries,
  getCourseProfile:      (s: StudyLogState) => s.getCourseProfile,
  getAllCourseProfiles:   (s: StudyLogState) => s.getAllCourseProfiles,
  getCompletionRate:     (s: StudyLogState) => s.getCompletionRate,
  clearOldEntries:       (s: StudyLogState) => s.clearOldEntries,
};
