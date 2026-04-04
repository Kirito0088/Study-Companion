"""Service layer for assignments — full CRUD backed by PostgreSQL."""

from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import Assignment
from app.data.mock_data import SEED_USER


# ── Helpers ───────────────────────────────────────────────────────────────────

DEFAULT_USER_ID = SEED_USER["id"]


def _days_left(due_date_str: str) -> Optional[int]:
    """Return number of days until due_date (negative = overdue). None on parse error."""
    try:
        due = date.fromisoformat(due_date_str)
        return (due - date.today()).days
    except ValueError:
        return None


def _enrich(assignment: Assignment) -> Assignment:
    """Attach computed `days_left` attribute to an ORM instance."""
    assignment.days_left = (
        _days_left(assignment.due_date) if assignment.status != "completed" else None
    )
    return assignment


# ── Service functions ─────────────────────────────────────────────────────────

def get_assignments(db: Session, user_id: str = DEFAULT_USER_ID) -> dict:
    """Return assignment list + computed stats for a user."""
    rows = (
        db.query(Assignment)
        .filter(Assignment.user_id == user_id)
        .order_by(Assignment.created_at.desc())
        .all()
    )

    assignments = [_enrich(a) for a in rows]

    stats = {
        "total": len(assignments),
        "in_progress": sum(1 for a in assignments if a.status == "in_progress"),
        "completed": sum(1 for a in assignments if a.status == "completed"),
        "upcoming": sum(1 for a in assignments if a.status in ("upcoming", "scheduled")),
    }

    return {"stats": stats, "assignments": assignments}


def create_assignment(db: Session, data: dict, user_id: str = DEFAULT_USER_ID) -> Assignment:
    """Insert a new assignment and return the persisted ORM instance."""
    assignment = Assignment(
        user_id=user_id,
        title=data["title"],
        course=data["course"],
        type=data["type"],
        due_date=data["due_date"],
        status=data["status"],
        priority=data.get("priority", "medium"),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return _enrich(assignment)


def update_assignment(
    db: Session,
    assignment_id: str,
    data: dict,
    user_id: str = DEFAULT_USER_ID,
) -> Optional[Assignment]:
    """Patch an assignment's fields. Returns None if not found."""
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.user_id == user_id)
        .first()
    )
    if not assignment:
        return None

    for field, value in data.items():
        if value is not None and hasattr(assignment, field):
            setattr(assignment, field, value)

    db.commit()
    db.refresh(assignment)
    return _enrich(assignment)


def delete_assignment(
    db: Session,
    assignment_id: str,
    user_id: str = DEFAULT_USER_ID,
) -> bool:
    """Delete an assignment. Returns False if not found."""
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.user_id == user_id)
        .first()
    )
    if not assignment:
        return False

    db.delete(assignment)
    db.commit()
    return True
