"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BookMarked,
  Brain,
  Calendar,
  Clock,
  Coffee,
  Droplets,
  Music2,
  Play,
  Target,
} from "lucide-react";
import type { CurriculumItem, Nudge, Session } from "@/types";
import { usePlannerData } from "@/lib/hooks/usePlannerData";
import { usePlanner } from "@/lib/hooks/usePlanner";
import { useCalendar } from "@/lib/hooks/useCalendar";
import { PlannerAssignmentsPanel } from "@/components/features/planner/PlannerAssignmentsPanel";
import { PlannerCalendar } from "@/components/features/planner/PlannerCalendar";
import { containerVariants as container, itemVariants as item } from "@/lib/utils/variants";

const sessionHover = { scale: 1.01 };
const sessionProgressTransition = { duration: 1, delay: 0.4 };
const curriculumProgressTransition = { duration: 1, delay: 0.6 };
const ambientProgressTransition = { duration: 1.5 };
const dailyGoalTransition = { duration: 1.2 };
const insightVariants = {
  hidden: { opacity: 0, x: 8 },
  show: { opacity: 1, x: 0 },
};

const nudgeIcons: Record<string, ReactNode> = {
  brain: <Brain size={14} />,
  coffee: <Coffee size={14} />,
  droplets: <Droplets size={14} />,
};

const nudgeColors: Record<string, string> = {
  high: "border-primary/30 bg-primary/5 text-primary",
  medium: "border-status-warning/30 bg-status-warning/5 text-status-warning",
  low: "border-status-success/30 bg-status-success/5 text-status-success",
};

const PlannerSessionCard = memo(function PlannerSessionCard({ session }: { session: Session }) {
  const statusClassName = session.status === "active"
    ? "bg-status-success/15 text-status-success"
    : "bg-status-warning/15 text-status-warning";

  return (
    <motion.div
      whileHover={sessionHover}
      className="glass-card p-5 cursor-pointer"
      style={{ borderLeftColor: `${session.color}50`, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-text-primary">{session.subject}</p>
          <p className="text-xs text-text-secondary mt-0.5">{session.topic}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusClassName}`}>
          {session.status === "active" ? <Play size={10} /> : <Calendar size={10} />}
          {session.status === "active" ? "Active" : "Scheduled"}
        </div>
      </div>

      {session.status === "active" && session.time_remaining_minutes !== undefined && (
        <>
          <div className="progress-track mb-2">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${session.progress}%` }}
              transition={sessionProgressTransition}
              style={{ background: `linear-gradient(135deg, ${session.color}, ${session.color}99)` }}
            />
          </div>
          <div className="flex justify-between">
            <div className="text-center">
              <p className="text-xl font-bold text-text-primary">{session.time_remaining_minutes}:00</p>
              <p className="text-[10px] text-text-muted">Remaining</p>
            </div>
            <button className="btn-primary">
              <Play size={12} />
              Continue
            </button>
          </div>
        </>
      )}

      {session.status === "scheduled" && (
        <div className="flex items-center justify-between mt-1">
          <div>
            <p className="text-base font-bold text-text-primary">{session.scheduled_time}</p>
            <p className="text-xs text-text-muted">Scheduled</p>
          </div>
          <button className="btn-ghost text-xs">
            <Play size={12} />
            Start Early
          </button>
        </div>
      )}
    </motion.div>
  );
});

const CurriculumProgressItem = memo(function CurriculumProgressItem({
  item,
}: {
  item: CurriculumItem;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-sm font-semibold text-text-primary">{item.subject}</p>
        <span className="text-xs text-text-muted">{item.completed_topics}/{item.total_topics} topics</span>
      </div>
      <p className="text-xs text-text-muted mb-2">{item.description}</p>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${item.progress}%` }}
          transition={curriculumProgressTransition}
        />
      </div>
    </div>
  );
});

const NudgeCard = memo(function NudgeCard({ nudge }: { nudge: Nudge }) {
  return (
    <motion.div
      variants={insightVariants}
      initial="hidden"
      animate="show"
      className={`flex gap-2.5 p-3 rounded-xl border ${nudgeColors[nudge.priority]} cursor-pointer`}
    >
      <span className="flex-shrink-0 mt-0.5">
        {nudgeIcons[nudge.icon]}
      </span>
      <div>
        <p className="text-xs font-semibold">{nudge.title}</p>
        <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{nudge.message}</p>
      </div>
    </motion.div>
  );
});

export function PlannerView() {
  const data = usePlannerData();
  const assignments = usePlanner();
  const calendar = useCalendar();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={item} className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Active Sprint</span>
            </div>
            <h2 className="text-xl font-bold text-text-primary">Finals Prep Sprint</h2>
            <p className="text-sm text-text-secondary mt-1">
              Your trajectory to academic excellence. Complete your milestones to reach the{" "}
              <span className="text-primary font-semibold">98th percentile.</span>
            </p>
          </div>
          <button className="btn-primary">
            <Calendar size={14} />
            View Schedule
          </button>
        </div>
      </motion.div>

      {/* Full-width calendar — between hero and main grid */}
      <PlannerCalendar
        currentMonth={calendar.currentMonth}
        calendarDays={calendar.calendarDays}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Active Sessions</h3>
          </div>

          {data.sessions.map((session) => (
            <PlannerSessionCard key={session.id} session={session} />
          ))}

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookMarked size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Curriculum Breakdown</h3>
            </div>
            <div className="space-y-4">
              {data.curriculum.map((curriculumItem) => (
                <CurriculumProgressItem key={curriculumItem.id} item={curriculumItem} />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Music2 size={14} className="text-tertiary" />
              <p className="text-xs font-semibold text-text-primary">Now Playing</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tertiary to-primary flex items-center justify-center">
                <Music2 size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Midnight Lofi</p>
                <p className="text-xs text-text-muted">Deep focus waves</p>
              </div>
            </div>
            <div className="mt-3 progress-track">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-tertiary to-primary"
                initial={{ width: 0 }}
                animate={{ width: "45%" }}
                transition={ambientProgressTransition}
              />
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-primary" />
              <p className="text-xs font-semibold text-text-primary">AI Insights</p>
            </div>
            <div className="space-y-2">
              {data.nudges.map((nudge) => (
                <NudgeCard key={nudge.id} nudge={nudge} />
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-text-primary">Daily Goal</p>
              <span className="badge badge-in-progress">3/4 tasks</span>
            </div>
            <p className="text-xs text-text-secondary">Almost there! Complete 1 more task to reach your daily milestone.</p>
            <div className="mt-3 progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: "75%" }}
                transition={dailyGoalTransition}
              />
            </div>
          </div>

          <PlannerAssignmentsPanel
            today={assignments.today}
            urgent={assignments.urgent}
            upcoming={assignments.upcoming}
            isLoading={assignments.isLoading}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
