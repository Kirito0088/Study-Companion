import { motion } from "framer-motion";
import { itemVariants as item } from "@/lib/utils/variants";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  /** Icon element rendered in the icon slot */
  icon: React.ReactNode;
  /** Label shown below the value */
  title: string;
  /** Primary value displayed large */
  value: string | number;
  /** Optional secondary line beneath the value */
  subtitle?: string;
  /** Optional CSS colour class for the icon background (default: indigo) */
  accentClass?: string;
}

/**
 * StatCard
 *
 * A compact metric card used in the Dashboard stats row.
 * Icon sits in a tinted rounded badge; value is large & bold.
 */
export function StatCard({
  icon,
  title,
  value,
  subtitle,
  accentClass = "bg-primary/15",
}: StatCardProps) {
  return (
    <motion.div
      variants={item}
      className="glass-card-elevated flex items-center gap-3 px-4 py-3"
    >
      {/* Icon badge */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", accentClass)}>
        {icon}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-lg font-bold text-text-primary leading-none">{value}</p>
        <p className="text-[11px] text-text-muted mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-text-secondary mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
