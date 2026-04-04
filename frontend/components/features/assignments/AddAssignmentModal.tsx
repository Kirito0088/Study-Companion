"use client";

import { memo, useCallback, useId, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { AssignmentFormValues, AssignmentStatus } from "@/types";

interface AddAssignmentModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  subjectOptions: string[];
  onClose: () => void;
  onCreate: (values: AssignmentFormValues) => Promise<void>;
}

const getDefaultDueDate = () => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  return dueDate.toISOString().split("T")[0];
};

const assignmentTypeOptions = ["Homework", "Lab", "Project", "Quiz", "Exam"];
const assignmentStatusOptions: { label: string; value: AssignmentStatus }[] = [
  { label: "Upcoming", value: "upcoming" },
  { label: "In Progress", value: "in_progress" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

function AddAssignmentModalComponent({
  isOpen,
  isSubmitting = false,
  subjectOptions,
  onClose,
  onCreate,
}: AddAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const [subject, setSubject] = useState(subjectOptions[0] ?? "General Studies");
  const [type, setType] = useState(assignmentTypeOptions[0]);
  const [status, setStatus] = useState<AssignmentStatus>("upcoming");
  const titleInputId = useId();
  const dueDateInputId = useId();
  const subjectInputId = useId();
  const typeInputId = useId();
  const statusInputId = useId();

  const resetForm = useCallback(() => {
    setTitle("");
    setDueDate(getDefaultDueDate());
    setSubject(subjectOptions[0] ?? "General Studies");
    setType(assignmentTypeOptions[0]);
    setStatus("upcoming");
  }, [subjectOptions]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !dueDate || !subject || !type || !status || isSubmitting) {
      return;
    }

    await onCreate({
      title: trimmedTitle,
      dueDate,
      subject,
      type,
      status,
    });
    resetForm();
  }, [dueDate, isSubmitting, onCreate, resetForm, status, subject, title, type]);

  const handleBackdropClick = useCallback(() => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  }, [isSubmitting, onClose, resetForm]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close add assignment modal"
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={handleBackdropClick}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative z-10 w-full max-w-md glass-card-elevated p-6 shadow-card"
          >
            <div className="absolute inset-0 bg-gradient-card pointer-events-none rounded-[inherit]" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-text-primary">Create Assignment</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Add a new assignment without leaving your workflow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackdropClick}
                  disabled={isSubmitting}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-surface-border bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <div className="space-y-2">
                  <label htmlFor={titleInputId} className="text-xs font-semibold text-text-primary">
                    Assignment Title
                  </label>
                  <input
                    id={titleInputId}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Enter assignment title"
                    autoFocus
                    disabled={isSubmitting}
                    className="w-full rounded-2xl border border-surface-border bg-surface-elevated/90 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor={dueDateInputId} className="text-xs font-semibold text-text-primary">
                      Due Date
                    </label>
                    <input
                      id={dueDateInputId}
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-surface-border bg-surface-elevated/90 px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={subjectInputId} className="text-xs font-semibold text-text-primary">
                      Subject
                    </label>
                    <select
                      id={subjectInputId}
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      disabled={isSubmitting}
                      className="w-full appearance-none rounded-2xl border border-surface-border bg-surface-elevated/90 px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                    >
                      {subjectOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={typeInputId} className="text-xs font-semibold text-text-primary">
                      Type
                    </label>
                    <select
                      id={typeInputId}
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                      disabled={isSubmitting}
                      className="w-full appearance-none rounded-2xl border border-surface-border bg-surface-elevated/90 px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                    >
                      {assignmentTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={statusInputId} className="text-xs font-semibold text-text-primary">
                      Status
                    </label>
                    <select
                      id={statusInputId}
                      value={status}
                      onChange={(event) => setStatus(event.target.value as AssignmentStatus)}
                      disabled={isSubmitting}
                      className="w-full appearance-none rounded-2xl border border-surface-border bg-surface-elevated/90 px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                    >
                      {assignmentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleBackdropClick}
                    disabled={isSubmitting}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || !dueDate || !subject || !type || !status || isSubmitting}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={13} />
                    {isSubmitting ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const AddAssignmentModal = memo(AddAssignmentModalComponent);
