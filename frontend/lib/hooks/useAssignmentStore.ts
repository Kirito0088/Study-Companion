"use client";

import { create } from "zustand";
import type {
  Assignment,
  AssignmentStats,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
} from "@/types";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "@/lib/api/client";

interface AssignmentState {
  assignments: Assignment[];
  stats: AssignmentStats | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  fetchAssignments: (force?: boolean) => Promise<void>;
  addAssignment: (payload: CreateAssignmentPayload) => Promise<void>;
  update: (id: string, payload: UpdateAssignmentPayload) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearError: () => void;
}

const getAssignmentStats = (assignments: Assignment[]): AssignmentStats => ({
  total: assignments.length,
  in_progress: assignments.filter((assignment) => assignment.status === "in_progress").length,
  completed: assignments.filter((assignment) => assignment.status === "completed").length,
  upcoming: assignments.filter((assignment) => ["upcoming", "scheduled"].includes(assignment.status)).length,
});

let assignmentsRequest: Promise<void> | null = null;

export const useAssignmentStore = create<AssignmentState>((set, get) => ({
  assignments: [],
  stats: null,
  isLoading: false,
  hasLoaded: false,
  error: null,

  fetchAssignments: async (force = false) => {
    if (!force) {
      const { hasLoaded, isLoading } = get();
      if (hasLoaded || isLoading) {
        return assignmentsRequest ?? Promise.resolve();
      }
    }

    if (assignmentsRequest) {
      return assignmentsRequest;
    }

    set({ isLoading: true, error: null });
    assignmentsRequest = getAssignments()
      .then((data) => {
        set({
          assignments: data.assignments,
          stats: data.stats,
          isLoading: false,
          hasLoaded: true,
        });
      })
      .catch(() => {
        set({ error: "Failed to load assignments", isLoading: false });
      })
      .finally(() => {
        assignmentsRequest = null;
      });

    return assignmentsRequest;
  },

  addAssignment: async (payload) => {
    try {
      const assignment = await createAssignment(payload);
      set((s) => ({
        assignments: [assignment, ...s.assignments],
        stats: getAssignmentStats([assignment, ...s.assignments]),
        error: null,
      }));
    } catch {
      set({ error: "Failed to create assignment" });
    }
  },

  update: async (id, payload) => {
    try {
      const updated = await updateAssignment(id, payload);
      set((s) => ({
        assignments: s.assignments.map((a) => (a.id === id ? updated : a)),
        stats: getAssignmentStats(s.assignments.map((a) => (a.id === id ? updated : a))),
        error: null,
      }));
    } catch {
      set({ error: "Failed to update assignment" });
    }
  },

  remove: async (id) => {
    try {
      await deleteAssignment(id);
      set((s) => ({
        assignments: s.assignments.filter((a) => a.id !== id),
        stats: getAssignmentStats(s.assignments.filter((a) => a.id !== id)),
        error: null,
      }));
    } catch {
      set({ error: "Failed to delete assignment" });
    }
  },

  clearError: () => set({ error: null }),
}));

export const assignmentSelectors = {
  assignments: (state: AssignmentState) => state.assignments,
  stats: (state: AssignmentState) => state.stats,
  isLoading: (state: AssignmentState) => state.isLoading,
  error: (state: AssignmentState) => state.error,
  fetchAssignments: (state: AssignmentState) => state.fetchAssignments,
  addAssignment: (state: AssignmentState) => state.addAssignment,
  update: (state: AssignmentState) => state.update,
  remove: (state: AssignmentState) => state.remove,
  clearError: (state: AssignmentState) => state.clearError,
};
