"""Service layer for study planner — DB-backed sessions + static curriculum/nudges (Phase 1)."""

from sqlalchemy.orm import Session

from app.models.models import StudySession
from app.data.mock_data import SEED_USER, CURRICULUM, AI_NUDGES

DEFAULT_USER_ID = SEED_USER["id"]


def get_planner(db: Session, user_id: str = DEFAULT_USER_ID) -> dict:
    """
    Return the planner payload.

    - sessions: from DB (StudySession table)
    - curriculum: static (Phase 1 — no curriculum DB model yet)
    - nudges: static (Phase 1 — no AI nudge engine yet)
    """
    sessions = (
        db.query(StudySession)
        .filter(StudySession.user_id == user_id)
        .order_by(StudySession.created_at)
        .all()
    )

    return {
        "sessions": sessions,
        "curriculum": CURRICULUM,
        "nudges": AI_NUDGES,
    }
