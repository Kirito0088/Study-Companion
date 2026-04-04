"use client";

import { useCallback, useEffect } from "react";
import { assignmentSelectors, useAssignmentStore } from "@/lib/hooks/useAssignmentStore";
import type { AssignmentFormValues, CreateAssignmentPayload } from "@/types";

const DEFAULT_ASSIGNMENT_PRIORITY = "medium";

export function useAssignmentsPage() {
  const assignments = useAssignmentStore(assignmentSelectors.assignments);
  const stats = useAssignmentStore(assignmentSelectors.stats);
  const isLoading = useAssignmentStore(assignmentSelectors.isLoading);
  const fetchAssignments = useAssignmentStore(assignmentSelectors.fetchAssignments);
  const addAssignment = useAssignmentStore(assignmentSelectors.addAssignment);
  const update = useAssignmentStore(assignmentSelectors.update);
  const remove = useAssignmentStore(assignmentSelectors.remove);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const handleCreateAssignment = useCallback(async (values: AssignmentFormValues) => {
    const trimmedTitle = values.title.trim();
    const trimmedSubject = values.subject.trim();
    const trimmedType = values.type.trim();
    const trimmedDueDate = values.dueDate.trim();

    if (!trimmedTitle || !trimmedSubject || !trimmedType || !trimmedDueDate) {
      return;
    }

    const payload: CreateAssignmentPayload = {
      title: trimmedTitle,
      course: trimmedSubject,
      type: trimmedType,
      due_date: trimmedDueDate,
      status: values.status,
      priority: DEFAULT_ASSIGNMENT_PRIORITY,
    };

    await addAssignment(payload);
  }, [addAssignment]);

  const handleCompleteAssignment = useCallback(async (assignmentId: string) => {
    await update(assignmentId, { status: "completed" });
  }, [update]);

  const handleDeleteAssignment = useCallback(async (assignmentId: string) => {
    await remove(assignmentId);
  }, [remove]);

  return {
    assignments,
    stats,
    isLoading,
    handleCreateAssignment,
    handleCompleteAssignment,
    handleDeleteAssignment,
  };
}
