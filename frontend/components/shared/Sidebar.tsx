"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  BookOpen,
  Layers2,
  Timer,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Study Planner", icon: CalendarDays },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
];

const secondaryItems = [
  { href: "#", label: "Library", icon: BookOpen },
  { href: "#", label: "Flashcards", icon: Layers2 },
  { href: "#", label: "Focus Timer", icon: Timer },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-surface/95 backdrop-blur-xl border-r border-surface-border z-40"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-border">
        <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm flex-shrink-0">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary leading-none">Study Companion</p>
          <p className="text-[10px] text-primary font-medium mt-0.5">AI-Powered</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Main</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn("nav-item cursor-pointer", isActive && "active")}
              >
                <Icon size={17} className={isActive ? "text-primary" : "text-text-muted"} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}

        <p className="px-3 mt-5 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Tools</p>
        {secondaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <motion.div whileHover={{ x: 2 }} className="nav-item cursor-pointer">
                <Icon size={17} className="text-text-muted" />
                <span>{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-surface-border">
        <Link href="#">
          <motion.div whileHover={{ x: 2 }} className="nav-item cursor-pointer">
            <Settings size={17} className="text-text-muted" />
            <span>Settings</span>
          </motion.div>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            AR
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">Alex Rivera</p>
            <p className="text-[10px] text-primary">L3 Scholar</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
