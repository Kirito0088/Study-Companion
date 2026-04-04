"use client";

import { memo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Plus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAssignmentsPage } from "@/lib/hooks/useAssignmentsPage";
import type { AssignmentFormValues } from "@/types";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";
import { AddAssignmentModal } from "./AddAssignmentModal";
import { AssignmentRow } from "./AssignmentRow";

const loadingRows = [1, 2, 3, 4];
const fallbackSubjectOptions = [
  "General Studies",
  "Mathematics",
  "Physics",
  "Computer Science",
  "Literature",
];

interface AssignmentStatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  backgroundClass: string;
}

const AssignmentStatCard = memo(function AssignmentStatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  backgroundClass,
}: AssignmentStatCardProps) {
  return (
    <motion.div variants={item} className="glass-card p-4">
      <div className={`w-9 h-9 rounded-xl ${backgroundClass} flex items-center justify-center mb-3`}>
        <Icon size={16} className={colorClass} />
      </div>
      <p className="text-2xl font-bold text-text-primary">{String(value).padStart(2, "0")}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </motion.div>
  );
});

export function AssignmentsView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const {
    assignments,
    stats,
    isLoading,
    handleCreateAssignment,
    handleCompleteAssignment,
    handleDeleteAssignment,
  } = useAssignmentsPage();

  const statCards = stats
    ? [
        { label: "Total Assignments", value: stats.total, icon: ClipboardList, colorClass: "text-primary", backgroundClass: "bg-primary/10" },
        { label: "In Progress", value: stats.in_progress, icon: Clock, colorClass: "text-status-warning", backgroundClass: "bg-status-warning/10" },
        { label: "Completed", value: stats.completed, icon: CheckCircle2, colorClass: "text-status-success", backgroundClass: "bg-status-success/10" },
        { label: "Upcoming", value: stats.upcoming, icon: Calendar, colorClass: "text-status-info", backgroundClass: "bg-status-info/10" },
      ]
    : [];

  const subjectOptions = Array.from(new Set([
    ...assignments.map((assignment) => assignment.course),
    ...fallbackSubjectOptions,
  ]));

  const handleAddButtonClick = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isCreatingAssignment) {
      setIsAddModalOpen(false);
    }
  }, [isCreatingAssignment]);

  const handleCreateFromModal = useCallback(async (values: AssignmentFormValues) => {
    setIsCreatingAssignment(true);
    try {
      await handleCreateAssignment(values);
      setIsAddModalOpen(false);
    } finally {
      setIsCreatingAssignment(false);
    }
  }, [handleCreateAssignment]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <AddAssignmentModal
        isOpen={isAddModalOpen}
        isSubmitting={isCreatingAssignment}
        subjectOptions={subjectOptions}
        onClose={handleCloseModal}
        onCreate={handleCreateFromModal}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <AssignmentStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            colorClass={card.colorClass}
            backgroundClass={card.backgroundClass}
          />
        ))}
      </div>

      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Recent Assignments</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs py-1.5 px-3">View Archive</button>
            <button onClick={handleAddButtonClick} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={12} />
              Add New
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {loadingRows.map((rowId) => (
              <div key={rowId} className="h-16 glass-card-elevated rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((assignment, index) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                index={index}
                onMarkComplete={handleCompleteAssignment}
                onDelete={handleDeleteAssignment}
              />
            ))}
          </div>
        )}
      </motion.div>

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
