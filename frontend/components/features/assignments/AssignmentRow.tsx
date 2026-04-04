"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Trash2 } from "lucide-react";
import type { Assignment, AssignmentPriority, AssignmentStatus } from "@/types";

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06 },
  }),
};

const statusBadge: Record<AssignmentStatus, string> = {
  in_progress: "badge-in-progress",
  completed: "badge-completed",
  upcoming: "badge-upcoming",
  scheduled: "badge-scheduled",
};

const statusLabel: Record<AssignmentStatus, string> = {
  in_progress: "In Progress",
  completed: "Completed",
  upcoming: "Upcoming",
  scheduled: "Scheduled",
};

const priorityDot: Record<AssignmentPriority, string> = {
  high: "bg-status-error",
  medium: "bg-status-warning",
  low: "bg-status-success",
};

interface AssignmentRowProps {
  assignment: Assignment;
  index: number;
  onMarkComplete: (assignmentId: string) => Promise<void>;
  onDelete: (assignmentId: string) => Promise<void>;
}

function AssignmentRowComponent({
  assignment,
  index,
  onMarkComplete,
  onDelete,
}: AssignmentRowProps) {
  const handleComplete = useCallback(() => {
    void onMarkComplete(assignment.id);
  }, [assignment.id, onMarkComplete]);

  const handleDelete = useCallback(() => {
    void onDelete(assignment.id);
  }, [assignment.id, onDelete]);

  return (
    <motion.div
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      className="flex items-center gap-4 p-4 glass-card-elevated rounded-xl group hover:border-surface-high transition-all"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[assignment.priority]}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
          {assignment.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-primary font-medium">{assignment.course}</span>
          <span className="text-text-muted text-xs">•</span>
          <span className="text-xs text-text-muted">{assignment.type}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        {assignment.grade ? (
          <span className="text-xs font-bold text-status-success">Graded: {assignment.grade}</span>
        ) : assignment.days_left !== undefined && assignment.days_left !== null ? (
          <span className={`text-xs font-semibold ${assignment.days_left <= 2 ? "text-status-error" : "text-status-warning"}`}>
            {assignment.days_left} days left
          </span>
        ) : (
          <span className="text-xs text-text-muted">{assignment.due_date}</span>
        )}
      </div>

      <div className={`badge ${statusBadge[assignment.status]} flex-shrink-0`}>
        {statusLabel[assignment.status]}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleComplete}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-status-success/15 text-text-muted hover:text-status-success transition-colors"
          title="Mark complete"
        >
          <CheckCircle2 size={13} />
        </button>
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-status-error/15 text-text-muted hover:text-status-error transition-colors"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

export const AssignmentRow = memo(AssignmentRowComponent);
