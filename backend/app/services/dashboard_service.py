"""Service layer for dashboard — DB-backed courses + static stats (Phase 1)."""

from sqlalchemy.orm import Session

from app.models.models import Course, User
from app.data.mock_data import (
    SEED_USER,
    DASHBOARD_STATS,
    DASHBOARD_QUOTE,
    TODAYS_PLAN,
)

DEFAULT_USER_ID = SEED_USER["id"]


def get_dashboard(db: Session, user_id: str = DEFAULT_USER_ID) -> dict:
    """
    Return the full dashboard payload.

    - user: from DB
    - stats / quote / todays_plan: static (Phase 1 — no tracking model yet)
    - active_courses: from DB
    """
    user = db.query(User).filter(User.id == user_id).first()

    user_data = {
        "name": user.name if user else SEED_USER["name"],
        "level": user.level if user else SEED_USER["level"],
        "avatar_initials": user.avatar_initials if user else SEED_USER["avatar_initials"],
    }

    courses = (
        db.query(Course)
        .filter(Course.user_id == user_id)
        .order_by(Course.created_at)
        .all()
    )

    return {
        "user": user_data,
        "stats": DASHBOARD_STATS,
        "quote": DASHBOARD_QUOTE,
        "active_courses": courses,
        "todays_plan": TODAYS_PLAN,
    }
