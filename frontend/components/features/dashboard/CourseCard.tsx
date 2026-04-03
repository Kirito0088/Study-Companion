import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { itemVariants as item } from "@/lib/utils/variants";

interface CourseCardProps {
  /** Course display name */
  title: string;
  /** Course code, e.g. "NEU-401" */
  code: string;
  /** Completion percentage 0–100 */
  progress: number;
  /** Human-readable next session time, e.g. "Tomorrow 10:00 AM" */
  nextSession: string;
  /** Hex colour used for the progress bar fill */
  color?: string;
}

/**
 * CourseCard
 *
 * Displays an active course with name, code, a progress bar,
 * and the next scheduled session time.
 */
export function CourseCard({
  title,
  code,
  progress,
  nextSession,
  color = "#6366f1",
}: CourseCardProps) {
  return (
    <motion.div
      variants={item}
      whileHover={{ scale: 1.01 }}
      className="glass-card-elevated p-4 cursor-pointer group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
            {title}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{code}</p>
        </div>
        <div className="flex items-center gap-1 text-text-muted flex-shrink-0 ml-3">
          <Clock size={12} />
          <span className="text-[10px] whitespace-nowrap">{nextSession}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="progress-track flex-1">
          <motion.div
            className="progress-fill"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
        <span className="text-xs font-semibold text-text-secondary flex-shrink-0">
          {progress}%
        </span>
      </div>
    </motion.div>
  );
}
