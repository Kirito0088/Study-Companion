"""
Idempotent database seeder.

Inserts default user, courses, study sessions, assignments, and chat messages
only if they don't already exist. Safe to run on every startup.
"""

from sqlalchemy.orm import Session

from app.models.models import User, Course, StudySession, Assignment, ChatMessage
from app.data.mock_data import (
    SEED_USER,
    SEED_COURSES,
    SEED_STUDY_SESSIONS,
    SEED_ASSIGNMENTS,
    SEED_CHAT_MESSAGES,
)


def seed_database(db: Session) -> None:
    """Insert seed data if the DB is empty. Idempotent — safe to call every startup."""

    # ── Default user ──────────────────────────────────────────────────────────
    if not db.query(User).filter(User.id == SEED_USER["id"]).first():
        db.add(User(**SEED_USER))
        db.commit()
        print("[seed] Created default user:", SEED_USER["name"])

    # ── Courses ───────────────────────────────────────────────────────────────
    for course_data in SEED_COURSES:
        if not db.query(Course).filter(Course.id == course_data["id"]).first():
            db.add(Course(**course_data))
    db.commit()

    # ── Study sessions ────────────────────────────────────────────────────────
    for session_data in SEED_STUDY_SESSIONS:
        if not db.query(StudySession).filter(StudySession.id == session_data["id"]).first():
            db.add(StudySession(**session_data))
    db.commit()

    # ── Assignments ───────────────────────────────────────────────────────────
    for assignment_data in SEED_ASSIGNMENTS:
        if not db.query(Assignment).filter(Assignment.id == assignment_data["id"]).first():
            db.add(Assignment(**assignment_data))
    db.commit()

    # ── Chat messages ─────────────────────────────────────────────────────────
    for msg_data in SEED_CHAT_MESSAGES:
        if not db.query(ChatMessage).filter(ChatMessage.id == msg_data["id"]).first():
            db.add(ChatMessage(**msg_data))
    db.commit()

    print("[seed] Database seeding complete.")
