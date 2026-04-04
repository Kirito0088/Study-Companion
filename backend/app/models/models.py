"""SQLAlchemy ORM models for Study Companion."""

import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    level = Column(String, default="L1 Scholar")
    avatar_initials = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    courses = relationship("Course", back_populates="user", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    color = Column(String, default="#6366f1")
    progress = Column(Integer, default=0)
    next_session = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="courses")
    study_sessions = relationship("StudySession", back_populates="course", cascade="all, delete-orphan")


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    subject = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    status = Column(String, default="scheduled")  # active | scheduled | completed
    duration_minutes = Column(Integer, default=60)
    time_remaining_minutes = Column(Integer, nullable=True)
    progress = Column(Integer, default=0)
    color = Column(String, default="#6366f1")
    scheduled_time = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="study_sessions")
    course = relationship("Course", back_populates="study_sessions")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    course = Column(String, nullable=False)
    type = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    status = Column(String, default="upcoming")  # upcoming | in_progress | completed | scheduled
    priority = Column(String, default="medium")  # low | medium | high
    grade = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="assignments")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    attachment_name = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)
    attachment_size = Column(String, nullable=True)

    user = relationship("User", back_populates="chat_messages")
