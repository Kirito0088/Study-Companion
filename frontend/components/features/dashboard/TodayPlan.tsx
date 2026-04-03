import { motion } from "framer-motion";
import { itemVariants as item } from "@/lib/utils/variants";
import { cn } from "@/lib/utils/cn";

export type PlanItemType = "focus" | "review" | "group";

export interface PlanItem {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  type: PlanItemType;
}

interface TodayPlanProps {
  /** Date label shown below the section heading */
  dateLabel: string;
  /** Ordered list of plan items to render */
  items: PlanItem[];
}

/** Accent colours per plan type */
const typeStyles: Record<PlanItemType, { border: string; bg: string; dot: string }> = {
  focus: {
    border: "border-primary/30",
    bg:     "bg-primary/5",
    dot:    "bg-primary",
  },
  review: {
    border: "border-tertiary/30",
    bg:     "bg-tertiary/5",
    dot:    "bg-tertiary",
  },
  group: {
    border: "border-status-success/30",
    bg:     "bg-status-success/5",
    dot:    "bg-status-success",
  },
};

/**
 * TodayPlan
 *
 * Vertical timeline list of today's scheduled study activities.
 * Each item shows a colour-coded dot, title, description, time, and duration.
 */
export function TodayPlan({ dateLabel, items }: TodayPlanProps) {
  return (
    <motion.div variants={item} className="glass-card p-5 h-full">
      {/* Heading */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-text-primary">Today&apos;s Plan</h3>
      </div>
      <p className="text-xs text-text-muted mb-4">{dateLabel}</p>

      {/* Timeline */}
      <div className="space-y-3">
        {items.map((plan, i) => {
          const style = typeStyles[plan.type];
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className={cn(
                "flex gap-3 p-3 rounded-xl border cursor-pointer",
                style.border,
                style.bg,
              )}
            >
              {/* Timeline connector column */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                <div className={cn("w-2 h-2 rounded-full", style.dot)} />
                {i < items.length - 1 && (
                  <div className="w-px flex-1 min-h-3 bg-surface-border" />
                )}
              </div>

              {/* Content */}
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
          );
        })}
      </div>
    </motion.div>
  );
}
