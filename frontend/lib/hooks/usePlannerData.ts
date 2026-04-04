"use client";

import { useEffect, useState } from "react";
import { getPlanner } from "@/lib/api/client";
import type { PlannerData } from "@/types";

const plannerFallback: PlannerData = {
  sessions: [
    { id: "s1", subject: "Advanced Calculus", topic: "Integration by Parts & Triple Integrals", status: "active", time_remaining_minutes: 45, color: "#6366f1", progress: 62 },
    { id: "s2", subject: "Modern History", topic: "Post-War Economics & The Cold War", status: "scheduled", scheduled_time: "02:00 PM", color: "#7c3aed", progress: 0 },
  ],
  curriculum: [
    { id: "cu1", subject: "Vector Calculus", description: "Divergence, Curl, and Green's Theorem mastery.", progress: 75, total_topics: 12, completed_topics: 9 },
    { id: "cu2", subject: "Thermodynamics", description: "Laws of Entropy and Heat Transfer Analysis.", progress: 40, total_topics: 10, completed_topics: 4 },
  ],
  nudges: [
    { id: "n1", type: "spaced_repetition", icon: "brain", title: "Spaced Repetition", message: "Review Calculus flashcards in 2 hours for 85% better retention.", priority: "high" },
    { id: "n2", type: "break", icon: "coffee", title: "Optimal Break", message: "You've hit a 90min streak. Take a 10min walk to reset cognitive load.", priority: "medium" },
    { id: "n3", type: "hydration", icon: "droplets", title: "Hydration Check", message: "Water intake improves concentration by 14%. Time for a refill.", priority: "low" },
  ],
};

let plannerCache: PlannerData | null = null;
let plannerRequest: Promise<PlannerData> | null = null;

async function loadPlannerOnce() {
  if (plannerCache) {
    return plannerCache;
  }

  if (!plannerRequest) {
    plannerRequest = getPlanner()
      .then((data) => {
        plannerCache = data;
        return data;
      })
      .finally(() => {
        plannerRequest = null;
      });
  }

  return plannerRequest;
}

export function usePlannerData() {
  const [data, setData] = useState<PlannerData>(() => plannerCache ?? plannerFallback);

  useEffect(() => {
    let isCancelled = false;

    if (plannerCache) {
      return () => {
        isCancelled = true;
      };
    }

    void loadPlannerOnce()
      .then((plannerData) => {
        if (!isCancelled) {
          setData(plannerData);
        }
      })
      .catch(() => {
        // Keep the local fallback in place.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return data;
}
