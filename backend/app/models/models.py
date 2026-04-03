"""SQLAlchemy ORM models."""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    level = Column(String, default="L1 Scholar")
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    courses = relationship("Course", back_populates="user")
    assignments = relationship("Assignment", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    study_sessions = relationship("StudySession", back_populates="user")


class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    color = Column(String, default="#6366f1")
    progress = Column(Integer, default=0)
    next_session = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="courses")
    study_sessions = relationship("StudySession", back_populates="course")


class StudySession(Base):
    __tablename__ = "study_sessions"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    topic = Column(String, nullable=False)
    status = Column(String, default="scheduled")  # active | scheduled | completed
    duration_minutes = Column(Integer, default=60)
    progress = Column(Integer, default=0)
    color = Column(String, default="#6366f1")
    scheduled_time = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="study_sessions")
    course = relationship("Course", back_populates="study_sessions")


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    course = Column(String, nullable=False)
    type = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    status = Column(String, default="upcoming")
    priority = Column(String, default="medium")
    grade = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="assignments")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    attachment_name = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)
    attachment_size = Column(String, nullable=True)

    user = relationship("User", back_populates="chat_messages")
