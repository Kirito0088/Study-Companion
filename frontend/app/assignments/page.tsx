"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, Clock, CheckCircle2, Calendar, Trash2,
  Plus, Sparkles, ChevronRight
} from "lucide-react";
import { useAssignmentStore } from "@/lib/hooks/useAssignmentStore";
import type { Assignment, AssignmentStatus, AssignmentPriority } from "@/types";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";


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

export default function AssignmentsPage() {
  const { assignments, stats, isLoading, load, remove, update } = useAssignmentStore();

  useEffect(() => {
    load();
  }, [load]);

  const statCards = stats
    ? [
        { label: "Total Assignments", value: stats.total, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
        { label: "In Progress", value: stats.in_progress, icon: Clock, color: "text-status-warning", bg: "bg-status-warning/10" },
        { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-status-success", bg: "bg-status-success/10" },
        { label: "Upcoming", value: stats.upcoming, icon: Calendar, color: "text-status-info", bg: "bg-status-info/10" },
      ]
    : [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={item} className="glass-card p-4">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <Icon size={16} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-text-primary">{String(s.value).padStart(2, "0")}</p>
              <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Assignment table ───────────────────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Recent Assignments</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs py-1.5 px-3">View Archive</button>
            <button className="btn-primary text-xs py-1.5 px-3">
              <Plus size={12} />
              Add New
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 glass-card-elevated rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment: Assignment, i: number) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-4 glass-card-elevated rounded-xl group hover:border-surface-high transition-all"
              >
                {/* Priority dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[assignment.priority]}`} />

                {/* Main info */}
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

                {/* Due date / grade */}
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

                {/* Status badge */}
                <div className={`badge ${statusBadge[assignment.status]} flex-shrink-0`}>
                  {statusLabel[assignment.status]}
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => update(assignment.id, { status: "completed" })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-status-success/15 text-text-muted hover:text-status-success transition-colors"
                    title="Mark complete"
                  >
                    <CheckCircle2 size={13} />
                  </button>
                  <button
                    onClick={() => remove(assignment.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-status-error/15 text-text-muted hover:text-status-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Premium upsell ─────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-card pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">Ready for midterms?</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Unlock personalized study paths and AI-generated mock exams.{" "}
              <span className="text-primary font-semibold">Premium members see a 34% increase</span> in average scores.
            </p>
          </div>
          <button className="btn-primary flex-shrink-0">
            <Sparkles size={13} />
            Upgrade to Premium
            <ChevronRight size={13} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
