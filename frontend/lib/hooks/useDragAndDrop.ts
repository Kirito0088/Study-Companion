"use client";

import { useCallback, useRef, useState } from "react";
import { assignmentSelectors, useAssignmentStore } from "@/lib/hooks/useAssignmentStore";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DragAndDropHandlers {
  /** Props to spread onto a draggable assignment element. */
  getDragProps: (assignmentId: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  /** Props to spread onto a droppable calendar day cell. */
  getDropProps: (date: Date) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** The date key (YYYY-MM-DD) currently being dragged over, or null. */
  dragOverKey: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Custom MIME type so only our assignment drags are recognised. */
const DATA_TRANSFER_KEY = "application/x-assignment-id";

/**
 * How long (ms) to ignore a second drop on the same cell after a successful
 * drop — guards against double-fire across browsers (e.g. Firefox).
 */
const DROP_DEBOUNCE_MS = 500;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for a local Date with no UTC shift. */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Validates that a string is a well-formed YYYY-MM-DD date key. */
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_RE.test(key)) return false;
  const [y, mo, d] = key.split("-").map(Number);
  // Verify the date actually exists in the calendar (no Feb 30, etc.)
  const probe = new Date(y, mo - 1, d);
  return (
    probe.getFullYear() === y &&
    probe.getMonth() === mo - 1 &&
    probe.getDate() === d
  );
}

/**
 * Returns true when the dragged item carries our custom MIME type.
 * Checking `types` (available during dragOver) is the only cross-browser way
 * to sniff the payload before the drop actually fires.
 */
function isOurDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(DATA_TRANSFER_KEY);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useDragAndDrop
 *
 * Provides stable drag/drop event handler factories for the Planner calendar.
 * All rescheduling logic lives here — UI components only spread props.
 *
 * Hardening layers
 * ─────────────────
 * 1. onDragOver — skipped for foreign drags (custom MIME check).
 * 2. onDrop     — id trimmed + non-empty guard.
 * 3. onDrop     — target date key format + calendar-validity check.
 * 4. onDrop     — assignment existence guard.
 * 5. onDrop     — same-date guard (no-op when date unchanged).
 * 6. onDrop     — ref-based debounce (DROP_DEBOUNCE_MS) to suppress
 *                 double-fire across browsers (notably Firefox).
 * 7. onDragEnd  — always clears dragOverKey so highlight can't get stuck.
 */
export function useDragAndDrop(): DragAndDropHandlers {
  const update = useAssignmentStore(assignmentSelectors.update);
  const assignments = useAssignmentStore(assignmentSelectors.assignments);

  /** YYYY-MM-DD key of the cell the user is currently hovering over. */
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  /**
   * Tracks the last successfully processed drop: { dateKey, at }.
   * Used to debounce rapid repeated drops on the same cell.
   */
  const lastDropRef = useRef<{ dateKey: string; at: number } | null>(null);

  // ── Drag source ─────────────────────────────────────────────────────────────

  const getDragProps = useCallback(
    (assignmentId: string) => ({
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.setData(DATA_TRANSFER_KEY, assignmentId);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: () => {
        // Always clean up highlight, even if the drop landed outside a valid cell.
        setDragOverKey(null);
      },
    }),
    [],
  );

  // ── Drop target ─────────────────────────────────────────────────────────────

  const getDropProps = useCallback(
    (date: Date) => {
      const dateKey = toDateString(date);

      return {
        onDragOver: (e: React.DragEvent) => {
          // Guard 1: only respond to our own assignment drags.
          if (!isOurDrag(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOverKey(dateKey);
        },

        onDragLeave: () => {
          // Clear only if we are leaving this specific cell (not a child re-enter).
          setDragOverKey((prev) => (prev === dateKey ? null : prev));
        },

        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setDragOverKey(null);

          // Guard 2: trim + non-empty check.
          const assignmentId = e.dataTransfer.getData(DATA_TRANSFER_KEY).trim();
          if (!assignmentId) return;

          // Guard 3: ensure the computed target date key is calendar-valid.
          if (!isValidDateKey(dateKey)) {
            if (process.env.NODE_ENV === "development") {
              console.warn(`[useDragAndDrop] Rejected drop — invalid target date key: "${dateKey}"`);
            }
            return;
          }

          // Guard 4: debounce rapid repeated drops on the same cell.
          const now = Date.now();
          const last = lastDropRef.current;
          if (last && last.dateKey === dateKey && now - last.at < DROP_DEBOUNCE_MS) {
            return;
          }

          // Guard 5: assignment must exist in the store.
          const assignment = assignments.find((a) => a.id === assignmentId);
          if (!assignment) {
            if (process.env.NODE_ENV === "development") {
              console.warn(`[useDragAndDrop] Rejected drop — assignment not found: "${assignmentId}"`);
            }
            return;
          }

          // Guard 6: same-date → no-op.
          if (assignment.due_date === dateKey) return;

          // All guards passed — record this drop and reschedule.
          lastDropRef.current = { dateKey, at: now };
          void update(assignmentId, { due_date: dateKey });
        },
      };
    },
    [assignments, update],
  );

  return { getDragProps, getDropProps, dragOverKey };
}
