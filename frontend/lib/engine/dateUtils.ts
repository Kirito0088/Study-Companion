/**
 * AI Planner Engine — Date Utilities
 *
 * Timezone-safe date helpers shared across the engine.
 * Uses the local-midnight / numeric-constructor pattern established in
 * usePlanner.ts and useCalendar.ts — no `new Date("YYYY-MM-DD")` anywhere.
 */

// ── Parsing ───────────────────────────────────────────────────────────────────

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a YYYY-MM-DD string into a local-midnight Date.
 * Returns null for malformed or impossible dates (e.g. "2026-02-30").
 */
export function parseDateKey(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  if (!DATE_KEY_RE.test(dateStr)) return null;

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);

  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }

  return date;
}

// ── Formatting ────────────────────────────────────────────────────────────────

/** Formats a local Date as YYYY-MM-DD using local date parts (no UTC shift). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ── Arithmetic ────────────────────────────────────────────────────────────────

/** Returns a local-midnight Date for today. */
export function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a new Date offset by `days` from the given date (local time). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole-day difference (a − b) using local-midnight dates. */
export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  // Normalise to noon to avoid DST edge cases in day-count arithmetic.
  const aNoon = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12, 0, 0, 0);
  const bNoon = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12, 0, 0, 0);
  return Math.round((aNoon.getTime() - bNoon.getTime()) / MS_PER_DAY);
}

/**
 * Generates an inclusive list of YYYY-MM-DD keys from `start` to `end`.
 * Skips any day whose weekday index is in `excludedDays` (0 = Sun, 6 = Sat).
 */
export function dateRange(
  start: Date,
  end: Date,
  excludedDays: number[] = [],
): string[] {
  const keys: string[] = [];
  const totalDays = daysBetween(end, start);
  if (totalDays < 0) return keys;

  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(start, i);
    if (!excludedDays.includes(d.getDay())) {
      keys.push(toDateKey(d));
    }
  }
  return keys;
}
