"""Service layer for study planner."""

from app.data.mock_data import PLANNER_SESSIONS, CURRICULUM, AI_NUDGES


def get_planner() -> dict:
    return {
        "sessions": PLANNER_SESSIONS,
        "curriculum": CURRICULUM,
        "nudges": AI_NUDGES,
    }
