"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { motion } from "framer-motion";

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Your study overview" },
  "/planner": { title: "Study Planner", subtitle: "Finals Prep Sprint" },
  "/assignments": { title: "Assignments & Labs", subtitle: "Track your coursework" },
  "/chat": { title: "AI Chat", subtitle: "Your AI study companion" },
};

export default function Header() {
  const pathname = usePathname();
  const meta = routeTitles[pathname] || { title: "Study Companion", subtitle: "" };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="fixed top-0 left-60 right-0 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-surface-border z-30"
    >
      {/* Title */}
      <div>
        <h1 className="text-base font-bold text-text-primary leading-none">{meta.title}</h1>
        {meta.subtitle && (
          <p className="text-xs text-text-secondary mt-0.5">{meta.subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="btn-ghost flex items-center gap-2 text-text-secondary">
          <Search size={15} />
          <span className="hidden sm:inline text-xs">Search</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-surface-high text-text-muted font-mono">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-surface-elevated border border-surface-border text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          AR
        </div>
      </div>
    </motion.header>
  );
}
