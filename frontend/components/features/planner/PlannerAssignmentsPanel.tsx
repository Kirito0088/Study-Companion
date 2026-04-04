import { memo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarCheck, CalendarClock, Loader2 } from "lucide-react";
import type { Assignment } from "@/types";
import { itemVariants as item } from "@/lib/utils/variants";
import { cn } from "@/lib/utils/cn";

// ── Sub-components ────────────────────────────────────────────────────────────

const priorityDot: Record<string, string> = {
  high:   "bg-status-error",
  medium: "bg-status-warning",
  low:    "bg-status-success",
};

const AssignmentRow = memo(function AssignmentRow({ a }: { a: Assignment }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0">
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", priorityDot[a.priority] ?? "bg-text-muted")} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary truncate">{a.title}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{a.course} · {a.type}</p>
      </div>
      <span className="text-[10px] text-text-muted flex-shrink-0 whitespace-nowrap">{a.due_date}</span>
    </div>
  );
});

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  items: Assignment[];
  emptyText: string;
  accentClass: string;
}

const AssignmentSection = memo(function AssignmentSection({
  icon,
  label,
  items,
  emptyText,
  accentClass,
}: SectionProps) {
  return (
    <div>
      <div className={cn("flex items-center gap-1.5 mb-2", accentClass)}>
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
        <span className="ml-auto text-[10px] text-text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-text-muted py-1 pl-4">{emptyText}</p>
      ) : (
        items.map((a) => <AssignmentRow key={a.id} a={a} />)
      )}
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

export interface PlannerAssignmentsPanelProps {
  today: Assignment[];
  urgent: Assignment[];
  upcoming: Assignment[];
  isLoading: boolean;
}

/**
 * PlannerAssignmentsPanel
 *
 * Purely presentational card that displays real assignment data in 3 categories.
 * All data is passed as props — this component owns zero state or side effects.
 */
export const PlannerAssignmentsPanel = memo(function PlannerAssignmentsPanel({
  today,
  urgent,
  upcoming,
  isLoading,
}: PlannerAssignmentsPanelProps) {
  return (
    <motion.div variants={item} className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Assignment Outlook</h3>
        </div>
        {isLoading && <Loader2 size={13} className="text-text-muted animate-spin" />}
      </div>

      {!isLoading && today.length === 0 && urgent.length === 0 && upcoming.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-4">No active assignments. You&apos;re all caught up! 🎉</p>
      ) : (
        <div className="space-y-4">
          <AssignmentSection
            icon={<CalendarCheck size={13} />}
            label="Today"
            items={today}
            emptyText="Nothing due today."
            accentClass="text-status-error"
          />
          <AssignmentSection
            icon={<AlertTriangle size={13} />}
            label="Urgent"
            items={urgent}
            emptyText="No urgent assignments."
            accentClass="text-status-warning"
          />
          <AssignmentSection
            icon={<CalendarClock size={13} />}
            label="Upcoming"
            items={upcoming}
            emptyText="No upcoming assignments."
            accentClass="text-primary"
          />
        </div>
      )}
    </motion.div>
  );
});
