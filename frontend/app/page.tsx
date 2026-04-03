"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Flame, Brain, BookOpen, Clock, Users, Quote,
  TrendingUp, Zap
} from "lucide-react";
import type { DashboardData } from "@/types";
import { getDashboard } from "@/lib/api/client";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";


const planIcons: Record<string, React.ReactNode> = {
  focus: <Zap size={15} className="text-primary" />,
  review: <Brain size={15} className="text-tertiary" />,
  group: <Users size={15} className="text-status-success" />,
};

const planColors: Record<string, string> = {
  focus: "border-primary/30 bg-primary/5",
  review: "border-tertiary/30 bg-tertiary/5",
  group: "border-status-success/30 bg-status-success/5",
};

// Fallback mock data so the page works without backend
const MOCK: DashboardData = {
  user: { name: "Alex", level: "L3 Scholar", avatar_initials: "AR" },
  stats: { day_streak: 12, cards_mastered: 248, weekly_focus_hours: 18.5, weekly_focus_goal: 25 },
  quote: { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  active_courses: [
    { id: "c1", name: "Cognitive Neuroscience", code: "NEU-401", progress: 68, color: "#6366f1", next_session: "Tomorrow 10:00 AM" },
    { id: "c2", name: "Architectural Theory II", code: "ARC-302", progress: 45, color: "#7c3aed", next_session: "Wed 2:00 PM" },
  ],
  todays_plan: [
    { id: "p1", title: "Deep Focus Session", description: "Neural Plasticity models.", time: "09:00 AM", duration: "90 min", type: "focus", completed: false },
    { id: "p2", title: "Flashcard Review", description: "Structural Systems deck.", time: "11:30 AM", duration: "30 min", type: "review", completed: false },
    { id: "p3", title: "Group Workshop", description: "Modernism case study.", time: "02:00 PM", duration: "60 min", type: "group", completed: false },
  ],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(MOCK);

  useEffect(() => {
    getDashboard().then(setData).catch(() => {/* use mock */});
  }, []);

  const focusPct = Math.round((data.stats.weekly_focus_hours / data.stats.weekly_focus_goal) * 100);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="relative z-10">
          <p className="text-text-secondary text-sm mb-1">Good morning 👋</p>
          <h2 className="text-2xl font-bold text-text-primary mb-1">
            Hello, <span className="gradient-text">{data.user.name}!</span>
          </h2>
          <p className="text-text-secondary text-sm">
            Your cognitive sanctuary is optimized. You have{" "}
            <span className="text-primary font-semibold">3 deep focus blocks</span> scheduled for today.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-5">
            {/* Streak */}
            <div className="flex items-center gap-2.5 glass-card-elevated px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-status-warning/15 flex items-center justify-center">
                <Flame size={16} className="text-status-warning" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary leading-none">{data.stats.day_streak}</p>
                <p className="text-[10px] text-text-muted">Day Streak</p>
              </div>
            </div>

            {/* Cards mastered */}
            <div className="flex items-center gap-2.5 glass-card-elevated px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Brain size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary leading-none">{data.stats.cards_mastered}</p>
                <p className="text-[10px] text-text-muted">Cards Mastered</p>
              </div>
            </div>

            {/* Weekly focus */}
            <div className="flex items-center gap-3 glass-card-elevated px-3 py-2 flex-1 min-w-[180px]">
              <div className="w-8 h-8 rounded-lg bg-tertiary/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} className="text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-text-muted">Weekly Focus</p>
                  <p className="text-xs font-semibold text-text-primary">
                    {data.stats.weekly_focus_hours}h / {data.stats.weekly_focus_goal}h
                  </p>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${focusPct}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
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
              {data.active_courses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ scale: 1.01 }}
                  className="glass-card-elevated p-4 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {course.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{course.code}</p>
                    </div>
                    <div className="flex items-center gap-1 text-text-muted">
                      <Clock size={12} />
                      <span className="text-[10px]">{course.next_session}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="progress-track flex-1">
                      <motion.div
                        className="progress-fill"
                        style={{ background: `linear-gradient(135deg, ${course.color}, ${course.color}99)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 1, delay: 0.6 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-text-secondary flex-shrink-0">
                      {course.progress}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Today's Plan */}
        <motion.div variants={item}>
          <div className="glass-card p-5 h-full">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Today&apos;s Plan</h3>
            </div>
            <p className="text-xs text-text-muted mb-4">Tuesday, Oct 24</p>

            <div className="space-y-3">
              {data.todays_plan.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`flex gap-3 p-3 rounded-xl border ${planColors[plan.type]} cursor-pointer group`}
                >
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-6 h-6 rounded-lg bg-surface-high flex items-center justify-center">
                      {planIcons[plan.type]}
                    </div>
                    {i < data.todays_plan.length - 1 && (
                      <div className="w-px h-4 bg-surface-border" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{plan.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 truncate">{plan.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-text-muted">{plan.time}</span>
                      <span className="w-1 h-1 rounded-full bg-surface-border" />
                      <span className="text-[10px] text-text-muted">{plan.duration}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quote ───────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="glass-card p-5 border-l-4 border-primary">
        <div className="flex gap-3 items-start">
          <Quote size={16} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-secondary italic">&ldquo;{data.quote.text}&rdquo;</p>
            <p className="text-xs text-primary font-semibold mt-1">— {data.quote.author}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
