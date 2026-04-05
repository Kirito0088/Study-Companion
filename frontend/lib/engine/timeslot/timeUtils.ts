/**
 * Time-Slot Allocator — Time Utilities
 *
 * Helpers for converting between decimal hours, "HH:MM" strings,
 * and minute-based arithmetic. All functions are pure.
 */

// ── Decimal ↔ HH:MM ──────────────────────────────────────────────────────────

/**
 * Converts a decimal hour (e.g. 14.5) to "HH:MM" format ("14:30").
 * Clamps to [0, 24). 24.0 is rendered as "24:00" for end-of-day.
 */
export function decimalToHHMM(decimal: number): string {
  const clamped = Math.max(0, Math.min(decimal, 24));
  const hours = Math.floor(clamped);
  const minutes = Math.round((clamped - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Converts "HH:MM" format to decimal hours.
 * Returns null for malformed input.
 */
export function hhmmToDecimal(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 24 || m < 0 || m > 59) return null;
  return h + m / 60;
}

// ── Minute arithmetic ─────────────────────────────────────────────────────────

/** Converts decimal hours to minutes. */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/** Converts minutes to decimal hours. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Adds `minutes` to a decimal hour value.
 * Returns the new decimal hour.
 */
export function addMinutesToDecimal(decimal: number, minutes: number): number {
  return decimal + minutes / 60;
}

// ── Window capacity ───────────────────────────────────────────────────────────

/**
 * Returns the total available minutes across a list of time windows.
 */
export function totalWindowMinutes(windows: Array<{ start: number; end: number }>): number {
  let total = 0;
  for (const w of windows) {
    total += hoursToMinutes(w.end - w.start);
  }
  return Math.max(total, 0);
}
