// ── Shared ─────────────────────────────────────────────────────────────────────

export interface User {
  name: string;
  level: string;
  avatar_initials: string;
}

export interface Stats {
  day_streak: number;
  cards_mastered: number;
  weekly_focus_hours: number;
  weekly_focus_goal: number;
}

export interface Quote {
  text: string;
  author: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  name: string;
  code: string;
  progress: number;
  color: string;
  next_session: string;
}

export interface PlanItem {
  id: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  type: "focus" | "review" | "group";
  completed: boolean;
}

export interface DashboardData {
  user: User;
  stats: Stats;
  quote: Quote;
  active_courses: Course[];
  todays_plan: PlanItem[];
}

// ── Planner ────────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  subject: string;
  topic: string;
  status: "active" | "scheduled" | "completed";
  time_remaining_minutes?: number;
  scheduled_time?: string;
  color: string;
  progress: number;
}

export interface CurriculumItem {
  id: string;
  subject: string;
  description: string;
  progress: number;
  total_topics: number;
  completed_topics: number;
}

export type NudgePriority = "high" | "medium" | "low";

export interface Nudge {
  id: string;
  type: string;
  icon: string;
  title: string;
  message: string;
  priority: NudgePriority;
}

export interface PlannerData {
  sessions: Session[];
  curriculum: CurriculumItem[];
  nudges: Nudge[];
}

// ── Assignments ────────────────────────────────────────────────────────────────

export type AssignmentStatus = "upcoming" | "in_progress" | "completed" | "scheduled";
export type AssignmentPriority = "low" | "medium" | "high";

export interface Assignment {
  id: string;
  title: string;
  course: string;
  type: string;
  due_date: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  days_left?: number;
  grade?: string;
}

export interface AssignmentStats {
  total: number;
  in_progress: number;
  completed: number;
  upcoming: number;
}

export interface AssignmentsData {
  stats: AssignmentStats;
  assignments: Assignment[];
}

export interface CreateAssignmentPayload {
  title: string;
  course: string;
  type: string;
  due_date: string;
  status: AssignmentStatus;
  priority?: AssignmentPriority;
}

export interface AssignmentFormValues {
  title: string;
  dueDate: string;
  subject: string;
  type: string;
  status: AssignmentStatus;
}

export interface UpdateAssignmentPayload {
  title?: string;
  due_date?: string;
  status?: AssignmentStatus;
  priority?: AssignmentPriority;
  grade?: string;
}

// ── Chat ───────────────────────────────────────────────────────────────────────

export interface Attachment {
  name: string;
  type: string;
  size: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachment?: Attachment;
}

export interface ConfidenceScore {
  topic: string;
  score: number;
}

export interface SessionFocus {
  elapsed_minutes: number;
  total_minutes: number;
  topic: string;
  confidence_scores: ConfidenceScore[];
}

export interface ChatData {
  messages: ChatMessage[];
  session_focus: SessionFocus;
}

export interface SendMessagePayload {
  content: string;
  session_topic?: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  typing_delay_ms: number;
}
