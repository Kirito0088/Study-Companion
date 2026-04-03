"""Dashboard router — GET /api/v1/dashboard"""

from fastapi import APIRouter
from app.services.dashboard_service import get_dashboard
from app.schemas.schemas import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard():
    """Return dashboard stats, active courses, today's plan, and user info."""
    return get_dashboard()
