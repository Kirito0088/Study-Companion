import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { itemVariants as item } from "@/lib/utils/variants";
import type { CalendarDay } from "@/lib/hooks/useCalendar";
import type { DragAndDropHandlers } from "@/lib/hooks/useDragAndDrop";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;


// Priority colour for assignment dots (highest-priority assignment wins)
const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-status-error",
  medium: "bg-status-warning",
  low:    "bg-status-success",
};

function dotColor(day: CalendarDay): string {
  if (day.assignments.some((a) => a.priority === "high"))   return PRIORITY_DOT.high;
  if (day.assignments.some((a) => a.priority === "medium")) return PRIORITY_DOT.medium;
  return PRIORITY_DOT.low;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect?: (date: Date) => void;
  dropProps?: ReturnType<DragAndDropHandlers["getDropProps"]>;
}

const DayCell = memo(function DayCell({ day, isSelected, isDragOver, onSelect, dropProps }: DayCellProps) {
  const hasAssignments = day.assignments.length > 0;

  return (
    <div
      onClick={() => day.isCurrentMonth && onSelect?.(day.date)}
      {...(day.isCurrentMonth ? dropProps : {})}
      className={cn(
        "relative flex flex-col items-center justify-start pt-1.5 pb-1 min-h-[52px] rounded-lg transition-colors",
        day.isCurrentMonth ? "cursor-pointer" : "cursor-default",
        // Filler days from adjacent months
        !day.isCurrentMonth && "opacity-30",
        // Drag-over highlight (only for current-month cells)
        isDragOver && day.isCurrentMonth && "bg-primary/10 ring-1 ring-primary/50",
        // Normal highlight logic (selected wins over today, drag-over wins if active)
        !isDragOver && (
          isSelected
            ? "bg-primary/20 ring-1 ring-primary"
            : day.isToday
              ? "bg-primary/15 ring-1 ring-primary/40"
              : day.isCurrentMonth && "hover:bg-surface-hover"
        ),
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          "text-xs font-semibold leading-none",
          day.isToday ? "text-primary" : "text-text-secondary",
          !day.isCurrentMonth && "text-text-muted",
        )}
      >
        {day.date.getDate()}
      </span>

      {/* Assignment dots — up to 3 shown, then a +N overflow indicator */}
      {hasAssignments && (
        <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
          {day.assignments.slice(0, 3).map((a) => (
            <span
              key={a.id}
              title={`${a.title} (${a.course})`}
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                PRIORITY_DOT[a.priority] ?? PRIORITY_DOT.low,
              )}
            />
          ))}
          {day.assignments.length > 3 && (
            <span className="text-[8px] text-text-muted font-semibold leading-none">
              +{day.assignments.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

export interface PlannerCalendarProps {
  currentMonth: Date;
  calendarDays: CalendarDay[];
  /** Optional month navigation — if omitted, navigation buttons are hidden. */
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  /** Optional date selection */
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  /** Optional drag-and-drop handlers from useDragAndDrop. */
  dragAndDrop?: DragAndDropHandlers;
}

/**
 * PlannerCalendar
 *
 * Purely presentational calendar grid.
 * Receives all data as props — no state, no side effects.
 */
export const PlannerCalendar = memo(function PlannerCalendar({
  currentMonth,
  calendarDays,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
  dragAndDrop,
}: PlannerCalendarProps) {
  const monthLabel = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const totalAssignments = calendarDays.reduce(
    (sum, d) => sum + (d.isCurrentMonth ? d.assignments.length : 0),
    0,
  );

  return (
    <motion.div variants={item} className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Assignment Calendar</h3>
          {totalAssignments > 0 && (
            <span className="text-[10px] text-text-muted">
              {totalAssignments} active this month
            </span>
          )}
        </div>

        {/* Month navigation (only rendered when handlers are provided) */}
        {(onPrevMonth ?? onNextMonth) && (
          <div className="flex items-center gap-1">
            {onPrevMonth && (
              <button
                onClick={onPrevMonth}
                className="btn-ghost p-1 rounded-lg"
                aria-label="Previous month"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            <span className="text-xs font-semibold text-text-primary min-w-[110px] text-center">
              {monthLabel}
            </span>
            {onNextMonth && (
              <button
                onClick={onNextMonth}
                className="btn-ghost p-1 rounded-lg"
                aria-label="Next month"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Static month label when no navigation */}
        {!onPrevMonth && !onNextMonth && (
          <span className="text-xs font-semibold text-text-secondary">{monthLabel}</span>
        )}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day) => {
          const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
          return (
            <DayCell
              key={day.date.toISOString()}
              day={day}
              isSelected={selectedDate?.getTime() === day.date.getTime()}
              isDragOver={dragAndDrop?.dragOverKey === dateKey}
              onSelect={onSelectDate}
              dropProps={dragAndDrop?.getDropProps(day.date)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-border">
        <span className="text-[10px] text-text-muted">Priority:</span>
        {(["high", "medium", "low"] as const).map((p) => (
          <div key={p} className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT[p])} />
            <span className="text-[10px] text-text-muted capitalize">{p}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
});
