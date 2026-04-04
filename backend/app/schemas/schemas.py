"""Pydantic v2 schemas for Study Companion API."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ── Helpers ───────────────────────────────────────────────────────────────────

class _OrmBase(BaseModel):
    """Base with ORM mode enabled for all response schemas."""
    model_config = ConfigDict(from_attributes=True)


# ── User / Stats / Quote (dashboard composites) ───────────────────────────────

class UserSchema(BaseModel):
    name: str
    level: str
    avatar_initials: str


class StatSchema(BaseModel):
    day_streak: int
    cards_mastered: int
    weekly_focus_hours: float
    weekly_focus_goal: int


class QuoteSchema(BaseModel):
    text: str
    author: str


# ── Courses ───────────────────────────────────────────────────────────────────

class CourseSchema(_OrmBase):
    id: str
    name: str
    code: str
    progress: int
    color: str
    next_session: Optional[str] = None


# ── Dashboard ─────────────────────────────────────────────────────────────────

class PlanItemSchema(BaseModel):
    id: str
    title: str
    description: str
    time: str
    duration: str
    type: str
    completed: bool


class DashboardResponse(BaseModel):
    user: UserSchema
    stats: StatSchema
    quote: QuoteSchema
    active_courses: List[CourseSchema]
    todays_plan: List[PlanItemSchema]


# ── Planner ───────────────────────────────────────────────────────────────────

class SessionSchema(_OrmBase):
    id: str
    subject: str
    topic: str
    status: str
    time_remaining_minutes: Optional[int] = None
    scheduled_time: Optional[str] = None
    color: str
    progress: int


class CurriculumSchema(BaseModel):
    id: str
    subject: str
    description: str
    progress: int
    total_topics: int
    completed_topics: int


class NudgeSchema(BaseModel):
    id: str
    type: str
    icon: str
    title: str
    message: str
    priority: str


class PlannerResponse(BaseModel):
    sessions: List[SessionSchema]
    curriculum: List[CurriculumSchema]
    nudges: List[NudgeSchema]


# ── Assignments ───────────────────────────────────────────────────────────────

class AssignmentSchema(_OrmBase):
    id: str
    title: str
    course: str
    type: str
    due_date: str
    status: str
    priority: str
    days_left: Optional[int] = None
    grade: Optional[str] = None


class AssignmentStatsSchema(BaseModel):
    total: int
    in_progress: int
    completed: int
    upcoming: int


class AssignmentsResponse(BaseModel):
    stats: AssignmentStatsSchema
    assignments: List[AssignmentSchema]


class CreateAssignmentRequest(BaseModel):
    title: str
    course: str
    type: str
    due_date: str
    status: str
    priority: str = "medium"


class UpdateAssignmentRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    grade: Optional[str] = None


# ── Chat ──────────────────────────────────────────────────────────────────────

class AttachmentSchema(BaseModel):
    name: str
    type: str
    size: str


class ChatMessageSchema(_OrmBase):
    id: str
    role: str
    content: str
    timestamp: str
    attachment: Optional[AttachmentSchema] = None


class ConfidenceScore(BaseModel):
    topic: str
    score: int


class SessionFocusSchema(BaseModel):
    elapsed_minutes: int
    total_minutes: int
    topic: str
    confidence_scores: List[ConfidenceScore]


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageSchema]
    session_focus: SessionFocusSchema


class SendMessageRequest(BaseModel):
    content: str
    session_topic: Optional[str] = "General Study"


class SendMessageResponse(BaseModel):
    message: ChatMessageSchema
    typing_delay_ms: int
