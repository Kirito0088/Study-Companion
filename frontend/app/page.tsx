"use client";

import { motion } from "framer-motion";
import { Flame, Brain, TrendingUp, BookOpen, Quote } from "lucide-react";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";
import { StatCard, CourseCard, TodayPlan } from "@/components/features/dashboard";
import type { PlanItem } from "@/components/features/dashboard";

// ── Mock data ─────────────────────────────────────────────────────────────────
// Hardcoded for now. Replace with API call when backend is ready.

const STATS = [
  {
    id: "streak",
    title: "Day Streak",
    value: 12,
    icon: <Flame size={16} className="text-status-warning" />,
    accentClass: "bg-status-warning/15",
  },
  {
    id: "cards",
    title: "Cards Mastered",
    value: 248,
    icon: <Brain size={16} className="text-primary" />,
    accentClass: "bg-primary/15",
  },
  {
    id: "focus",
    title: "Weekly Focus",
    value: "18.5h",
    subtitle: "Goal: 25h",
    icon: <TrendingUp size={16} className="text-tertiary" />,
    accentClass: "bg-tertiary/15",
  },
];

const COURSES = [
  { id: "c1", title: "Cognitive Neuroscience", code: "NEU-401", progress: 68, color: "#6366f1", nextSession: "Tomorrow 10:00 AM" },
  { id: "c2", title: "Architectural Theory II", code: "ARC-302", progress: 45, color: "#7c3aed", nextSession: "Wed 2:00 PM" },
];

const PLAN_ITEMS: PlanItem[] = [
  { id: "p1", title: "Deep Focus Session",  description: "Concentrated study on Neural Plasticity models.", time: "09:00 AM", duration: "90 min", type: "focus"  },
  { id: "p2", title: "Flashcard Review",    description: "Spaced repetition for Structural Systems deck.",  time: "11:30 AM", duration: "30 min", type: "review" },
  { id: "p3", title: "Group Workshop",      description: "Peer review for Modernism case study.",           time: "02:00 PM", duration: "60 min", type: "group"  },
];

const QUOTE = {
  text: "The beautiful thing about learning is that no one can take it away from you.",
  author: "B.B. King",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-6xl"
    >
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="relative z-10">
          <p className="text-text-secondary text-sm mb-1">Good morning 👋</p>
          <h2 className="text-2xl font-bold text-text-primary mb-1">
            Hello, <span className="gradient-text">Alex!</span>
          </h2>
          <p className="text-text-secondary text-sm">
            Your cognitive sanctuary is optimized. You have{" "}
            <span className="text-primary font-semibold">3 deep focus blocks</span> scheduled for today.
          </p>

          {/* ── Stats row ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mt-5">
            {STATS.map((s) => (
              <StatCard
                key={s.id}
                icon={s.icon}
                title={s.title}
                value={s.value}
                subtitle={s.subtitle}
                accentClass={s.accentClass}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Courses */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="glass-card p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-text-primary">Active Courses</h3>
              </div>
              <button className="btn-ghost text-xs py-1 px-2">View All Library</button>
            </div>

            <div className="space-y-3">
              {COURSES.map((course) => (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  code={course.code}
                  progress={course.progress}
                  color={course.color}
                  nextSession={course.nextSession}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Today's Plan */}
        <TodayPlan dateLabel="Tuesday, Oct 24" items={PLAN_ITEMS} />
      </div>

      {/* ── Quote ───────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-5 border-l-4 border-primary">
        <div className="flex gap-3 items-start">
          <Quote size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-secondary italic">&ldquo;{QUOTE.text}&rdquo;</p>
            <p className="text-xs text-primary font-semibold mt-1">— {QUOTE.author}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
