/**
 * Phase 2 — Adaptive Scorer
 *
 * A pure function pipeline that adjusts Phase 1 base scores using
 * behavioural signals from the study log.
 *
 * Three independent multipliers are applied to each assignment's score:
 *   1. Effort Accuracy  — did the user take longer/shorter than planned?
 *   2. Subject Difficulty — is this course frequently skipped or underestimated?
 *   3. Momentum          — is the user on a streak for this course?
 *
 * The combined formula:
 *   adaptedScore = baseScore × effortMod × difficultyMod × momentumMod
 *
 * When insufficient log data exists (cold start), all modifiers default to
 * 1.0 — the system gracefully degrades to pure Phase 1 behavior.
 */

import type { ScoredAssignment } from "../types";
import type { CourseProfile, ScoreModifiers, StudyLogEntry } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Modifiers don't kick in until we have this many entries for a course. */
const MIN_SAMPLE_SIZE = 5;

/**
 * When sample_size < MIN_SAMPLE_SIZE, we linearly interpolate between 1.0
 * (no adjustment) and the computed modifier. This prevents noisy early data
 * from causing wild score swings.
 */
function scaleByConfidence(modifier: number, sampleSize: number): number {
  if (sampleSize >= MIN_SAMPLE_SIZE) return modifier;
  if (sampleSize <= 0) return 1.0;
  const t = sampleSize / MIN_SAMPLE_SIZE; // 0..1
  return 1.0 + (modifier - 1.0) * t;
}

// ── Modifier 1: Effort Accuracy ───────────────────────────────────────────────

/**
 * If the user consistently takes longer than planned for a course,
 * boost its score so it gets scheduled earlier (more lead time).
 *
 * ratio > 1.3 → underestimates → boost × 1.20
 * ratio < 0.7 → overestimates  → reduce × 0.85
 * otherwise    → accurate       → 1.0
 */
function effortAccuracyModifier(profile: CourseProfile): number {
  const ratio = profile.avg_accuracy_ratio;
  let mod = 1.0;
  if (ratio > 1.3) {
    mod = 1.2;
  } else if (ratio < 0.7) {
    mod = 0.85;
  }
  return scaleByConfidence(mod, profile.sample_size);
}

// ── Modifier 2: Subject Difficulty ────────────────────────────────────────────

/**
 * Courses that are frequently skipped or consistently underestimated
 * are considered harder — their scores get boosted so the scheduler
 * gives them more lead time.
 *
 * difficultyFactor = 1.0
 *   + 0.15 if skip_rate > 0.3
 *   + 0.10 if accuracy_ratio > 1.2
 */
function difficultyModifier(profile: CourseProfile): number {
  let mod = 1.0;
  if (profile.skip_rate > 0.3)         mod += 0.15;
  if (profile.avg_accuracy_ratio > 1.2) mod += 0.10;
  return scaleByConfidence(mod, profile.sample_size);
}

// ── Modifier 3: Momentum ─────────────────────────────────────────────────────

/**
 * If the user has been completing tasks for this course on schedule,
 * the system leans into the momentum with a gentle bonus.
 *
 * momentumBonus = 1.0 + min(streak × 0.05, 0.25)
 *
 * A 5-task streak adds 25% — enough to noticeably affect ordering
 * without overwhelming urgency-based prioritization.
 */
function momentumModifier(profile: CourseProfile): number {
  const bonus = Math.min(profile.streak * 0.05, 0.25);
  const mod = 1.0 + bonus;
  return scaleByConfidence(mod, profile.sample_size);
}

// ── Effort Estimate Adjustment ────────────────────────────────────────────────

/**
 * Adjusts the estimated_hours of a ScoredAssignment based on the user's
 * historical accuracy for that course. This feeds into the capacity
 * allocation — not just the score.
 *
 * adjustedEffort = baseEffort × clamp(accuracyRatio, 0.5, 2.0)
 */
export function adjustEffortEstimate(
  baseHours: number,
  profile: CourseProfile,
): number {
  if (profile.sample_size < MIN_SAMPLE_SIZE) return baseHours;
  const ratio = Math.max(0.5, Math.min(profile.avg_accuracy_ratio, 2.0));
  return Math.round(baseHours * ratio * 100) / 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds a lookup map of CourseProfile by course name.
 * Call this once per schedule generation, then pass to applyAdaptiveModifiers.
 */
export function buildProfileMap(
  profiles: CourseProfile[],
): Map<string, CourseProfile> {
  const map = new Map<string, CourseProfile>();
  for (const p of profiles) {
    map.set(p.course, p);
  }
  return map;
}

/**
 * The no-data default profile, used when no log entries exist for a course.
 * All modifiers compute to 1.0 from this, giving pure Phase 1 behavior.
 */
const EMPTY_PROFILE: CourseProfile = {
  course: "",
  avg_accuracy_ratio: 1.0,
  skip_rate: 0,
  avg_completion_hours: 0,
  streak: 0,
  sample_size: 0,
};

/**
 * applyAdaptiveModifiers
 *
 * Takes the Phase 1 scored list and adjusts each assignment's score
 * and effort estimate using behavioural data.
 *
 * Returns a new array (does not mutate the input).
 * Re-sorts by the adapted score.
 */
export function applyAdaptiveModifiers(
  scored: ScoredAssignment[],
  profileMap: Map<string, CourseProfile>,
): { adapted: ScoredAssignment[]; modifiers: Map<string, ScoreModifiers> } {
  const modifiers = new Map<string, ScoreModifiers>();

  const adapted = scored.map((s) => {
    const profile = profileMap.get(s.assignment.course) ?? EMPTY_PROFILE;

    const eMod = effortAccuracyModifier(profile);
    const dMod = difficultyModifier(profile);
    const mMod = momentumModifier(profile);

    const adaptedScore = Math.round(s.score * eMod * dMod * mMod * 100) / 100;
    const adjustedHours = adjustEffortEstimate(s.estimated_hours, profile);

    modifiers.set(s.assignment.id, {
      base_score: s.score,
      effort_modifier: eMod,
      difficulty_modifier: dMod,
      momentum_modifier: mMod,
      adapted_score: adaptedScore,
    });

    return {
      ...s,
      score: adaptedScore,
      estimated_hours: adjustedHours,
    };
  });

  // Re-sort by adapted score (highest first).
  adapted.sort((a, b) => b.score - a.score);

  return { adapted, modifiers };
}
