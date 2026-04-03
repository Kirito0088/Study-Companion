"""Planner router — GET /api/v1/planner"""

from fastapi import APIRouter
from app.services.planner_service import get_planner
from app.schemas.schemas import PlannerResponse

router = APIRouter(prefix="/planner", tags=["Planner"])


@router.get("", response_model=PlannerResponse)
def planner():
    """Return active sessions, curriculum breakdown, and AI nudges."""
    return get_planner()
