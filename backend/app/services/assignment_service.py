"""Service layer for assignments."""

import uuid
from datetime import datetime, date
from typing import Optional
from app.data.mock_data import ASSIGNMENTS, ASSIGNMENT_STATS


def get_assignments() -> dict:
    return {
        "stats": ASSIGNMENT_STATS,
        "assignments": ASSIGNMENTS,
    }


def create_assignment(data: dict) -> dict:
    new_assignment = {
        "id": str(uuid.uuid4())[:8],
        "title": data["title"],
        "course": data["course"],
        "type": data["type"],
        "due_date": data["due_date"],
        "status": "upcoming",
        "priority": data.get("priority", "medium"),
        "days_left": None,
        "grade": None,
    }
    ASSIGNMENTS.append(new_assignment)
    ASSIGNMENT_STATS["total"] += 1
    ASSIGNMENT_STATS["upcoming"] += 1
    return new_assignment


def update_assignment(assignment_id: str, data: dict) -> Optional[dict]:
    for a in ASSIGNMENTS:
        if a["id"] == assignment_id:
            for key, value in data.items():
                if value is not None:
                    a[key] = value
            return a
    return None


def delete_assignment(assignment_id: str) -> bool:
    for i, a in enumerate(ASSIGNMENTS):
        if a["id"] == assignment_id:
            ASSIGNMENTS.pop(i)
            ASSIGNMENT_STATS["total"] = max(0, ASSIGNMENT_STATS["total"] - 1)
            return True
    return False
