/**
 * Phase 2 — Adaptive Engine Barrel Export
 *
 * Single import point:
 *   import { applyAdaptiveModifiers, analyzeDrift } from "@/lib/engine/adaptive";
 */

// Types
export type {
  StudyLogEntry,
  CourseProfile,
  DriftAnalysis,
  ScoreModifiers,
  FatigueSignal,
} from "./types";

// Adaptive scorer
export {
  applyAdaptiveModifiers,
  adjustEffortEstimate,
  buildProfileMap,
} from "./adaptiveScorer";

// Fatigue guard
export {
  applyFatigueGuard,
  antiClusterPass,
} from "./fatigueGuard";
export type { DayCapacity } from "./fatigueGuard";

// Replan detector
export {
  analyzeDrift,
  canAutoReplan,
  REPLAN_COOLDOWN_MS,
} from "./replanDetector";

// Stability guard
export {
  analyseStability,
  stabiliseSchedule,
} from "./stabilityGuard";
export type {
  BlockChange,
  StabilityReport,
  StabilityConfig,
} from "./stabilityGuard";
